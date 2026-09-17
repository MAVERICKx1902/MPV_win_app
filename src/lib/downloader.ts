import type {
  DownloadFormat,
  DownloadJob,
  DownloadRequest,
  LogLine,
  QualityLabel,
} from '../types';
import { QUALITY_BITRATE } from './mockData';
import { hashString, randomId } from './utils';
import { resolveMediaUrl, ytdlpFormatHint } from './urlResolver';

/**
 * ---------------------------------------------------------------------------
 *  Dummy download engine
 * ---------------------------------------------------------------------------
 *  Faithfully mocks the output of `yt-dlp` + `ffmpeg` so the UI (terminal,
 *  progress bar, ETA, throughput) can be built and reviewed before the Rust
 *  side starts spawning real processes.
 *
 *  The whole model is a pure function: `advanceDownload(job, dt)` returns the
 *  next immutable snapshot. That keeps it trivially testable and makes the
 *  swap to real Tauri events a drop-in replacement.
 * ---------------------------------------------------------------------------
 */

const AUDIO_SUFFIX: Record<DownloadFormat, string> = {
  video: 'mp4',
  audio: 'mp3',
};

/** yt-dlp `-o` template. Passing a request pins the container extension. */
export function outputTemplate(request?: Pick<DownloadRequest, 'format'>): string {
  const ext = request ? AUDIO_SUFFIX[request.format] : '%(ext)s';
  return `~/Downloads/MPV Studio/%(title)s [%(id)s].${ext}`;
}

/** Minimal shape the CLI builder needs — keeps it usable outside a job. */
type CommandTarget = Pick<DownloadJob, 'url' | 'format' | 'quality'>;

export function buildYtDlpCommand(job: CommandTarget): string {
  const parts = [
    'yt-dlp',
    '--no-playlist',
    '--newline',
    '--progress',
    '--no-warnings',
  ];
  if (job.format === 'audio') {
    parts.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
  } else {
    parts.push('-f', `bv*[height<=${job.quality.replace('p', '')}]+ba/b`);
    parts.push('--merge-output-format', 'mp4');
    parts.push('--embed-subs', '--sub-langs', 'en.*');
  }
  parts.push('-o', `"${outputTemplate(job)}"`);
  parts.push(`"${job.url}"`);
  return parts.join(' ');
}

interface ScriptLine {
  /** Progress threshold (0 → 1) at which the line is emitted. */
  at: number;
  text: string;
  tone: LogLine['tone'];
}

/**
 * The output of `yt-dlp` is split in two phases: the transferProgress stream
 * (0 → 100%) and the post-processing tail (merger, ffmpeg, metadata, move).
 * Tracking the boundary lets the tail stream in one line at a time *after* the
 * bar hits 100%, exactly like the real tool.
 */
interface LogScript {
  lines: ScriptLine[];
  /** Index of the first post-processing line. */
  tailStart: number;
}

