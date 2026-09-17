import {
  LIBRARY,
  PLACEHOLDER_CLIPS,
  QUALITY_LADDER,
  SERIES_TITLE,
} from './mockData';
import type { MediaItem, QualityLabel, ResolvedSource, SourceKind } from '../types';
import { hashString, hostFromUrl, pick } from './utils';

/**
 * ---------------------------------------------------------------------------
 *  Simulated URL → media resolver
 * ---------------------------------------------------------------------------
 *  In the shipped Tauri build this module is replaced by an IPC bridge to the
 *  Rust side, which shells out to `yt-dlp -J` / `mpv --no-config` and returns a
 *  manifest. Until then we keep the exact same async shape so the UI never has
 *  to change: give it a URL, get back a `ResolvedSource`.
 *
 *  The output is fully deterministic (FNV-1a hash seeded) which makes the demo
 *  believable: the same URL always "resolves" to the same title, duration and
 *  format selection.
 * ---------------------------------------------------------------------------
 */

/**
 * Provider table. Patterns are tested against the parsed *hostname* (see
 * `hostFromUrl`), so sub-domains such as `m.youtube.com` match cleanly.
 */
const PROVIDERS: Array<{ test: RegExp; provider: string; kind: SourceKind }> = [
  { test: /(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/i, provider: 'youtube', kind: 'youtube' },
  { test: /(^|\.)(twitch\.tv|kick\.com)$/i, provider: 'twitch', kind: 'live' },
  { test: /(^|\.)(vimeo\.com|dailymotion\.com|bilibili\.com|nicovideo\.jp)$/i, provider: 'vimeo', kind: 'youtube' },
  { test: /(^|\.)(soundcloud\.com|bandcamp\.com|mixcloud\.com)$/i, provider: 'soundcloud', kind: 'youtube' },
  { test: /(^|\.)(archive\.org|commons\.wikimedia\.org)$/i, provider: 'archive', kind: 'file' },
];

const FORMAT_TAIL = [
  '137+140 · avc1 1080p + m4a 128k',
  'bv*+ba/b · vp9 1440p + opus 160k',
  '22 · h264 720p + aac 192k',
  '248+251 · vp9 2160p + opus 160k',
];

/** Extract a stable "video id" from any of the weird URL shapes users paste. */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{6,})/,
    /youtu\.be\/([A-Za-z0-9_-]{6,})/,
    /\/shorts\/([A-Za-z0-9_-]{6,})/,
    /\/embed\/([A-Za-z0-9_-]{6,})/,
    /\/live\/([A-Za-z0-9_-]{6,})/,
    /\/videos?\/(\d{4,})/,
    /vimeo\.com\/(\d{5,})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/** Turn `some-great_video.mp4` into `Some great video`. */
