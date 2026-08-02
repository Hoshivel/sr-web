/// <reference types="astro/client" />

/*
  建置期注入的公開環境變數（`PUBLIC_` 前綴才會進到 client bundle）。
  值與說明見倉庫根的 `.env.example`。
*/
interface ImportMetaEnv {
  /**
   * 分流 API 的來源網域（如 `https://api.hoshivel.com`）。
   * 未設定時採 `src/lib/play.ts` 的預設值；設為空字串＝同源呼叫。
   */
  readonly PUBLIC_SR_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
