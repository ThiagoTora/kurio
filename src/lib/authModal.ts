import { useSyncExternalStore } from "react";

export interface AuthModalState {
  open: boolean;
  mode: "login" | "signup";
  reason?: string;
  next?: string;
}

let state: AuthModalState = { open: false, mode: "login" };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function openAuthModal(p: Partial<Omit<AuthModalState, "open">> = {}) {
  state = {
    open: true,
    mode: p.mode ?? "login",
    reason: p.reason,
    next: p.next,
  };
  emit();
}
export function closeAuthModal() {
  if (!state.open) return;
  state = { ...state, open: false };
  emit();
}
export function setAuthMode(mode: "login" | "signup") {
  state = { ...state, mode };
  emit();
}

export function useAuthModal() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}