function prettifySlug(url: string): string {
  const withoutQuery = url.split(/[?#]/)[0] ?? url;
  const segments = withoutQuery.split('/').filter(Boolean);
  const last = segments[segments.length - 1] ?? '';
  const slug = last.replace(/\.(mp4|mkv|webm|mov|m4v|m3u8|mpd|mp3|m4a|flac|opus|wav)$/i, '');
  if (!slug || slug.length < 3) return 'Untitled stream';
  return decodeURIComponent(slug)
    .replace(/[-_+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function detectKind(url: string): { kind: SourceKind; provider: string } {
  if (/^magnet:/i.test(url)) return { kind: 'file', provider: 'torrent' };
  const host = hostFromUrl(url);
  for (const entry of PROVIDERS) {
    if (entry.test.test(host)) return { kind: entry.kind, provider: entry.provider };
  }
  if (/\.m3u8(\?|$)/i.test(url) || /\.mpd(\?|$)/i.test(url)) return { kind: 'live', provider: 'hls/dash' };
  if (/\.(mp4|mkv|webm|mov|m4v|avi)(\?|$)/i.test(url)) return { kind: 'file', provider: 'direct' };
  if (/\.(mp3|m4a|flac|opus|wav)(\?|$)/i.test(url)) return { kind: 'file', provider: 'audio' };
  return { kind: 'unknown', provider: 'generic' };
}

/** The resolver "trace" printed in the UI while a URL is being opened. */
export function resolveTrace(url: string, provider: string): string[] {
  return [
    `resolving ${url.length > 64 ? `${url.slice(0, 61)}…` : url}`,
    `extractor: ${provider} · probing formats`,
    'yt-dlp --dump-single-json --no-warnings',
    'format selected → handed off to player core',
  ];
}

/**
 * Synchronous mock resolution. Purely determined by the input string so that
 * repeated calls (e.g. React strict-mode double renders) are idempotent.
 */
export function resolveMediaUrl(rawUrl: string): ResolvedSource {
  const url = rawUrl.trim();
  const seed = hashString(url || 'empty');
  const { kind, provider } = detectKind(url);
  const videoId = extractVideoId(url);
  const clip = pick(PLACEHOLDER_CLIPS, seed);
  const quality: QualityLabel = pick(QUALITY_LADDER, seed >> 3);
  const host = hostFromUrl(url);

  const isYouTube = provider === 'youtube';
  const knownChannel = pick(
    ['@pixelmechanic', '@nightdrive.fm', '@stillframe', '@lofigirl', '@blender.foundation'],
    seed >> 5,
  );

  let title: string;
  let subtitle: string;
  if (isYouTube) {
    title = videoId
      ? `YouTube video ${videoId}`
      : prettifySlug(url) || 'YouTube video';
    subtitle = `uploaded by ${knownChannel} · resolved ${quality}`;
  } else if (kind === 'live') {
    title = prettifySlug(url) || `${host} live`;
    subtitle = `live stream · ${host} · adaptive bitrate`;
  } else if (kind === 'file') {
    title = prettifySlug(url);
    subtitle = `${host} · direct file · ${quality}`;
  } else {
    title = prettifySlug(url);
    subtitle = `web page · ${host} · scraper fallback`;
  }

  return {
    kind,
    id: `resolved-${seed.toString(36)}`,
    title,
    subtitle,
    seriesTitle: isYouTube ? knownChannel : host,
    duration: 12 + (seed % 9) * 12,
    resolution: '1280×720',
    quality,
    // Playable stand-in so the mocked pipeline still shows real frames.
    src: clip.src,
    poster: clip.poster,
    accent: clip.accent,
    sourceUrl: /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`,
    provider,
    tags: [provider, quality, pick(['HLS', 'DASH', 'Progressive', 'WebM'], seed >> 7)],
    trace: resolveTrace(url, provider),
  };
}

/** `ResolvedSource` → queue entry. */
export function toMediaItem(source: ResolvedSource): MediaItem {
  return {
    id: source.id,
    title: source.title,
    subtitle: source.subtitle,
    seriesTitle: source.seriesTitle,
    episodeNumber: 0,
    duration: source.duration,
    resolution: source.resolution,
    src: source.src,
    poster: source.poster,
    accent: source.accent,
    kind: source.kind,
    sourceUrl: source.sourceUrl,
    quality: source.quality,
    tags: source.tags,
  };
}

/** Mirror of `extractVideoId` + FORMAT_TAIL, exposed for the downloader CLI preview. */
export function ytdlpFormatHint(url: string, format: 'video' | 'audio', quality: QualityLabel): string {
  if (format === 'audio') return 'bestaudio/best · opus 160k → mp3 320k';
  const tail = pick(FORMAT_TAIL, hashString(url));
  return `${tail} @ ${quality}`;
}

/* -------------------------------------------------------------------------- */
/*  Auto-Next sequencer                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Decide what should play after `current`.
 *
 * Rules (mirroring the desktop `--auto-next` behaviour):
 *  1. next entry of the same series / channel that is still in the queue,
 *  2. otherwise the next entry of the same `kind`,
 *  3. otherwise wrap around the library.
 */
export function findAutoNext(current: MediaItem | undefined, queue: MediaItem[]): MediaItem | undefined {
  if (!current) return queue[0];
  const index = queue.findIndex((item) => item.id === current.id);
  if (index >= 0 && index < queue.length - 1) {
    const next = queue[index + 1];
    if (next.seriesTitle === current.seriesTitle || next.kind === current.kind) return next;
    return next;
  }

  const sameSeries = LIBRARY.filter(
    (item) => item.seriesTitle === current.seriesTitle && item.id !== current.id,
  );
  if (sameSeries.length > 0) {
    const nextEpisode = sameSeries.find((item) => item.episodeNumber > current.episodeNumber);
    return nextEpisode ?? sameSeries[0];
  }

  const sameKind = LIBRARY.filter((item) => item.kind === current.kind && item.id !== current.id);
  if (sameKind.length > 0) return sameKind[0];

  return LIBRARY.find((item) => item.id !== current.id);
}

/** Copy for the "Up next" chip — differs for series vs. YouTube. */
export function autoNextReason(current: MediaItem | undefined, next: MediaItem | undefined): string {
  if (!current || !next) return 'Queue finished';
  if (next.seriesTitle === current.seriesTitle) {
    return current.kind === 'youtube' ? 'Next video from this channel' : 'Next episode';
  }
  if (next.kind === current.kind) return 'Next in queue';
  return 'Recommended next';
}

/** Upcoming items for the sidebar "Up next" list. */
export function peekQueue(current: MediaItem | undefined, queue: MediaItem[], count = 4): MediaItem[] {
  const pool = [...queue];
  if (current) {
    const index = pool.findIndex((item) => item.id === current.id);
    if (index >= 0) {
      const ordered = [...pool.slice(index + 1), ...pool.slice(0, index)];
      return ordered.filter((item) => item.id !== current.id).slice(0, count);
    }
  }
  return pool.slice(0, count);
}

export const SERIES_LABEL = SERIES_TITLE;
