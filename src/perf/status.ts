/**
 * Tiny external store for what PerfNotice shows (kept out of the lead-owned zustand store, whose shape is frozen).
 * reason: why the cheap path is active. dismissed is remembered for the browser session.
 */
import { useSyncExternalStore } from 'react';

export type PerfReason = 'software' | 'slow' | null;

interface Status {
  reason: PerfReason;
  dismissed: boolean;
}

const KEY = 'wor-perf-notice-dismissed';

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

let status: Status = { reason: null, dismissed: readDismissed() };
const listeners = new Set<() => void>();

function set(next: Status) {
  status = next;
  listeners.forEach((l) => l());
}

export function setPerfReason(reason: PerfReason) {
  if (status.reason !== reason) set({ ...status, reason });
}

export function dismissPerfNotice() {
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    /* private mode: dismissal lasts until reload */
  }
  set({ ...status, dismissed: true });
}

export function usePerfStatus(): Status {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => status,
  );
}
