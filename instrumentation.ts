export async function register() {
  if (typeof window === 'undefined') {
    // Node.js 22+ exposes globalThis.localStorage but it throws on access without
    // --localstorage-file. Patch it to a noop so @supabase/auth-js falls back to
    // its memory storage adapter on the server side.
    const noop = {
      getItem: (_k: string) => null,
      setItem: (_k: string, _v: string) => {},
      removeItem: (_k: string) => {},
      clear: () => {},
      key: (_i: number) => null,
      length: 0,
    }
    ;(globalThis as Record<string, unknown>).localStorage = noop
    ;(globalThis as Record<string, unknown>).sessionStorage = noop
  }
}
