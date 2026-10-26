/** Persist form drafts across auth redirects (sessionStorage). */

const PREFIX = "diwan:auth-draft:";

export type AuthDraftEnvelope<T> = {
  data: T;
  resumeSubmit: boolean;
  savedAt: number;
};

export function saveAuthDraft<T>(key: string, data: T, resumeSubmit = true) {
  if (typeof window === "undefined") return;
  try {
    const envelope: AuthDraftEnvelope<T> = {
      data,
      resumeSubmit,
      savedAt: Date.now(),
    };
    window.sessionStorage.setItem(`${PREFIX}${key}`, JSON.stringify(envelope));
  } catch {
    /* quota / private mode */
  }
}

export function loadAuthDraft<T>(key: string): AuthDraftEnvelope<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`${PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthDraftEnvelope<T>;
    if (!parsed || typeof parsed !== "object" || !("data" in parsed)) return null;
    // Drop drafts older than 2 hours
    if (Date.now() - (parsed.savedAt ?? 0) > 2 * 60 * 60 * 1000) {
      clearAuthDraft(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearAuthDraft(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(`${PREFIX}${key}`);
  } catch {
    /* ignore */
  }
}

/** Peek resume flag without clearing; used to show a soft notice. */
export function peekAuthDraftResume(key: string): boolean {
  return Boolean(loadAuthDraft(key)?.resumeSubmit);
}
