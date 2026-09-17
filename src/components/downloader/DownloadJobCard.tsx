import {
  AudioLines,
  CheckCircle2,
  CircleX,
  Clock,
  Film,
  Loader2,
  RotateCw,
  Trash2,
} from 'lucide-react';
import { IconButton, Tip } from '../ui/IconButton';
import { Badge } from '../ui/Segmented';
import { cn, formatBytes, formatTime } from '../../lib/utils';
import { formatEtaClock } from '../../lib/downloader';
import type { DownloadJob } from '../../types';

interface Props {
  job: DownloadJob;
  selected?: boolean;
  onSelect?: (job: DownloadJob) => void;
  onCancel?: (id: string) => void;
  onRetry?: (job: DownloadJob) => void;
  compact?: boolean;
  className?: string;
}

const STATUS_META: Record<
  DownloadJob['status'],
  { label: string; tone: 'neutral' | 'accent' | 'teal' | 'warn' | 'danger'; icon: typeof Clock }
> = {
  queued: { label: 'Queued', tone: 'neutral', icon: Clock },
  resolving: { label: 'Resolving', tone: 'accent', icon: Loader2 },
  downloading: { label: 'Downloading', tone: 'warn', icon: Loader2 },
  complete: { label: 'Complete', tone: 'teal', icon: CheckCircle2 },
  error: { label: 'Failed', tone: 'danger', icon: CircleX },
};

export function DownloadJobCard({
  job,
  selected = false,
  onSelect,
  onCancel,
  onRetry,
  compact = false,
  className,
}: Props) {
  const meta = STATUS_META[job.status];
  const StatusIcon = meta.icon;
  const running = job.status === 'downloading' || job.status === 'resolving';
  const pct = Math.round(job.progress * 100);

  return (
    <div
      onClick={() => onSelect?.(job)}
      className={cn(
        'group cursor-pointer rounded-2xl border p-3 transition-all duration-200',
        selected
          ? 'border-accent-400/35 bg-accent-500/8 shadow-[0_0_0_1px_rgba(139,150,255,0.15)]'
          : 'border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/6',
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border',
            job.format === 'audio'
              ? 'border-teal-400/25 bg-teal-400/10 text-teal-300'
              : 'border-accent-400/25 bg-accent-500/10 text-accent-300',
          )}
        >
          {job.format === 'audio' ? <AudioLines className="h-4 w-4" /> : <Film className="h-4 w-4" />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p className="line-clamp-2 min-w-0 flex-1 text-[12.5px] leading-snug font-medium text-ink-100">
              {job.title}
            </p>
            <Badge tone={meta.tone} className="shrink-0">
              <StatusIcon className={cn('h-2.5 w-2.5', running && 'animate-spin')} />
              {meta.label}
            </Badge>
          </div>

          <p className="mt-0.5 truncate font-mono text-[10px] text-ink-500">
            {job.uploader} · {job.quality} · {job.format === 'audio' ? 'mp3' : 'mp4'} · {formatBytes(job.sizeMb)}
          </p>

          {!compact && (
            <>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                <div
                  className={cn(
                    'h-full rounded-full transition-[width] duration-200 ease-out',
                    job.status === 'complete'
                      ? 'bg-linear-to-r from-teal-400 to-teal-500'
                      : 'bg-linear-to-r from-accent-400 via-accent-500 to-teal-400',
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="mt-1.5 flex items-center gap-2 font-mono text-[10px] text-ink-400">
                <span className={cn('tabular-nums', job.status === 'complete' && 'text-teal-300')}>{pct}%</span>
                <span className="text-ink-600">·</span>
                <span className="tabular-nums">
                  {formatBytes(job.sizeMb * job.progress)} / {formatBytes(job.sizeMb)}
                </span>
                <span className="text-ink-600">·</span>
                {running ? (
                  <>
                    <span className="tabular-nums text-ink-300">{job.speedMbps.toFixed(2)} MB/s</span>
                    <span className="text-ink-600">·</span>
                    <span className="tabular-nums">ETA {formatEtaClock(job.eta)}</span>
                  </>
                ) : job.status === 'complete' ? (
                  <span className="tabular-nums">finished in {formatTime(job.elapsed)}</span>
                ) : (
                  <span className="tabular-nums">elapsed {formatTime(job.elapsed)}</span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {job.status === 'complete' ? (
            <Tip label="Download again">
              <IconButton
                size="sm"
                variant="ghost"
                round
                icon={<RotateCw className="h-3.5 w-3.5" />}
                onClick={(event) => {
                  event.stopPropagation();
                  onRetry?.(job);
                }}
                aria-label="Download again"
              />
            </Tip>
          ) : (
            <Tip label="Cancel job">
              <IconButton
                size="sm"
                variant="ghost"
                round
                className="hover:text-danger-400"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={(event) => {
                  event.stopPropagation();
                  onCancel?.(job.id);
                }}
                aria-label="Cancel job"
              />
            </Tip>
          )}
        </div>
      </div>

      {!compact && job.status === 'complete' && (
        <p className="mt-2 truncate font-mono text-[10px] text-teal-300/80">✔ saved to {job.outputPath}</p>
      )}
    </div>
  );
}
