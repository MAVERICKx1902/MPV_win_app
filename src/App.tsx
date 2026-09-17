import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGrid, ListVideo, PlayCircle, RotateCcw, Sparkles } from 'lucide-react';
import { TitleBar, ToastStack } from './components/shell/TitleBar';
import { StatusBar } from './components/shell/StatusBar';
import { UrlBar } from './components/shell/UrlBar';
import { InspectorSidebar } from './components/shell/InspectorSidebar';
import { CommandPalette } from './components/shell/CommandPalette';
import { MobileNav } from './components/shell/MobileNav';
import { VideoStage } from './components/player/VideoStage';
import { DownloaderPanel } from './components/downloader/DownloaderPanel';
import { DownloadForm } from './components/downloader/DownloadForm';
import { DownloadJobCard } from './components/downloader/DownloadJobCard';
import { DownloadTerminal } from './components/downloader/DownloadTerminal';
import { LibraryGrid, LibraryRail } from './components/library/LibraryRail';
import { QueueList } from './components/queue/QueueList';
import { IconButton } from './components/ui/IconButton';
import { Badge } from './components/ui/Segmented';
import { useDownloader } from './hooks/useDownloader';
import { useHotkeys } from './hooks/useHotkeys';
import { useMediaLibrary } from './hooks/useMediaLibrary';
import { usePlayer } from './hooks/usePlayer';
import { useToasts } from './hooks/useToasts';
import { autoNextReason } from './lib/urlResolver';
import { cn } from './lib/utils';
import type { DownloadRequest, MediaItem, MobileTab, RightPanelTab, Toast } from './types';

const SHORTCUT_HINT =
  'Space/K play · ←/→ seek 10s · ↑/↓ volume · N next · P previous · F cinema · M mute · S stats · Y auto-next · D downloader · Q queue · I info · ⌘K palette';

