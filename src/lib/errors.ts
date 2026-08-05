// Supabase/Postgrest errors carry a stable `code` (e.g. 42501 for RLS
// denial) and often a `hint` with the actual fix — `.message` alone is
// frequently a generic sentence that doesn't say why something failed.
// Surfacing all of it in the UI turns "it just says X" bug reports into
// something actually diagnosable from a screenshot.
export function describeError(err: unknown): string {
  if (err && typeof err === 'object') {
    const anyErr = err as { message?: unknown; code?: unknown; hint?: unknown };
    const message = typeof anyErr.message === 'string' ? anyErr.message : null;
    if (message) {
      const code = typeof anyErr.code === 'string' ? anyErr.code : null;
      const hint = typeof anyErr.hint === 'string' && anyErr.hint ? anyErr.hint : null;
      return [message, code ? `(${code})` : null, hint].filter(Boolean).join(' ');
    }
  }
  return 'Something went wrong — please try again.';
}
