/**
 * Shared domain types for the MPV Studio web prototype.
 *
 * Everything here is intentionally transport-agnostic: once the Tauri 2.0
 * shell is wired up, these shapes are what the Rust commands
 * (`resolve_url`, `start_download`, `probe_media`, …) are expected to
 * serialise into. Keeping them in one file means the mock layer and the
 * future IPC layer can be swapped without touching the UI.
 */

/** Where a queue entry came from — drives the badge + auto-next copy. */
export type SourceKind = 'series' | 'youtube' | 'live' | 'file' | 'unknown';

/** Airplay-ish quality label shown in the player chrome. */
export type QualityLabel = '2160p' | '1440p' | '1080p' | '720p' | '480p' | '360p';

/** A single playable entry in the queue. */
export interface MediaItem {
  id: string;
  title: string;
  /** Secondary line, e.g. `The Midnight Signal · Episode 01`. */
  subtitle: string;
  seriesTitle: string;
  episodeNumber: number;
  /** Nominal runtime in seconds — real duration is read from the <video>. */
  duration: number;
  resolution: string;
  /** Resolvable asset used by the <video> element. */
  src: string;
  poster: string;
  /** Hex accent used for artwork glow + badges. */
  accent: string;
  kind: SourceKind;
  sourceUrl: string;
  quality: QualityLabel;
  tags: string[];
}

/** Result of the (simulated) URL resolver — the "Auto-Next" brain. */
export interface ResolvedSource {
  kind: SourceKind;
  id: string;
  title: string;
  subtitle: string;
  seriesTitle: string;
  duration: number;
  resolution: string;
  quality: QualityLabel;
  src: string;
  poster: string;
  accent: string;
  sourceUrl: string;
  provider: string;
  tags: string[];
  /** Human readable steps the resolver pretends to perform. */
  trace: string[];
}

/** A toast/notification surfaced in the shell. */
export interface Toast {
  id: string;
  tone: 'info' | 'success' | 'warn' | 'danger';
  title: string;
  message?: string;
  ttl: number;
}

/* -------------------------------------------------------------------------- */
/*  Downloader                                                                */
/* -------------------------------------------------------------------------- */

export type DownloadFormat = 'video' | 'audio';
export type DownloadJobStatus = 'queued' | 'resolving' | 'downloading' | 'complete' | 'error';

export interface LogTone {
  tone: 'muted' | 'info' | 'ok' | 'warn' | 'err';
}

export interface LogLine {
  id: string;
  /** Seconds (virtual) since the job started. */
  at: number;
  text: string;
  tone: LogTone['tone'];
}

export interface DownloadJob {
  id: string;
  url: string;
  /** Pretty title resolved from the URL (mock yt-dlp `--get-title`). */
  title: string;
  uploader: string;
  format: DownloadFormat;
  quality: QualityLabel;
  /** Total payload size in MB. */
  sizeMb: number;
  /** Current (jittered) throughput in MB/s — this is what the UI shows. */
  speedMbps: number;
  /** Nominal throughput, the stable base the jitter is applied to. */
  baseSpeedMbps: number;
  /** 0 → 1 */
  progress: number;
  status: DownloadJobStatus;
  outputPath: string;
  logs: LogLine[];
  /** Index of the next log line to emit, so the stepper stays O(1). */
  logCursor: number;
  startedAt: number;
  elapsed: number;
  eta: number;
}

export interface DownloadRequest {
  url: string;
  format: DownloadFormat;
  quality: QualityLabel;
}

/* -------------------------------------------------------------------------- */
/*  Player                                                                    */
/* -------------------------------------------------------------------------- */

export type RepeatMode = 'off' | 'all' | 'one';
export type RightPanelTab = 'queue' | 'downloads' | 'info';
export type MobileTab = 'player' | 'library' | 'queue' | 'downloads';
