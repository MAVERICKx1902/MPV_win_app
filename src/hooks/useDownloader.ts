import { useCallback, useEffect, useRef, useState } from 'react';
import { advanceDownload, createDownloadJob } from '../lib/downloader';
import type { DownloadJob, DownloadRequest, QualityLabel } from '../types';

const TICK_MS = 220;

/**
 * Drives the dummy `yt-dlp` jobs. A single interval advances every running job
 * so progress bars, ETAs and the terminal all stay in sync.
 */
export function useDownloader() {
  const [jobs, setJobs] = useState<DownloadJob[]>([]);
  const runningIds = jobs.some((job) => job.status === 'downloading' || job.status === 'resolving');
  const tickRef = useRef(TICK_MS / 1000);

  useEffect(() => {
    if (!runningIds) return;
    const interval = window.setInterval(() => {
      setJobs((current) => current.map((job) => advanceDownload(job, tickRef.current)));
    }, TICK_MS);
    return () => window.clearInterval(interval);
  }, [runningIds]);

  const start = useCallback((request: DownloadRequest) => {
    const job = createDownloadJob(request);
    setJobs((current) => [job, ...current]);
    return job;
  }, []);

  const cancel = useCallback((id: string) => {
    setJobs((current) => current.filter((job) => job.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setJobs((current) => current.filter((job) => job.status !== 'complete'));
  }, []);

  const retry = useCallback((job: DownloadJob) => {
    setJobs((current) => [createDownloadJob({ url: job.url, format: job.format, quality: job.quality }), ...current]);
  }, []);

  const activeCount = jobs.filter((job) => job.status === 'downloading' || job.status === 'resolving').length;
  const completedCount = jobs.filter((job) => job.status === 'complete').length;
  const queuedBytes = jobs
    .filter((job) => job.status !== 'complete')
    .reduce((total, job) => total + job.sizeMb * (1 - job.progress), 0);

  const state: {
    jobs: DownloadJob[];
    activeCount: number;
    completedCount: number;
    queuedBytes: number;
    start: (request: DownloadRequest) => DownloadJob;
    cancel: (id: string) => void;
    retry: (job: DownloadJob) => void;
    clearCompleted: () => void;
  } = {
    jobs,
    activeCount,
    completedCount,
    queuedBytes,
    start,
    cancel,
    retry,
    clearCompleted,
  };

  return state;
}

export type DownloaderController = ReturnType<typeof useDownloader>;

/** Convenience helper so panels can render a default quality for a format. */
export const DEFAULT_VIDEO_QUALITY: QualityLabel = '1080p';