/** Full, deterministic log script for a job. */
function buildLogScript(job: DownloadJob): LogScript {
  const res = resolveMediaUrl(job.url);
  const lines: ScriptLine[] = [
    { at: 0, text: `$ ${buildYtDlpCommand(job)}`, tone: 'info' },
    { at: 0.0001, text: "[debug] Command-line config: ['--no-playlist', '--newline', '--progress']", tone: 'muted' },
    { at: 0.0002, text: '[debug] Encodings: utf-8, fs utf-8, out utf-8', tone: 'muted' },
    { at: 0.0003, text: '[debug] yt-dlp version stable@2026.09.01 (linux_x64)', tone: 'muted' },
    { at: 0.0004, text: `[${res.provider}] Extracting URL: ${job.url.slice(0, 72)}`, tone: 'info' },
    { at: 0.0005, text: `[${res.provider}] ${res.id}: Downloading webpage`, tone: 'muted' },
    { at: 0.0006, text: `[info] ${res.title}`, tone: 'ok' },
    { at: 0.0007, text: `[info] Format selection: ${ytdlpFormatHint(job.url, job.format, job.quality)}`, tone: 'info' },
    { at: 0.0008, text: `[info] Destination: ${job.outputPath}`, tone: 'muted' },
  ];

  // 5%…100% stepped progress lines, exactly like yt-dlp writes them out.
  for (let pct = 5; pct <= 100; pct += 5) {
    const at = pct / 100;
    const speed = job.speedMbps * (0.86 + ((hashString(job.url + pct) % 28) / 100));
    const remaining = ((job.sizeMb * (1 - at)) / speed) * 1000;
    lines.push({
      at,
      text: `[download] ${pct === 100 ? '100%' : `${pct.toString().padStart(3, ' ')}.0%`} of ${job.sizeMb.toFixed(
        2,
      )}MiB at ${speed.toFixed(2)}MiB/s ETA ${formatEta(remaining / 1000)}`,
      tone: pct === 100 ? 'ok' : 'muted',
    });
  }

  const tailStart = lines.length;
  lines.push(
    { at: 1, text: '[Merger] Merging formats into the output container', tone: 'info' },
    { at: 1, text: '[ffmpeg] Post-process: fixup / metadata / chapters', tone: 'muted' },
    { at: 1, text: `[ThumbnailConvert] Attaching cover art (${AUDIO_SUFFIX[job.format]})`, tone: 'muted' },
    { at: 1, text: '[Metadata] Adding tags: title, artist, comment', tone: 'muted' },
    { at: 1, text: '[FixupM4a] Correcting container timestamps', tone: 'muted' },
    { at: 1, text: `[MoveFiles] Moving file to "${job.outputPath}"`, tone: 'muted' },
    { at: 1, text: `[info] ${job.sizeMb.toFixed(1)}MiB written to disk`, tone: 'info' },
    { at: 1, text: 'exit code 0', tone: 'ok' },
  );

  return { lines, tailStart };
}

