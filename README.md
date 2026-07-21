該專案是 sr ShatteredRealms 的網頁服務。
sr是一個架空世界觀的 2D 回合制策略遊戲。融合棋類策略、RPG 成長、MOBA 技能設計與開放世界探索。

這個專案做什麼？
它做： sr官網，介紹，play，about，API/SVC服務。

1. 靜態網頁，前端，官方網站主頁。 部署目地的： sr.oha.li
2. 官網介紹，管理遊戲入口，嵌入遊戲網頁。
3. 專案後端服務： 分流，探活，動態調整提供外部連接的遊戲服務鏈接。

具體來說：
遊戲服務器像是： hk1.svc.oha.li jp1.svc.oha.li 或者ip，其就是一個url。
這個後端測活，分流，負載均衡。 實時管理和提供。

前端官網訪問 -> 點擊play -> 請求後端服務 -> 提供一個可用的遊戲url -> 前端接收，嵌入顯示該url。

---

## 開發 / 冷接手

- **技術棧**：Astro + React islands（strict TS）、GSAP + ScrollTrigger + Lenis、Pixi.js。程序化動態即視覺識別。
- **權威計畫**：[`docs/plan.md`](./docs/plan.md)（完整實作計畫、網站結構、分階段里程碑、API 契約）。
- **會話日誌 / 進度**：[`sessions/`](./sessions/)（目標、待辦、`Editing` 狀態；沿用 ShatteredRealms 家族的 AGENTS.md 慣例）。

```bash
npm install      # 安裝相依
npm run dev      # 本地開發（Astro）
npm run build    # astro check && astro build（strict TS，驗收門檻）
npm run preview  # 預覽已建置的靜態站
```

目前進度：**Phase 3 捲動電影 + 碎裂區完成**（`npm run build` 綠燈）。已完成 Phase 1 品牌基元、Phase 2 Hero（Pixi 虛空＋Starfield 星座＋磁吸 CTA，已簽核）、Phase 3（Lenis 平滑捲動＋GSAP ScrollTrigger 框架；碎裂區「褪色」pin/scrub 溶解電影，招牌句「碎裂不是天罰，是天地最後一次自救」）。全站動效均 reduced-motion / 行動降級。**請以 `npm run dev` 目視 Hero 與碎裂區 scrub**。下一步 **Phase 4 玩法四合一 + 英雄卡**——見 `docs/plan.md`。