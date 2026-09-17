import { useCallback, useMemo, useState } from 'react';
import { LIBRARY } from '../lib/mockData';
import { resolveMediaUrl, toMediaItem } from '../lib/urlResolver';
import type { MediaItem, RepeatMode } from '../types';

export interface ResolveRequest {
  url: string;
  /** `now` jumps straight to the item, `queue` appends it to the end. */
  intent: 'now' | 'queue';
}

/**
 * Owns the play queue: which items exist, which one is selected and what is
 * coming next. Playback itself lives in `usePlayer`.
 */
export function useMediaLibrary() {
  const [queue, setQueue] = useState<MediaItem[]>(() => LIBRARY.slice(0, 3));
  const [currentId, setCurrentId] = useState<string>(LIBRARY[0].id);
  const [repeat, setRepeat] = useState<RepeatMode>('all');
  const [shuffle, setShuffle] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const currentIndex = Math.max(
    0,
    queue.findIndex((item) => item.id === currentId),
  );
  const current = queue[currentIndex];
  const next = queue[currentIndex + 1];

  const select = useCallback((id: string) => setCurrentId(id), []);

  const playNow = useCallback((item: MediaItem) => {
    setQueue((existing) => {
      const withoutItem = existing.filter((entry) => entry.id !== item.id);
      return [item, ...withoutItem];
    });
    setCurrentId(item.id);
  }, []);

  const enqueue = useCallback((item: MediaItem) => {
    setQueue((existing) =>
      existing.some((entry) => entry.id === item.id) ? existing : [...existing, item],
    );
  }, []);

  const remove = useCallback(
    (id: string) => {
      setQueue((existing) => {
        if (existing.length <= 1) return existing;
        const index = existing.findIndex((entry) => entry.id === id);
        const filtered = existing.filter((entry) => entry.id !== id);
        if (id === currentId) {
          const fallback = filtered[Math.min(index, filtered.length - 1)];
          setCurrentId(fallback.id);
        }
        return filtered;
      });
    },
    [currentId],
  );

  const move = useCallback((id: string, direction: -1 | 1) => {
    setQueue((existing) => {
      const index = existing.findIndex((entry) => entry.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= existing.length) return existing;
      const copy = [...existing];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }, []);

  const shuffleQueue = useCallback(() => {
    setShuffle((value) => !value);
    setQueue((existing) => {
      const rest = existing.filter((entry) => entry.id !== currentId);
      for (let i = rest.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      const active = existing.find((entry) => entry.id === currentId);
      return active ? [active, ...rest] : rest;
    });
  }, [currentId]);

  /**
   * The simulated URL resolution used by both the "Open URL" field and the
   * downloader's "play while downloading" action. ~1.1s of fake extractor
   * latency so the UI can show its resolving trace.
   */
  const openUrl = useCallback(
    async (url: string, intent: 'now' | 'queue' = 'now'): Promise<MediaItem> => {
      setPendingUrl(url);
      const source = resolveMediaUrl(url);
      const latency = 900 + (url.length % 5) * 90;
      await new Promise((resolve) => window.setTimeout(resolve, latency));
      const item = toMediaItem(source);
      setPendingUrl(null);
      if (intent === 'now') playNow(item);
      else enqueue(item);
      return item;
    },
    [enqueue, playNow],
  );

  const resetQueue = useCallback(() => {
    setQueue(LIBRARY.slice(0, 3));
    setCurrentId(LIBRARY[0].id);
  }, []);

  return useMemo(
    () => ({
      queue,
      current,
      currentId,
      currentIndex,
      next,
      repeat,
      shuffle,
      pendingUrl,
      library: LIBRARY,
      setRepeat,
      shuffleQueue,
      select,
      playNow,
      enqueue,
      remove,
      move,
      openUrl,
      resetQueue,
      setQueue,
      setCurrentId,
    }),
    [
      queue,
      current,
      currentId,
      currentIndex,
      next,
      repeat,
      shuffle,
      pendingUrl,
      shuffleQueue,
      select,
      playNow,
      enqueue,
      remove,
      move,
      openUrl,
      resetQueue,
    ],
  );
}

export type MediaLibraryController = ReturnType<typeof useMediaLibrary>;