export default function App() {
  /* ---------------------------------------------------------------- *
   *  Controllers
   * ---------------------------------------------------------------- */
  const library = useMediaLibrary();
  const downloads = useDownloader();
  const { toasts, push: pushToastRaw, dismiss } = useToasts();

  const [rightTab, setRightTab] = useState<RightPanelTab>('queue');
  const [mobileTab, setMobileTab] = useState<MobileTab>('player');
  const [downloaderOpen, setDownloaderOpen] = useState(false);
  const [focusJobId, setFocusJobId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [closed, setClosed] = useState(false);

  const pushToast = useCallback(
    (title: string, message?: string, tone: Toast['tone'] = 'info') => {
      pushToastRaw({ title, message, tone });
    },
    [pushToastRaw],
  );

  /* ---------------------------------------------------------------- *
   *  Queue sequencing — what Auto-Next and the ⏭ button actually do
   * ---------------------------------------------------------------- */
  const advance = useCallback((): MediaItem | undefined => {
    const { queue, currentId, repeat, setCurrentId } = library;
    const index = queue.findIndex((item) => item.id === currentId);
    const upcoming = queue[index + 1];
    if (upcoming) {
      setCurrentId(upcoming.id);
      return upcoming;
    }
    if (repeat !== 'off' && queue[0]) {
      setCurrentId(queue[0].id);
      return queue[0];
    }
    return undefined;
  }, [library]);

  const previous = useCallback(() => {
    const { queue, currentId, setCurrentId } = library;
    const index = queue.findIndex((item) => item.id === currentId);
    const target = index > 0 ? queue[index - 1] : queue[queue.length - 1];
    if (target) setCurrentId(target.id);
  }, [library]);

  const onError = useCallback(
    (message: string) => pushToast('Playback notice', message, 'warn'),
    [pushToast],
  );

  const onAutoNextScheduled = useCallback(
    (target: MediaItem) => {
      pushToast('Auto-Next engaged', `Resolving “${target.title}” from ${target.sourceUrl}`, 'info');
    },
    [pushToast],
  );

  const player = usePlayer({
    current: library.current,
    next: library.next,
    repeat: library.repeat,
    onAdvance: advance,
    onPrevious: previous,
    onError,
    onAutoNextScheduled,
  });

  const { state: playerState, actions } = player;

  /** ⏭ / `N`: resolve the next queue entry, wrapping when repeat is on. */
  const goNext = useCallback(() => {
    if (library.next) {
      actions.skipNext();
      return;
    }
    const wrapped = advance();
    if (!wrapped) pushToast('Queue finished', 'Nothing left to auto-play — add a URL or replay this item.', 'warn');
  }, [actions, advance, library.next, pushToast]);


  /* ---------------------------------------------------------------- *
   *  Actions
   * ---------------------------------------------------------------- */
  const openUrl = useCallback(
    async (url: string, intent: 'now' | 'queue' = 'now') => {
      const item = await library.openUrl(url, intent);
      pushToast(
        intent === 'now' ? 'Now playing' : 'Added to queue',
        `${item.title} · ${item.quality}`,
        'success',
      );
      setMobileTab('player');
    },
    [library, pushToast],
  );

  const openDownloader = useCallback((jobId?: string) => {
    setFocusJobId(jobId ?? null);
    setDownloaderOpen(true);
    setRightTab('downloads');
  }, []);

  const startDownload = useCallback(
    (request: DownloadRequest) => {
      const job = downloads.start(request);
      setFocusJobId(job.id);
      pushToast('Download started', `yt-dlp is fetching “${job.title}”`, 'info');
      return job;
    },
    [downloads, pushToast],
  );

  const cycleRepeat = useCallback(() => {
    library.setRepeat(library.repeat === 'off' ? 'all' : library.repeat === 'all' ? 'one' : 'off');
  }, [library]);

  /* ---------------------------------------------------------------- *
   *  Download completion notifications
   * ---------------------------------------------------------------- */
  const completedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    downloads.jobs.forEach((job) => {
      if (job.status === 'complete' && !completedRef.current.has(job.id)) {
        completedRef.current.add(job.id);
        pushToast('Download complete', `${job.title} → ${job.outputPath}`, 'success');
      }
    });
  }, [downloads.jobs, pushToast]);

  /**
   * The mobile pages live behind `MobileNav`. If the viewport grows past the
   * `lg` breakpoint (rotate, resize, desktop window) the inspector takes over,
   * so snap back to the player page to avoid an empty pane.
   */
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const sync = () => {
      if (query.matches) setMobileTab('player');
    };
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  /* ---------------------------------------------------------------- *
   *  Keyboard
   * ---------------------------------------------------------------- */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const hotkeys = useMemo(
    () => [
      { keys: [' ', 'k'], handler: () => actions.toggle() },
      { keys: ['arrowright', 'l'], handler: () => actions.seekBy(10) },
      { keys: ['arrowleft', 'j'], handler: () => actions.seekBy(-10) },
      {
        keys: ['arrowup'],
        handler: () => actions.setVolume(Math.min(1, playerState.volume + 0.05)),
      },
      {
        keys: ['arrowdown'],
        handler: () => actions.setVolume(Math.max(0, playerState.volume - 0.05)),
      },
      { keys: ['n'], handler: () => goNext() },
      { keys: ['p'], handler: () => actions.skipPrevious() },
      { keys: ['f'], handler: () => actions.toggleCinema() },
      { keys: ['m'], handler: () => actions.toggleMute() },
      { keys: ['s'], handler: () => actions.toggleStats() },
      { keys: ['c'], handler: () => actions.toggleSubtitles() },
      {
        keys: ['y'],
        handler: () => {
          const next = !playerState.autoNextEnabled;
          actions.setAutoNextEnabled(next);
          pushToast('Auto-Next', next ? 'Engine armed' : 'Engine paused', next ? 'success' : 'warn');
        },
      },
      { keys: ['d'], handler: () => openDownloader() },
      { keys: ['q'], handler: () => setRightTab('queue') },
      { keys: ['i'], handler: () => setRightTab('info') },
      { keys: ['?', '/'], handler: () => pushToast('Keyboard shortcuts', SHORTCUT_HINT) },
      {
        keys: ['escape'],
        handler: () => {
          setPaletteOpen(false);
          setDownloaderOpen(false);
        },
      },
    ],
    [
      actions,
      goNext,
      openDownloader,
      playerState.autoNextEnabled,
      playerState.volume,
      pushToast,
    ],
  );

  useHotkeys(hotkeys);

  /* ---------------------------------------------------------------- *
   *  Derived
   * ---------------------------------------------------------------- */
  const nextReason = autoNextReason(library.current, library.next);
  const queueSeconds = library.queue.reduce((total, item) => total + item.duration, 0);

  const paletteAction = useCallback(
    (id: string) => {
      switch (id) {
        case 'toggle':
          actions.toggle();
          break;
        case 'next':
          goNext();
          break;
        case 'cinema':
          actions.toggleCinema();
          break;
        case 'stats':
          actions.toggleStats();
          break;
        case 'autonext':
          actions.setAutoNextEnabled(!playerState.autoNextEnabled);
          break;
        case 'downloads':
          openDownloader();
          break;
        case 'queue':
          setRightTab('queue');
          break;
        case 'reset':
          library.resetQueue();
          pushToast('Queue rebuilt', 'Three episodes re-queued.', 'success');
          break;
        case 'shortcuts':
          pushToast('Keyboard shortcuts', SHORTCUT_HINT);
          break;
        default:
          break;
      }
    },
    [actions, goNext, library, openDownloader, playerState.autoNextEnabled, pushToast],
  );

  /* ---------------------------------------------------------------- *
   *  Closed / minimised "app" states
   * ---------------------------------------------------------------- */
  if (closed) {
    return (
      <div className="grid h-full place-items-center p-6">
        <div className="animate-rise glass w-[min(360px,100%)] rounded-3xl p-8 text-center shadow-window">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-linear-to-br from-accent-400 to-teal-400 text-ink-950">
            <PlayCircle className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-[15px] font-semibold text-ink-100">MPV Studio closed</h1>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-400">
            In the Tauri build the window would animate out of the dock and the mpv process would exit with it.
          </p>
          <IconButton variant="solid" size="lg" className="mt-5 w-full" onClick={() => setClosed(false)} icon={<RotateCcw className="h-4 w-4" />}>
            Reopen window
          </IconButton>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 w-full justify-center p-0 sm:items-center sm:p-4 lg:p-6">
      {/* desktop wallpaper hint */}
      <div className="pointer-events-none absolute inset-x-0 bottom-2 hidden justify-center lg:flex">
        <p className="font-mono text-[10.5px] text-white/25">
          web preview · tauri 2.0 shell (windows + android) pending · mpv core mocked
        </p>
      </div>

      <div
        className={cn(
          'glass sheen-top relative flex h-full w-full max-w-[1600px] flex-col overflow-hidden shadow-window transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
          'sm:h-[min(94vh,1000px)] sm:rounded-[var(--radius-window)]',
          minimized && 'pointer-events-none translate-y-[110%] scale-[0.92] opacity-0 blur-md',
        )}
      >
        <TitleBar
          item={library.current}
          resolvingUrl={library.pendingUrl}
          downloadsActive={downloads.activeCount}
          autoNextEnabled={playerState.autoNextEnabled}
          cinema={playerState.cinema}
          statsVisible={playerState.showStats}
          rightTab={rightTab}
          onClose={() => setClosed(true)}
          onMinimize={() => setMinimized(true)}
          onZoom={actions.toggleCinema}
          onToggleAutoNext={(value) => {
            actions.setAutoNextEnabled(value);
            pushToast('Auto-Next', value ? 'Engine armed' : 'Engine paused', value ? 'success' : 'warn');
          }}
          onToggleStats={actions.toggleStats}
          onToggleCinema={actions.toggleCinema}
          onOpenDownloads={() => openDownloader()}
          onOpenPalette={() => setPaletteOpen(true)}
          onRightTab={setRightTab}
          onResetQueue={library.resetQueue}
          onToast={(title, message) => pushToast(title, message)}
        />

        {minimized && (
          <div className="absolute inset-0 z-40 grid place-items-center">
            <IconButton variant="glass" size="lg" onClick={() => setMinimized(false)} icon={<Sparkles className="h-4 w-4" />}>
              Restore window
            </IconButton>
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          {/* ------------------------------ main ------------------------------ */}
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            {mobileTab === 'player' && (
              <div
                className={cn(
                  'scroll-slim min-h-0 flex-1 overflow-y-auto',
                  playerState.cinema ? 'flex flex-col p-0' : 'space-y-3.5 p-3 sm:p-4',
                )}
              >
                <VideoStage
                  item={library.current}
                  next={library.next}
                  nextReason={nextReason}
                  player={player}
                  repeat={library.repeat}
                  shuffle={library.shuffle}
                  cinema={playerState.cinema}
                  onRequestNext={goNext}
                  canSkipNext={Boolean(library.next) || library.repeat !== 'off'}
                  onCycleRepeat={cycleRepeat}
                  onToggleShuffle={library.shuffleQueue}
                  onToggleFullscreen={actions.toggleCinema}
                  onOpenQueue={() => setRightTab('queue')}
                  onOpenDownloads={() => openDownloader()}
                  onOpenInfo={() => setRightTab('info')}
                />

                {!playerState.cinema && (
                  <>
                    <UrlBar resolvingUrl={library.pendingUrl} onOpen={openUrl} />
                    <div className="hidden sm:block">
                      <LibraryRail
                        items={library.library}
                        currentId={library.currentId}
                        onPlay={library.playNow}
                        onOpenUrl={() => setPaletteOpen(true)}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {mobileTab === 'library' && (
              <div className="scroll-slim min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 lg:hidden">
                <div className="mb-3 flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-ink-400" />
                  <h2 className="text-[13px] font-semibold text-ink-100">Your library</h2>
                  <Badge tone="neutral" className="ml-auto">
                    {library.library.length} items
                  </Badge>
                </div>
                <LibraryGrid items={library.library} currentId={library.currentId} onPlay={library.playNow} />
              </div>
            )}

            {mobileTab === 'queue' && (
              <div className="scroll-slim min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4 lg:hidden">
                <div className="flex items-center gap-2">
                  <ListVideo className="h-4 w-4 text-ink-400" />
                  <h2 className="text-[13px] font-semibold text-ink-100">Play queue</h2>
                  <span className="font-mono text-[10.5px] text-ink-500">{queueSeconds}s total</span>
                  <IconButton size="sm" variant="glass" className="ml-auto" onClick={library.shuffleQueue}>
                    shuffle
                  </IconButton>
                </div>
                <QueueList
                  items={library.queue}
                  currentId={library.currentId}
                  onSelect={(id) => {
                    library.select(id);
                    setMobileTab('player');
                  }}
                  onRemove={library.remove}
                  onMove={library.move}
                />
              </div>
            )}

            {mobileTab === 'downloads' && (
              <div className="scroll-slim min-h-0 flex-1 space-y-3.5 overflow-y-auto p-3 sm:p-4 lg:hidden">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-ink-400" />
                  <h2 className="text-[13px] font-semibold text-ink-100">Grabber</h2>
                  <Badge tone="warn" className="ml-auto normal-case">
                    mocked yt-dlp
                  </Badge>
                </div>
                <DownloadForm onStart={startDownload} />
                {downloads.jobs.length > 0 && (
                  <div className="space-y-2.5">
                    <p className="px-1 text-[10.5px] font-semibold tracking-[0.16em] text-ink-400 uppercase">
                      jobs · {downloads.jobs.length}
                    </p>
                    {downloads.jobs.map((job) => (
                      <DownloadJobCard
                        key={job.id}
                        job={job}
                        onCancel={downloads.cancel}
                        onRetry={downloads.retry}
                      />
                    ))}
                    <DownloadTerminal job={downloads.jobs[0]} maxHeight={200} />
                  </div>
                )}
              </div>
            )}
          </main>

          {/* --------------------------- inspector --------------------------- */}
          {!playerState.cinema && (
            <InspectorSidebar
              tab={rightTab}
              onTab={setRightTab}
              queue={library.queue}
              current={library.current}
              currentId={library.currentId}
              next={library.next}
              nextReason={nextReason}
              onSelect={library.select}
              onRemove={library.remove}
              onMove={library.move}
              onShuffle={library.shuffleQueue}
              shuffle={library.shuffle}
              downloads={downloads}
              onOpenDownloader={() => openDownloader()}
              onToast={(title, message) => pushToast(title, message)}
            />
          )}
        </div>

        <StatusBar
          item={library.current}
          autoNextEnabled={playerState.autoNextEnabled}
          autoNextSeconds={playerState.autoNextSeconds}
          downloadsActive={downloads.activeCount}
          statsVisible={playerState.showStats}
          onToggleStats={actions.toggleStats}
        />

        <MobileNav
          tab={mobileTab}
          onTab={setMobileTab}
          downloadCount={downloads.activeCount}
          queueCount={library.queue.length}
        />

        {/* ---------------------------- overlays ---------------------------- */}
        <ToastStack toasts={toasts} onDismiss={dismiss} className="top-14 right-4" />

        {downloaderOpen && (
          <DownloaderPanel
          onClose={() => {
            setDownloaderOpen(false);
            setFocusJobId(null);
          }}
          downloads={downloads}
          focusJobId={focusJobId}
          onPlayInPlayer={(url) => {
            void openUrl(url, 'now');
            setDownloaderOpen(false);
          }}
          onToast={(title, message) => pushToast(title, message)}
          />
        )}

        {paletteOpen && (
          <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onPlay={(item) => {
            library.playNow(item);
            setMobileTab('player');
          }}
          onAction={paletteAction}
          />
        )}
      </div>
    </div>
  );
}
