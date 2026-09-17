/**
 * ---------------------------------------------------------------------------
 *  Mock-engine verification
 * ---------------------------------------------------------------------------
 *  The UI is driven by three pure, dependency-free modules:
 *
 *    src/lib/urlResolver.ts   URL → playable metadata (+ Auto-Next sequencing)
 *    src/lib/downloader.ts    simulated `yt-dlp` / ffmpeg job lifecycle
 *    src/lib/utils.ts         formatting + validation helpers
 *
 *  Because they are pure functions, the whole mocked pipeline can be exercised
 *  without a DOM. Run it with:
 *
 *      npm run verify:mocks
 * ---------------------------------------------------------------------------
 */
import { advanceDownload, createDownloadJob, buildYtDlpCommand } from '../src/lib/downloader';
import { findAutoNext, resolveMediaUrl, peekQueue } from '../src/lib/urlResolver';
import { LIBRARY } from '../src/lib/mockData';
import { formatTime, isProbablyUrl, hashString } from '../src/lib/utils';

declare const process: { exit(code: number): void };

let failures = 0;
const check = (label: string, ok: boolean, extra = '') => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? `  ${extra}` : ''}`);
};

const a = resolveMediaUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
const b = resolveMediaUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
check('resolver is deterministic', JSON.stringify(a) === JSON.stringify(b));
check('youtube detected', a.kind === 'youtube' && a.provider === 'youtube', a.title);
check('subdomain + shorts detected', resolveMediaUrl('https://m.youtube.com/shorts/abc123xyz').kind === 'youtube');
check('twitch is live', resolveMediaUrl('https://twitch.tv/foo').kind === 'live');
check('m3u8 is live', resolveMediaUrl('https://cdn.x.com/stream/index.m3u8').kind === 'live');
check('mp4 is file', resolveMediaUrl('https://x.com/a/clip.mp4').kind === 'file');
check('magnet is file', resolveMediaUrl('magnet:?xt=urn:btih:abc').provider === 'torrent');
check('slug prettified', resolveMediaUrl('https://x.com/a/my-great_video.mp4').title === 'My great video');
check('isProbablyUrl', isProbablyUrl('youtube.com/watch?v=abc') && !isProbablyUrl('hello world'));
check('formatTime', formatTime(3725) === '1:02:05' && formatTime(75) === '1:15');

const ep1 = LIBRARY[0];
check('auto-next picks episode 2', findAutoNext(ep1, [ep1, LIBRARY[1], LIBRARY[2]])?.id === LIBRARY[1].id);
check('auto-next wraps at the end', Boolean(findAutoNext(LIBRARY[5], [LIBRARY[5]])));
check('peekQueue returns followers', peekQueue(ep1, [ep1, LIBRARY[1], LIBRARY[2]], 2).length === 2);
check('hash stable', hashString('abc') === hashString('abc'));

const job = createDownloadJob({ url: 'https://youtu.be/jfKfPfyJRdk', format: 'video', quality: '1080p' });
check('job starts resolving', job.status === 'resolving' && job.logs.length > 5, `${job.logs.length} lines`);
check('command looks like yt-dlp', buildYtDlpCommand(job).startsWith('yt-dlp') && buildYtDlpCommand(job).includes('-f bv*[height<=1080]+ba/b'));
check('size sane', job.sizeMb > 1 && job.sizeMb < 2000, `${job.sizeMb}MB @ ${job.speedMbps}MB/s`);

let current = job;
let ticks = 0;
let monotonic = true;
let sawMergerBeforeComplete = false;
while (current.status !== 'complete' && ticks < 2000) {
  const before = current.progress;
  current = advanceDownload(current, 0.22);
  if (current.progress < before) monotonic = false;
  if (current.status === 'downloading' && current.progress === 1 && current.logs.some((l) => l.text.startsWith('[Merger]'))) {
    sawMergerBeforeComplete = true;
  }
  ticks += 1;
}
check('progress monotonic', monotonic);
check('completes in bounded time', current.status === 'complete', `${(ticks * 0.22).toFixed(2)}s virtual`);
check('progress reaches 1', current.progress === 1);
check('post-processing streams after 100%', sawMergerBeforeComplete);
check('log stream ends with exit code 0', current.logs.at(-1)?.text === 'exit code 0');
check('has ffmpeg post-processing lines', current.logs.some((l) => l.text.startsWith('[ffmpeg]')));
check('log lines ordered', current.logs.every((l, i, arr) => i === 0 || arr[i - 1].at <= l.at));
check('no further ticks after completion', advanceDownload(current, 1) === current);

const audio = advanceDownload(advanceDownload(createDownloadJob({ url: 'https://feeds.x.fm/ep.mp3', format: 'audio', quality: '360p' }), 5), 5);
check('audio job uses mp3 pipeline', audio.outputPath.endsWith('.mp3') && buildYtDlpCommand(audio).includes('--audio-format mp3'));

console.log(failures === 0 ? '\nAll mock-engine checks passed.' : `\n${failures} check(s) failed.`);
if (failures > 0) process.exit(1);
