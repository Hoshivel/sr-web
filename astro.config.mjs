// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// 碎界 sr-web —— 靜態優先的旗艦官網。
// output 預設為 'static'：把效能預算留給動效（Pixi / GSAP island 才注水），
// 也讓官網能以**純靜態**方式部署（無 Node 執行期、無反向代理）。
// 部署目標：sr.hoshivel.com；遊戲節點：play.sr.hoshivel.com；
// 服務路由走 hoshi-svc 獨立網域（見 src/lib/play.ts 的 PUBLIC_HOSHI_SVC_BASE）。
export default defineConfig({
  site: "https://sr.hoshivel.com",
  integrations: [react()],
  build: {
    // 內聯小型樣式，減少首屏請求；動效相關的大型 island 由 Vite 自動分包。
    inlineStylesheets: "auto",
  },
  vite: {
    build: {
      // Pixi / GSAP 走各自的 chunk，靠 client:visible 延遲載入。
      cssCodeSplit: true,
    },
  },
});
