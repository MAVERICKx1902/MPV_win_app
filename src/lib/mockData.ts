import type { MediaItem, QualityLabel, SourceKind } from '../types';

/** The three ~12s placeholder clips rendered by `scripts/generate-placeholder-media.sh`. */
export const PLACEHOLDER_CLIPS = [
  { src: '/media/midnight-signal-01.mp4', poster: '/media/midnight-signal-01.jpg', accent: '#7c8cff' },
  { src: '/media/neon-district-02.mp4', poster: '/media/neon-district-02.jpg', accent: '#ff5fa2' },
  { src: '/media/deep-field-03.mp4', poster: '/media/deep-field-03.jpg', accent: '#38e8d0' },
] as const;

export const SERIES_TITLE = 'The Midnight Signal';

/**
 * The mock "library": a three episode mini-series plus a handful of faux
 * YouTube uploads. Playback durations are the real length of the placeholder
 * clips (12s) so the timeline, auto-next and ETA math all stay honest.
 */
export const LIBRARY: MediaItem[] = [
  {
    id: 'midnight-01',
    title: 'Cold Boot',
    subtitle: `${SERIES_TITLE} · Episode 01`,
    seriesTitle: SERIES_TITLE,
    episodeNumber: 1,
    duration: 12,
    resolution: '1280×720',
    src: PLACEHOLDER_CLIPS[0].src,
    poster: PLACEHOLDER_CLIPS[0].poster,
    accent: PLACEHOLDER_CLIPS[0].accent,
    kind: 'series',
    sourceUrl: 'https://mpv.studio/series/midnight-signal/s01e01',
    quality: '1080p',
    tags: ['HDR', '5.1', 'Subs'],
  },
  {
    id: 'midnight-02',
    title: 'Neon District',
    subtitle: `${SERIES_TITLE} · Episode 02`,
    seriesTitle: SERIES_TITLE,
    episodeNumber: 2,
    duration: 12,
    resolution: '1280×720',
    src: PLACEHOLDER_CLIPS[1].src,
    poster: PLACEHOLDER_CLIPS[1].poster,
    accent: PLACEHOLDER_CLIPS[1].accent,
    kind: 'series',
    sourceUrl: 'https://mpv.studio/series/midnight-signal/s01e02',
    quality: '1080p',
    tags: ['HDR', '5.1', 'Subs'],
  },
  {
    id: 'midnight-03',
    title: 'Deep Field',
    subtitle: `${SERIES_TITLE} · Episode 03`,
    seriesTitle: SERIES_TITLE,
    episodeNumber: 3,
    duration: 12,
    resolution: '1280×720',
    src: PLACEHOLDER_CLIPS[2].src,
    poster: PLACEHOLDER_CLIPS[2].poster,
    accent: PLACEHOLDER_CLIPS[2].accent,
    kind: 'series',
    sourceUrl: 'https://mpv.studio/series/midnight-signal/s01e03',
    quality: '1080p',
    tags: ['HDR', '5.1', 'Subs'],
  },
  {
    id: 'yt-signal-teardown',
    title: 'Teardown: how I built a frameless player with Tauri 2.0',
    subtitle: 'uploaded by @pixelmechanic · 128K views',
    seriesTitle: '@pixelmechanic',
    episodeNumber: 1,
    duration: 12,
    resolution: '1280×720',
    src: PLACEHOLDER_CLIPS[0].src,
    poster: PLACEHOLDER_CLIPS[0].poster,
    accent: '#8b96ff',
    kind: 'youtube',
    sourceUrl: 'https://youtu.be/dQw4w9WgXcQ',
    quality: '720p',
    tags: ['YouTube', 'Auto-Next'],
  },
  {
    id: 'yt-neon-lofi',
    title: 'neon district — 1 hour lofi mix (loop friendly)',
    subtitle: 'uploaded by @nightdrive.fm · 2.4M views',
    seriesTitle: '@nightdrive.fm',
    episodeNumber: 2,
    duration: 12,
    resolution: '1280×720',
    src: PLACEHOLDER_CLIPS[1].src,
    poster: PLACEHOLDER_CLIPS[1].poster,
    accent: '#ff5fa2',
    kind: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    quality: '480p',
    tags: ['YouTube', 'Music'],
  },
  {
    id: 'yt-deep-field',
    title: 'Deep field in 4K — the calmest 12 seconds on the internet',
    subtitle: 'uploaded by @stillframe · 812K views',
    seriesTitle: '@stillframe',
    episodeNumber: 3,
    duration: 12,
    resolution: '1280×720',
    src: PLACEHOLDER_CLIPS[2].src,
    poster: PLACEHOLDER_CLIPS[2].poster,
    accent: '#38e8d0',
    kind: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    quality: '2160p',
    tags: ['YouTube', '4K'],
  },
];

export const QUALITY_LADDER: QualityLabel[] = ['2160p', '1440p', '1080p', '720p', '480p', '360p'];

export const QUALITY_BITRATE: Record<QualityLabel, number> = {
  '2160p': 24,
  '1440p': 14,
  '1080p': 8.5,
  '720p': 5.2,
  '480p': 2.6,
  '360p': 1.4,
};

export const SOURCE_LABEL: Record<SourceKind, string> = {
  series: 'Series',
  youtube: 'YouTube',
  live: 'Live',
  file: 'Local',
  unknown: 'Web',
};

export const SOURCE_TINT: Record<SourceKind, string> = {
  series: 'from-accent-500/25 to-teal-400/20 text-accent-300 border-accent-400/30',
  youtube: 'from-danger-500/25 to-warn-400/20 text-danger-400 border-danger-400/30',
  live: 'from-teal-400/25 to-accent-500/20 text-teal-300 border-teal-400/30',
  file: 'from-ink-500/30 to-ink-700/30 text-ink-200 border-white/15',
  unknown: 'from-ink-600/30 to-ink-800/30 text-ink-300 border-white/10',
};

/** Tiny inline SVG keeps the artwork honest without shipping poster art. */
export function artworkBackground(accent: string): string {
  return `radial-gradient(120% 120% at 20% 0%, ${accent}44 0%, transparent 55%), radial-gradient(90% 90% at 100% 100%, ${accent}22 0%, transparent 60%), linear-gradient(180deg, #14141f 0%, #0a0a12 100%)`;
}
