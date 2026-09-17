import { Cpu, Download, ExternalLink, Info, Link2, ListVideo, Shuffle, Trash2, Zap } from 'lucide-react';
import { QueueList } from '../queue/QueueList';
import { DownloadJobCard } from '../downloader/DownloadJobCard';
import { DownloadTerminal } from '../downloader/DownloadTerminal';
import { IconButton, Tip } from '../ui/IconButton';
import { Badge, Segmented } from '../ui/Segmented';
import { cn } from '../../lib/utils';
import { SOURCE_LABEL, artworkBackground } from '../../lib/mockData';
import type { MediaItem, RightPanelTab } from '../../types';
import type { DownloaderController } from '../../hooks/useDownloader';

interface Props {
  tab: RightPanelTab;
  onTab: (tab: RightPanelTab) => void;
  queue: MediaItem[];
  current: MediaItem | undefined;
  currentId: string | undefined;
  next: MediaItem | undefined;
  nextReason: string;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onShuffle: () => void;
  shuffle: boolean;
  downloads: DownloaderController;
  onOpenDownloader: () => void;
  onToast: (title: string, message?: string) => void;
  className?: string;
}

const TAURI_MAP = [
  { ui: 'Frameless window shell', api: 'WebviewWindowBuilder::decorations(false)' },
  { ui: 'Traffic lights', api: 'getCurrentWindow().close() / .minimize() / .toggleMaximize()' },
  { ui: 'Frosted glass backdrop', api: 'window-vibrancy · apply_acrylic / apply_mica (Windows)' },
  { ui: 'Video surface', api: 'mpv --wid=<hwnd> (JSON IPC) or libmpv via tauri-plugin-mpv' },
  { ui: 'Auto-Next engine', api: 'Rust task listening for the mpv `end-file` IPC event' },
  { ui: 'URL resolution', api: 'Command::new("yt-dlp").args(["-J", url]) → manifest' },
  { ui: 'Downloader', api: 'tauri-plugin-shell spawn + stdout streamed through events' },
];

