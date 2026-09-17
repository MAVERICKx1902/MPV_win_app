import { useMemo, useState } from 'react';
import {
  AudioLines,
  ClipboardPaste,
  Download,
  Film,
  Globe,
  Link2,
  Loader2,
  Wand2,
} from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { Badge } from '../ui/Segmented';
import { Toggle } from '../ui/Toggle';
import { cn, isProbablyUrl } from '../../lib/utils';
import { buildYtDlpCommand, outputTemplate } from '../../lib/downloader';
import type { DownloadFormat, DownloadRequest, QualityLabel } from '../../types';

interface Props {
  onStart: (request: DownloadRequest) => void;
  busy?: boolean;
  className?: string;
}

const SAMPLES = [
  { label: 'YouTube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { label: 'Lofi stream', url: 'https://youtu.be/jfKfPfyJRdk' },
  { label: 'Direct MP4', url: 'https://mpv.studio/series/midnight-signal/s01e02.mp4' },
  { label: 'Podcast MP3', url: 'https://feeds.nightdrive.fm/ep-114-neon-district.mp3' },
];

const VIDEO_QUALITIES: QualityLabel[] = ['2160p', '1440p', '1080p', '720p', '480p'];
const AUDIO_BITRATES = ['128 kbps', '192 kbps', '320 kbps'];

export function DownloadForm({ onStart, busy = false, className }: Props) {
  const [url, setUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const [format, setFormat] = useState<DownloadFormat>('video');
  const [quality, setQuality] = useState<QualityLabel>('1080p');
  const [bitrate, setBitrate] = useState(AUDIO_BITRATES[2]);
  const [embedSubtitles, setEmbedSubtitles] = useState(true);
  const [playlist, setPlaylist] = useState(false);
  const [thumbnail, setThumbnail] = useState(true);
  const [touched, setTouched] = useState(false);
  const [probing, setProbing] = useState(false);

  const valid = isProbablyUrl(url);
  const showError = touched && !valid;

  const command = useMemo(
    () => buildYtDlpCommand({ url: url.trim() || 'https://…', format, quality }),
    [format, quality, url],
  );

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    setProbing(true);
    window.setTimeout(
      () => {
        setProbing(false);
        onStart({ url: url.trim(), format, quality });
      },
      420,
    );
  };

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setTouched(true);
      }
    } catch {
      /* clipboard permission denied — the field is still editable */
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* ---------- URL ---------- */}
      <div>
        <label
          htmlFor="dl-url"
          className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.14em] text-ink-400 uppercase"
        >
          <Link2 className="h-3 w-3" /> source url
        </label>
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl border bg-black/35 px-2.5 py-2 transition-colors',
            showError ? 'border-danger-400/50' : 'border-white/10 focus-within:border-accent-400/50',
          )}
        >
          <Globe className={cn('h-4 w-4 shrink-0', valid ? 'text-teal-400' : 'text-ink-500')} />
          <input
            id="dl-url"
            value={url}
            spellCheck={false}
            onChange={(event) => setUrl(event.target.value)}
            onBlur={() => setTouched(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit();
            }}
            placeholder="https://www.youtube.com/watch?v=…"
            className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-ink-100 outline-none placeholder:text-ink-500"
          />
          <button
            type="button"
            onClick={paste}
            className="flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-1 text-[10.5px] text-ink-400 transition-colors hover:bg-white/8 hover:text-ink-100"
          >
            <ClipboardPaste className="h-3 w-3" /> paste
          </button>
        </div>
        {showError ? (
          <p className="mt-1.5 text-[11px] text-danger-400">
            That doesn’t look like a URL yt-dlp can extract. Try something like{' '}
            <span className="font-mono">youtube.com/watch?v=…</span>
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SAMPLES.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => {
                  setUrl(sample.url);
                  setTouched(true);
                }}
                className="rounded-lg border border-white/8 bg-white/4 px-2 py-1 text-[10.5px] text-ink-300 transition-colors hover:border-white/16 hover:bg-white/8 hover:text-ink-100"
              >
                {sample.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ---------- format ---------- */}
      <div>
        <p className="mb-1.5 text-[10.5px] font-semibold tracking-[0.14em] text-ink-400 uppercase">format</p>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: 'video' as const, label: 'Video', ext: 'MP4', icon: Film, hint: 'H.264 + AAC merge' },
              { id: 'audio' as const, label: 'Audio', ext: 'MP3', icon: AudioLines, hint: 'extract + transcode' },
            ] satisfies { id: DownloadFormat; label: string; ext: string; icon: typeof Film; hint: string }[]
          ).map((option) => {
            const active = format === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setFormat(option.id)}
                className={cn(
                  'relative overflow-hidden rounded-2xl border p-3 text-left transition-all duration-200',
                  active
                    ? 'border-accent-400/40 bg-accent-500/10 shadow-[0_0_0_1px_rgba(139,150,255,0.16)]'
                    : 'border-white/8 bg-white/3 hover:border-white/16 hover:bg-white/6',
                )}
              >
                <option.icon className={cn('h-4 w-4', active ? 'text-accent-300' : 'text-ink-400')} />
                <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-100">
                  {option.label}
                  <span className="rounded bg-white/8 px-1 py-[1px] font-mono text-[9.5px] text-ink-300">
                    {option.ext}
                  </span>
                </p>
                <p className="mt-0.5 text-[10.5px] text-ink-500">{option.hint}</p>
                {active && (
                  <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-accent-300 shadow-[0_0_8px_rgba(165,176,255,0.9)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------- quality ---------- */}
      <div>
        <p className="mb-1.5 flex items-center justify-between text-[10.5px] font-semibold tracking-[0.14em] text-ink-400 uppercase">
          {format === 'video' ? 'resolution cap' : 'audio bitrate'}
          <span className="font-mono text-[10px] tracking-normal text-ink-500 normal-case">
            -f {format === 'video' ? `bv*[height<=${quality.replace('p', '')}]+ba/b` : 'bestaudio'}
          </span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(format === 'video' ? VIDEO_QUALITIES : AUDIO_BITRATES).map((option) => {
            const value = format === 'video' ? option : bitrate;
            const active = format === 'video' ? option === quality : option === bitrate;
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  if (format === 'video') setQuality(option as QualityLabel);
                  else setBitrate(option);
                }}
                className={cn(
                  'rounded-xl border px-2.5 py-1.5 font-mono text-[11px] transition-all duration-200',
                  active
                    ? 'border-accent-400/40 bg-accent-500/12 text-accent-200'
                    : 'border-white/8 bg-white/3 text-ink-300 hover:border-white/16 hover:text-ink-100',
                )}
              >
                {value}
              </button>
            );
          })}
        </div>
        {format === 'audio' && (
          <p className="mt-1.5 text-[10.5px] text-ink-500">Video track is dropped — the container is remuxed to MP3.</p>
        )}
      </div>

      {/* ---------- switches ---------- */}
      <div className="space-y-2.5 rounded-2xl border border-white/8 bg-white/3 p-3">
        <Toggle
          checked={embedSubtitles}
          onChange={setEmbedSubtitles}
          label="Embed subtitles"
          hint={format === 'video' ? '--embed-subs --sub-langs en.*' : 'not applicable for audio'}
          disabled={format === 'audio'}
        />
        <Toggle disabled={format === 'audio'} checked={thumbnail} onChange={setThumbnail} label="Embed cover art" hint="--embed-thumbnail" />
        <Toggle checked={playlist} onChange={setPlaylist} label="Download whole playlist" hint="--yes-playlist (off by default)" />
      </div>

      {/* ---------- command preview ---------- */}
      <div className="rounded-2xl border border-white/8 bg-black/45 p-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] text-ink-400 uppercase">
          <Wand2 className="h-3 w-3" /> command preview
        </p>
        <code className="block font-mono text-[10.5px] leading-relaxed break-all text-teal-300/90">
          {command}
        </code>
        <p className="mt-2 truncate font-mono text-[10px] text-ink-500">-o "{outputTemplate({ format })}"</p>
      </div>

      <div className="flex items-center gap-2">
        <IconButton
          variant="solid"
          size="lg"
          className="flex-1"
          disabled={probing || busy}
          onClick={submit}
          icon={probing || busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        >
          {probing ? 'Probing formats…' : 'Download'}
        </IconButton>
        <Badge tone="neutral" className="h-11 rounded-2xl px-3 normal-case">
          mock mode
        </Badge>
      </div>
    </div>
  );
}
