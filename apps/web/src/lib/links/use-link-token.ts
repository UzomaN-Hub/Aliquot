"use client";

import { useSyncExternalStore } from "react";

// Invite and reset links carry their token in the URL #fragment, which browsers never
// send to a server (decision 015). Pages read it here and post it in a request body.
function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}
const readHash = () => window.location.hash;
const noHash = () => "";

/** The `#token=` of the current address, or null (also null on the server). */
export function useLinkToken(): string | null {
  const hash = useSyncExternalStore(subscribe, readHash, noHash);
  return new URLSearchParams(hash.replace(/^#/, "")).get("token");
}

/** Once a link is spent, take it out of the address bar and the history. */
export function forgetLink(): void {
  window.history.replaceState(null, "", window.location.pathname);
}
