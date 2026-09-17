import { useEffect, useRef, useState } from 'react';
import { Check, ClipboardCopy, TerminalSquare } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { DownloadJob, LogTone } from '../../types';

const TONE_CLASS: Record<LogTone['tone'], string> = {
  muted: 'text-ink-300',
  info: 'text-accent-300',
  ok: 'text-teal-300',
  warn: 'text-warn-400',
  err: 'text-danger-400',
};

interface Props {
  job: DownloadJob | undefined;
  className?: string;
  maxHeight?: number;
}

/**
 * Fake terminal that streams the mock `yt-dlp` output for a job. Auto-sticks to
 * the bottom unless the user scrolls up, exactly like a real console view.
 */
export function DownloadTerminal({ job, className, maxHeight = 240 }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stickRef = useRef(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || !stickRef.current) return;
    node.scrollTop = node.scrollHeight;
  }, [job?.logs.length]);

  const onScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    stickRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 24;
  };

  const copy = async () => {
    if (!job) return;
    const text = job.logs.map((line) => `${line.at.toFixed(2)}s ${line.text}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={cn('overflow-hidden rounded-xl border border-white/10 bg-black/60', className)}>
      <div className="flex items-center gap-2 border-b border-white/8 bg-white/4 px-2.5 py-1.5">
        <TerminalSquare className="h-3.5 w-3.5 text-teal-400/90" />
        <span className="font-mono text-[10.5px] tracking-tight text-ink-300">
          yt-dlp — {job ? job.id : 'no job'} · bash
        </span>
        <span className="ml-auto flex items-center gap-2">
          <span className="font-mono text-[10px] text-ink-500">{job?.logs.length ?? 0} lines</span>
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-ink-400 transition-colors hover:bg-white/8 hover:text-ink-100"
          >
            {copied ? <Check className="h-3 w-3 text-teal-300" /> : <ClipboardCopy className="h-3 w-3" />}
            {copied ? 'copied' : 'copy'}
          </button>
        </span>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="scroll-slim overflow-y-auto px-3 py-2"
        style={{ maxHeight }}
      >
        {!job || job.logs.length === 0 ? (
          <p className="py-6 text-center font-mono text-[11px] text-ink-500">
            waiting for a job… paste a URL and hit download
          </p>
        ) : (
          <pre className="font-mono text-[11px] leading-[1.65] whitespace-pre-wrap">
            {job.logs.map((line) => (
              <div key={line.id} className="flex gap-2">
                <span className="shrink-0 text-ink-600 select-none">{line.at.toFixed(2)}s</span>
                <span className={cn('min-w-0 break-all', TONE_CLASS[line.tone])}>{line.text}</span>
              </div>
            ))}
            {job.status === 'downloading' && (
              <div className="flex gap-2">
                <span className="shrink-0 text-ink-600 select-none">
                  {job.elapsed.toFixed(2)}s
                </span>
                <span className="inline-flex items-center gap-1 text-ink-300">
                  <span className="inline-block h-3 w-[7px] animate-pulse bg-teal-300/90" />
                </span>
              </div>
            )}
          </pre>
        )}
      </div>
    </div>
  );
}
