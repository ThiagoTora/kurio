import { useSyncExternalStore } from "react";

// conexão
let connected = false;
const connListeners = new Set<() => void>();

export function setSocketConnected(v: boolean) {
  document.documentElement.dataset.socket = v ? "connected" : "disconnected";
  if (connected === v) return;
  connected = v;
  connListeners.forEach((l) => l());
}
export const useSocketConnected = () =>
  useSyncExternalStore(
    (cb) => {
      connListeners.add(cb);
      return () => connListeners.delete(cb);
    },
    () => connected,
  );

// avisos de alteração em tempo real
export interface Notice {
  id: number;
  text: string;
}

let notices: Notice[] = [];
let nextId = 1;
const noticeListeners = new Set<() => void>();
const emit = () => noticeListeners.forEach((l) => l());

export function pushNotice(text: string) {
  if (notices.some((n) => n.text === text)) return;
  notices = [...notices.slice(-2), { id: nextId++, text }];
  emit();
}
export function dismissNotice(id: number) {
  notices = notices.filter((n) => n.id !== id);
  emit();
}
export function clearNotices() {
  if (notices.length === 0) return;
  notices = [];
  emit();
}

export const useNotices = () =>
  useSyncExternalStore(
    (cb) => {
      noticeListeners.add(cb);
      return () => noticeListeners.delete(cb);
    },
    () => notices,
  );
