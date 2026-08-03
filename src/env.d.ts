/// <reference types="astro/client" />

/*
  建置期注入的公開環境變數（`PUBLIC_` 前綴才會進到 client bundle）。
  值與說明見倉庫根的 `.env.example`。
*/
interface ImportMetaEnv {
  /**
   * hoshi-svc 公開資料平面的來源網域（如 `https://svc.hoshivel.com`）。
   * 未設定時採 `src/lib/play.ts` 的預設值。
   */
  readonly PUBLIC_HOSHI_SVC_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