function formatEta(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatEtaClock(seconds: number): string {
  return formatEta(seconds);
}

/** Mock `--get-title` / `-J` metadata pass used when a job is created. */
export function describeDownloadTarget(request: DownloadRequest) {
  const res = resolveMediaUrl(request.url);
  return { resolved: res, title: res.title, uploader: res.seriesTitle };
}

export function createDownloadJob(request: DownloadRequest): DownloadJob {
  const { resolved } = describeDownloadTarget(request);
  const seed = hashString(request.url + request.format + request.quality);
  const minutes = Math.max(resolved.duration, 12) / 60;

  const rawSize = minutes * QUALITY_BITRATE[request.quality] * 7.5;
  const sizeMb =
    request.format === 'audio'
      ? Math.min(70, Math.max(3.2, minutes * 1.35 * 7.5))
      : Math.min(980, Math.max(18, rawSize));

  // Randomised-but-stable throughput: every job transfers in ~5–9 virtual seconds.
  const targetSeconds = 5 + (seed % 5);
  const speedMbps = Number((sizeMb / targetSeconds).toFixed(2));

  const job: DownloadJob = {
    id: randomId('dl'),
    url: request.url,
    title: resolved.title,
    uploader: resolved.seriesTitle,
    format: request.format,
    quality: request.quality,
    sizeMb: Number(sizeMb.toFixed(2)),
    speedMbps,
    baseSpeedMbps: speedMbps,
    progress: 0,
    status: 'resolving',
    outputPath: `~/Downloads/MPV Studio/${slugify(resolved.title)} [${resolved.id}].${AUDIO_SUFFIX[request.format]}`,
    logs: [],
    logCursor: 0,
    startedAt: Date.now(),
    elapsed: 0,
    eta: sizeMb / speedMbps,
  };

  // Emit the extractor burst straight away — that part is synchronous in yt-dlp.
  const { lines, tailStart } = buildLogScript(job);
  const head: LogLine[] = [];
  let cursor = 0;
  while (cursor < tailStart && lines[cursor].at < 0.0009) {
    head.push({
      id: `${job.id}-log-${cursor}`,
      at: 0,
      text: lines[cursor].text,
      tone: lines[cursor].tone,
    });
    cursor += 1;
  }

  return { ...job, logs: head, logCursor: cursor };
}

/**
 * Advance a job by `dt` seconds of wall-clock time.
 * Pure: returns a new object, never mutates.
 */
export function advanceDownload(job: DownloadJob, dt: number): DownloadJob {
  if (job.status === 'complete' || job.status === 'error') return job;

  const elapsed = job.elapsed + dt;

  // Stage 1 — extractor / metadata probe.
  if (job.status === 'resolving') {
    if (elapsed < 1.1) return { ...job, elapsed };
    const resumed: DownloadJob = { ...job, elapsed, status: 'downloading' };
    return pumpLog(resumed);
  }

  // Stage 2 — transfer with jittery throughput.
  // Jitter is applied to the *base* rate — compounding it into the previous
  // tick's speed would turn the throughput into a decaying random walk.
  const jitter = 1 + 0.16 * Math.sin(elapsed * 1.7) + 0.06 * Math.cos(elapsed * 0.7);
  const speed = Math.max(0.25, job.baseSpeedMbps * jitter);
  const progress = Math.min(1, job.progress + (speed * dt) / job.sizeMb);
  const eta = progress >= 1 ? 0 : ((1 - progress) * job.sizeMb) / speed;

  const next: DownloadJob = {
    ...job,
    elapsed,
    progress,
    speedMbps: speed,
    eta,
    status: progress >= 1 ? 'complete' : 'downloading',
  };

  // Post-processing still has lines to stream → stay "in flight" for a beat.
  const { lines } = buildLogScript(next);
  if (progress >= 1 && next.logCursor < lines.length) next.status = 'downloading';

  return pumpLog(next);
}

/**
 * Append the script lines whose threshold has been crossed.
 * During the transfer at most 6 lines land per tick so the terminal keeps its
 * streaming feel; once the bar is full the tail drips one line at a time.
 */
function pumpLog(next: DownloadJob): DownloadJob {
  const { lines, tailStart } = buildLogScript(next);
  const perTick = next.progress >= 1 ? 1 : 6;
  let cursor = next.logCursor;
  const appended: LogLine[] = [];

  while (cursor < lines.length && appended.length < perTick) {
    const line = lines[cursor];
    const reached = cursor >= tailStart || line.at <= next.progress + 1e-9;
    if (!reached) break;
    appended.push({
      id: `${next.id}-log-${cursor}`,
      // Wall-clock seconds since the job started: monotonic by construction.
      at: Number(next.elapsed.toFixed(2)),
      text: line.text,
      tone: line.tone,
    });
    cursor += 1;
  }

  const finished = next.progress >= 1 && cursor >= lines.length;

  return {
    ...next,
    logs: appended.length ? [...next.logs, ...appended] : next.logs,
    logCursor: cursor,
    status: next.status === 'error' ? 'error' : finished ? 'complete' : next.status,
  };
}

export function retryDownload(job: DownloadJob): DownloadJob {
  return createDownloadJob({ url: job.url, format: job.format, quality: job.quality });
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 48) || 'media'
  );
}

export function qualityOptions(format: DownloadFormat): QualityLabel[] {
  return format === 'audio' ? ['360p'] : ['2160p', '1440p', '1080p', '720p', '480p'];
}

/** Aggregate counters for the downloader header. */
export function sumActiveBytes(jobs: DownloadJob[]): number {
  return jobs
    .filter((job) => job.status === 'downloading' || job.status === 'resolving')
    .reduce((total, job) => total + job.sizeMb * job.progress, 0);
}
