// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// 碎界 sr-web —— 靜態優先的旗艦官網。
// output 預設為 'static'：把效能預算留給動效（Pixi / GSAP island 才注水）。
// 部署目標：sr.oha.li
export default defineConfig({
  site: "https://sr.oha.li",
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
