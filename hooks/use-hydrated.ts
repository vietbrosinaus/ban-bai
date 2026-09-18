"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => undefined;

export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}

export function useStoredValue(key: string) {
  const subscribe = (onChange: () => void) => {
    window.addEventListener("storage", onChange);
    return () => window.removeEventListener("storage", onChange);
  };
  return useSyncExternalStore(subscribe, () => window.localStorage.getItem(key) ?? "", () => "");
}