export function InspectorSidebar({
  tab,
  onTab,
  queue,
  current,
  currentId,
  next,
  nextReason,
  onSelect,
  onRemove,
  onMove,
  onShuffle,
  shuffle,
  downloads,
  onOpenDownloader,
  onToast,
  className,
}: Props) {
  return (
    <aside
      className={cn(
        'hidden w-[330px] shrink-0 flex-col border-l border-white/6 bg-black/20 lg:flex xl:w-[352px]',
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-white/6 px-3 py-2.5">
        <Segmented
          value={tab}
          onChange={onTab}
          options={[
            { value: 'queue', label: 'Queue', icon: <ListVideo className="h-3 w-3" /> },
            { value: 'downloads', label: 'DLs', icon: <Download className="h-3 w-3" /> },
            { value: 'info', label: 'Info', icon: <Info className="h-3 w-3" /> },
          ]}
        />
        {tab === 'queue' && (
          <Tip label={shuffle ? 'Un-shuffle' : 'Shuffle queue'}>
            <IconButton
              size="sm"
              variant="ghost"
              round
              active={shuffle}
              onClick={onShuffle}
              aria-label="Shuffle queue"
              className="ml-auto"
              icon={<Shuffle className="h-3.5 w-3.5" />}
            />
          </Tip>
        )}
        {tab === 'downloads' && (
          <IconButton
            size="sm"
            variant="glass"
            className="ml-auto"
            onClick={onOpenDownloader}
            icon={<Download className="h-3 w-3" />}
          >
            new
          </IconButton>
        )}
      </div>

      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto p-3">
        {tab === 'queue' && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-teal-400/20 bg-teal-400/6 p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] text-teal-300 uppercase">
                <Zap className="h-3 w-3" /> up next · {nextReason}
              </p>
              {next ? (
                <div className="mt-2 flex items-center gap-2.5">
                  <span
                    className="grid h-11 w-18 shrink-0 place-items-center rounded-xl ring-1 ring-white/10"
                    style={{ background: artworkBackground(next.accent) }}
                  >
                    <span className="font-mono text-[9.5px] text-white/80">
                      {next.kind === 'youtube' ? 'YT' : `E${String(next.episodeNumber).padStart(2, '0')}`}
                    </span>
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-ink-100">{next.title}</p>
                    <p className="truncate font-mono text-[10px] text-ink-400">{next.subtitle}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-1.5 text-[11.5px] text-ink-400">
                  Nothing queued. Resolve a URL or add something from the library.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between px-1">
              <p className="text-[10.5px] font-semibold tracking-[0.16em] text-ink-400 uppercase">
                queue · {queue.length}
              </p>
              <span className="font-mono text-[10px] text-ink-600">
                {queue.reduce((total, item) => total + item.duration, 0)}s total
              </span>
            </div>

            <QueueList
              items={queue}
              currentId={currentId}
              onSelect={onSelect}
              onRemove={onRemove}
              onMove={onMove}
            />
          </div>
        )}

        {tab === 'downloads' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-[10.5px] font-semibold tracking-[0.16em] text-ink-400 uppercase">
                jobs · {downloads.jobs.length}
              </p>
              {downloads.completedCount > 0 && (
                <button
                  type="button"
                  onClick={downloads.clearCompleted}
                  className="flex items-center gap-1 text-[10.5px] text-ink-400 transition-colors hover:text-danger-400"
                >
                  <Trash2 className="h-3 w-3" /> clear
                </button>
              )}
            </div>

            {downloads.jobs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-4 text-center">
                <p className="text-[12px] text-ink-300">No downloads yet</p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
                  The downloader paints a mock yt-dlp worker so you can review the flow before the shell lands.
                </p>
                <IconButton
                  size="sm"
                  variant="glass"
                  className="mt-3"
                  icon={<Download className="h-3 w-3" />}
                  onClick={onOpenDownloader}
                >
                  Open downloader
                </IconButton>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {downloads.jobs.map((job) => (
                    <DownloadJobCard key={job.id} job={job} compact onCancel={downloads.cancel} onRetry={downloads.retry} />
                  ))}
                </div>
                <DownloadTerminal job={downloads.jobs[0]} maxHeight={180} />
              </>
            )}
          </div>
        )}

        {tab === 'info' && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl border border-white/8">
              <div
                className="grid h-24 place-items-center"
                style={{ background: artworkBackground(current?.accent ?? '#7c8cff') }}
              >
                <div className="text-center">
                  <p className="text-[13px] font-semibold text-white drop-shadow">{current?.title ?? '—'}</p>
                  <p className="mt-0.5 font-mono text-[10.5px] text-white/70">{current?.resolution ?? ''}</p>
                </div>
              </div>
              <dl className="divide-y divide-white/6 text-[11.5px]">
                {[
                  ['Title', current?.title ?? '—'],
                  ['Series / channel', current?.seriesTitle ?? '—'],
                  ['Kind', current ? SOURCE_LABEL[current.kind] : '—'],
                  ['Quality', current?.quality ?? '—'],
                  ['Duration', current ? `${current.duration}s` : '—'],
                ].map(([key, value]) => (
                  <div key={key} className="flex items-start gap-3 px-3 py-2">
                    <dt className="w-24 shrink-0 text-ink-500">{key}</dt>
                    <dd className="min-w-0 flex-1 truncate text-ink-100">{value}</dd>
                  </div>
                ))}
                <div className="flex items-start gap-3 px-3 py-2">
                  <dt className="w-24 shrink-0 text-ink-500">Source</dt>
                  <dd className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <Link2 className="h-3 w-3 shrink-0 text-ink-500" />
                      <span className="truncate font-mono text-[10.5px] text-accent-300">{current?.sourceUrl}</span>
                    </span>
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-1.5 border-t border-white/6 px-3 py-2.5">
                {(current?.tags ?? []).map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onToast('Opened externally', 'Would hand the URL to the system browser.')}
              className="flex w-full items-center gap-2 rounded-2xl border border-white/8 bg-white/3 px-3 py-2.5 text-left text-[12px] text-ink-200 transition-colors hover:border-white/16 hover:bg-white/6"
            >
              <ExternalLink className="h-3.5 w-3.5 text-ink-400" />
              Open source in browser
            </button>

            <div className="rounded-2xl border border-white/8 bg-white/3 p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] text-ink-400 uppercase">
                <Cpu className="h-3 w-3" /> tauri 2.0 mapping
              </p>
              <ul className="mt-2 space-y-1.5">
                {TAURI_MAP.map((row) => (
                  <li key={row.ui} className="text-[11px] leading-snug">
                    <span className="text-ink-200">{row.ui}</span>
                    <span className="mt-0.5 block font-mono text-[10px] break-all text-teal-300/80">{row.api}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 text-[10.5px] leading-relaxed text-ink-500">
                Everything above is mocked in-browser today; the React layer talks to it through the same shapes,
                so only the transport changes.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
