/*
  GET /api/play.json —— Play 分流的 mock 端點。
  靜態站（output: static）下預渲染為靜態 JSON 檔；未來由真實 Go 後端在同路徑（或
  改前端 fetch 目標）提供同形狀回應即可替換。契約見 `src/lib/play.ts`。
*/
import type { APIRoute } from "astro";
import { MOCK_PLAY } from "@/lib/play";

export const prerender = true;

export const GET: APIRoute = () =>
  new Response(JSON.stringify(MOCK_PLAY), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
