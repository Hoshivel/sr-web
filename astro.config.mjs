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
  // 本站在埠計畫裡的區塊是 26610-26619（遊戲範圍）。純靜態站不進
  // hoshi-deploy 的 inventory `nodes`，但 dev server 照樣和其他倉庫搶同一臺
  // 開發機上的號碼，所以號碼取自同一份計畫而不是 astro 的預設 4321。
  //
  // strictPort：撞到就失敗，不要滑到下一個空號。本站與 hoshivel-web 先前
  // 都停在 4321，症狀正是第二個被靜靜地搬到 4322——而 `hoshi dev` 宣告的是
  // 4321，於是它直接拒絕啟動。
  server: { port: 26610 },
  build: {
    // 內聯小型樣式，減少首屏請求；動效相關的大型 island 由 Vite 自動分包。
    inlineStylesheets: "auto",
  },
  vite: {
    // strictPort：撞到就失敗，不要滑到下一個空號（理由同上）。
    server: { strictPort: true },
    build: {
      // Pixi / GSAP 走各自的 chunk，靠 client:visible 延遲載入。
      cssCodeSplit: true,
    },
  },
});
