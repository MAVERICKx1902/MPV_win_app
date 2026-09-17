import { useState } from 'react';
import { CornerDownLeft, Link2, ListPlus, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { cn, isProbablyUrl } from '../../lib/utils';

interface Props {
  resolvingUrl: string | null;
  onOpen: (url: string, intent: 'now' | 'queue') => void;
  className?: string;
}

const QUICK = [
  { label: 'YouTube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { label: 'Twitch live', url: 'https://twitch.tv/nightdrive_fm' },
  { label: 'HLS stream', url: 'https://cdn.mpv.studio/live/midnight-signal/index.m3u8' },
  { label: 'MP4 file', url: 'https://mpv.studio/series/midnight-signal/s01e03.mp4' },
];

/** The "resolve a URL" strip — the entry point of the Auto-Next pipeline. */
export function UrlBar({ resolvingUrl, onOpen, className }: Props) {
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  const valid = isProbablyUrl(value);
  const busy = Boolean(resolvingUrl);

  const submit = (intent: 'now' | 'queue') => {
    setTouched(true);
    if (!valid || busy) return;
    onOpen(value.trim(), intent);
  };

  return (
    <div className={cn('shrink-0 px-1', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2 rounded-xl border bg-black/30 px-2.5 py-2 backdrop-blur-xl transition-colors',
            touched && !valid ? 'border-danger-400/50' : 'border-white/10 focus-within:border-accent-400/45',
          )}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent-300" />
          ) : (
            <Link2 className={cn('h-3.5 w-3.5 shrink-0', valid ? 'text-teal-400' : 'text-ink-500')} />
          )}
          <input
            value={value}
            spellCheck={false}
            onChange={(event) => setValue(event.target.value)}
            onBlur={() => setTouched(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit(event.shiftKey ? 'queue' : 'now');
            }}
            placeholder="Paste a video URL — youtube.com/watch?v=…, .mp4, .m3u8, magnet:…"
            aria-label="Open media from URL"
            className="min-w-0 flex-1 bg-transparent font-mono text-[11.5px] text-ink-100 outline-none placeholder:text-ink-500"
          />
          {value && (
            <span className="hidden items-center gap-1 font-mono text-[10px] text-ink-500 sm:flex">
              <CornerDownLeft className="h-2.5 w-2.5" /> resolve
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <IconButton
            size="md"
            variant="glass"
            disabled={!valid || busy}
            onClick={() => submit('queue')}
            icon={<ListPlus className="h-3.5 w-3.5" />}
            aria-label="Add URL to queue"
          >
            Queue
          </IconButton>
          <IconButton
            size="md"
            variant="solid"
            disabled={!valid || busy}
            onClick={() => submit('now')}
            icon={busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          >
            {busy ? 'Resolving' : 'Open'}
          </IconButton>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="flex items-center gap-1 text-[10px] text-ink-500">
          <ShieldCheck className="h-3 w-3 text-teal-400/80" /> mock resolver
        </span>
        <span className="text-ink-700">·</span>
        {QUICK.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              setValue(item.url);
              setTouched(true);
            }}
            className="rounded-lg border border-white/8 bg-white/4 px-2 py-0.5 text-[10.5px] text-ink-300 transition-colors hover:border-white/16 hover:bg-white/8 hover:text-ink-100"
          >
            {item.label}
          </button>
        ))}
        {touched && !valid && value.length > 0 && (
          <span className="text-[10.5px] text-danger-400">unrecognised URL</span>
        )}
      </div>
    </div>
  );
}
