/*
  GET /api/play.json —— Play 分流的**同源靜態後備**。
  官網為純靜態部署（output: static），此路徑於建置期預渲染成靜態 JSON 檔：當跨源分流
  後端（`PUBLIC_SR_API_BASE`）不可用時，前端退回讀這份檔案，仍能給出可用的遊戲入點。
  即時的探活 / 就近分流一律由後端提供，契約見 `src/lib/play.ts`。
*/
import type { APIRoute } from "astro";
import { FALLBACK_PLAY } from "@/lib/play";

export const prerender = true;

export const GET: APIRoute = () =>
  new Response(JSON.stringify(FALLBACK_PLAY), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
