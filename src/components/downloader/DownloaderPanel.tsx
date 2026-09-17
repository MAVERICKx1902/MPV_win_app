import { useMemo, useState } from 'react';
import {
  ChevronDown,
  FolderOpen,
  Link2,
  ListChecks,
  Play,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { DownloadForm } from './DownloadForm';
import { DownloadJobCard } from './DownloadJobCard';
import { DownloadTerminal } from './DownloadTerminal';
import { IconButton } from '../ui/IconButton';
import { Badge, Segmented } from '../ui/Segmented';
import { cn, formatBytes } from '../../lib/utils';
import type { DownloadRequest } from '../../types';
import type { DownloaderController } from '../../hooks/useDownloader';

interface Props {
  onClose: () => void;
  downloads: DownloaderController;
  focusJobId?: string | null;
  onPlayInPlayer: (url: string) => void;
  onToast: (title: string, message?: string) => void;
}

type Tab = 'new' | 'queue';

/**
 * Slide-out downloader. Desktop: right-hand drawer inside the window shell.
 * Mobile: bottom sheet, so it stays usable once this ships as an APK.
 *
 * Mounted only while open (see `App`), which lets every piece of state here be
 * plain mount-time state — no prop/state syncing effects required.
 */
export function DownloaderPanel({ onClose, downloads, focusJobId, onPlayInPlayer, onToast }: Props) {
  const [tab, setTab] = useState<Tab>(focusJobId ? 'queue' : 'new');
  const [selectedId, setSelectedId] = useState<string | null>(focusJobId ?? null);
  const [terminalOpen, setTerminalOpen] = useState(true);

  const { jobs, activeCount, completedCount, start, cancel, retry, clearCompleted } = downloads;

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedId) ?? jobs[0],
    [jobs, selectedId],
  );

  const handleStart = (request: DownloadRequest) => {
    const job = start(request);
    setSelectedId(job.id);
    setTerminalOpen(true);
    setTab('queue');
    onToast('Download started', `yt-dlp is fetching “${job.title}” (${formatBytes(job.sizeMb)}).`);
  };

  return (
    <div className="absolute inset-0 z-40" role="dialog" aria-label="Downloader">
      <button
        type="button"
        aria-label="Close downloader"
        onClick={onClose}
        className="animate-fade absolute inset-0 cursor-default bg-black/45 backdrop-blur-[2px]"
      />

      <aside
        className={cn(
          'absolute right-0 bottom-0 flex w-full flex-col overflow-hidden border-white/10 bg-ink-900/85 backdrop-blur-2xl',
          'h-[88%] rounded-t-3xl border-t shadow-[-30px_0_80px_-40px_rgba(0,0,0,1)]',
          'sm:top-0 sm:h-full sm:w-[440px] sm:rounded-t-none sm:rounded-l-3xl sm:border-t-0 sm:border-l',
          'animate-rise',
        )}
      >
        {/* header */}
        <header className="flex shrink-0 items-center gap-2.5 border-b border-white/8 px-4 py-3">
          <span className="grid h-8 w-8 place-items-center rounded-xl border border-accent-400/25 bg-accent-500/12 text-accent-300">
            <Link2 className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink-100">Downloader</h2>
            <p className="truncate font-mono text-[10.5px] text-ink-400">
              yt-dlp bridge · mocked · {activeCount} active
            </p>
          </div>
          {activeCount > 0 && (
            <Badge tone="teal">
              <span className="mr-0.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-teal-300" />
              live
            </Badge>
          )}
          <IconButton size="sm" variant="ghost" round icon={<X className="h-4 w-4" />} onClick={onClose} aria-label="Close" />
        </header>

        {/* tabs */}
        <div className="flex shrink-0 items-center gap-2 border-b border-white/6 px-4 py-2.5">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'new', label: 'New download', icon: <Plus className="h-3 w-3" /> },
              { value: 'queue', label: `Queue${jobs.length ? ` · ${jobs.length}` : ''}`, icon: <ListChecks className="h-3 w-3" /> },
            ]}
          />
          <span className="ml-auto font-mono text-[10px] text-ink-500">
            {completedCount ? `${completedCount} done` : 'idle'}
          </span>
        </div>

        {/* body */}
        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {tab === 'new' ? (
            <DownloadForm onStart={handleStart} />
          ) : (
            <div className="space-y-2.5">
              {jobs.length === 0 ? (
                <div className="grid place-items-center rounded-2xl border border-dashed border-white/10 py-12 text-center">
                  <Sparkles className="h-5 w-5 text-ink-500" />
                  <p className="mt-2 text-[12.5px] font-medium text-ink-200">No jobs yet</p>
                  <p className="mt-1 max-w-[240px] text-[11.5px] leading-relaxed text-ink-500">
                    Paste a URL in “New download” and the mock yt-dlp worker will stream its output below.
                  </p>
                  <IconButton
                    size="sm"
                    variant="glass"
                    className="mt-3"
                    icon={<Plus className="h-3 w-3" />}
                    onClick={() => setTab('new')}
                  >
                    Add a URL
                  </IconButton>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10.5px] font-semibold tracking-[0.14em] text-ink-400 uppercase">
                      jobs
                    </p>
                    {completedCount > 0 && (
                      <button
                        type="button"
                        onClick={clearCompleted}
                        className="flex items-center gap-1 text-[10.5px] text-ink-400 transition-colors hover:text-danger-400"
                      >
                        <Trash2 className="h-3 w-3" /> clear completed
                      </button>
                    )}
                  </div>
                  {jobs.map((job) => (
                    <DownloadJobCard
                      key={job.id}
                      job={job}
                      selected={selectedJob?.id === job.id}
                      onSelect={(next) => setSelectedId(next.id)}
                      onCancel={cancel}
                      onRetry={retry}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* docked terminal */}
        {jobs.length > 0 && (
          <div className="shrink-0 border-t border-white/8 bg-black/25 p-3">
            <div className="mb-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTerminalOpen((value) => !value)}
                className="flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.12em] text-ink-300 uppercase transition-colors hover:text-ink-100"
              >
                <ChevronDown className={cn('h-3 w-3 transition-transform', !terminalOpen && '-rotate-90')} />
                worker output
              </button>
              <span className="truncate font-mono text-[10px] text-ink-500">{selectedJob?.title}</span>
              <span className="ml-auto flex items-center gap-1">
                <IconButton
                  size="sm"
                  variant="ghost"
                  round
                  icon={<Play className="h-3 w-3" />}
                  aria-label="Play in player"
                  disabled={!selectedJob}
                  onClick={() => selectedJob && onPlayInPlayer(selectedJob.url)}
                />
                <IconButton
                  size="sm"
                  variant="ghost"
                  round
                  icon={<FolderOpen className="h-3 w-3" />}
                  aria-label="Reveal in folder"
                  onClick={() =>
                    onToast('Reveal in folder', 'Native shell integration arrives with the Tauri build.')
                  }
                />
              </span>
            </div>
            {terminalOpen && (
              <DownloadTerminal job={selectedJob} maxHeight={196} />
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
