/// <reference types="astro/client" />

/*
  Public environment variables injected at build time (only a `PUBLIC_` prefix
  reaches the client bundle).
  Values and explanations live in `.env.example` at the repository root.
*/
interface ImportMetaEnv {
  /**
   * Origin of hoshi-svc's public data plane (e.g. `https://svc.hoshivel.com`).
   * When unset, the default in `src/lib/play.ts` applies.
   */
  readonly PUBLIC_HOSHI_SVC_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
