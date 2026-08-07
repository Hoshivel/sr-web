/*
  碎界 sr-web —— 預覽影片的來源設定（唯一設定點）。

  **影片不隨網站部署。** 官網產物是純靜態 HTML／JS／CSS，動輒上百 MB 的影片
  不該躺在 dist/ 裡：那會讓每次部署都重傳一次同樣的位元組，也把影片的快取週期
  綁死在網站的發版週期上。影片屬於物件儲存／媒體 CDN，本站只描述「去哪裡拿」。

  兩個旋鈕：
  - `PUBLIC_MEDIA_BASE`：外部存儲的來源位址（建置期環境變數，見 `.env.example`）。
  - `PREVIEW_CLIPS`：要播哪幾段、以什麼順序播。

  `src` 可以是**絕對 URL**（直接使用，允許各段散在不同主機），
  或**相對路徑**（對 `PUBLIC_MEDIA_BASE` 解析）。
  來源未設定、且 `src` 又不是絕對 URL 時，該段會被略過；全部都略掉時
  `PREVIEWS` 為空陣列，首頁就不輸出預覽區塊——不留一個壞掉的 <video>。
*/

export interface PreviewClip {
  /** 絕對 URL，或相對於 PUBLIC_MEDIA_BASE 的路徑。 */
  src: string;
  /** MIME type，供 <source type> 使用。 */
  type: string;
  /** 首幀靜態圖（同樣可為絕對 URL 或相對路徑）。 */
  poster?: string;
}

/** 外部存儲來源；去尾端斜線，未設定時為空字串。 */
export const MEDIA_BASE = (import.meta.env.PUBLIC_MEDIA_BASE ?? "").replace(/\/+$/, "");

/*
  要播的片段。換片、加片、調順序都只動這裡，元件不必改。
  之所以只寫檔名而不寫完整網址：來源位址屬於「環境」，不同環境（本機／預備／
  正式）指向不同的桶，寫死在這裡就得為了換環境改碼。
*/
const PREVIEW_CLIPS: readonly PreviewClip[] = [
  { src: "preview-1.mp4", type: "video/mp4" },
  { src: "preview-hakuto.mp4", type: "video/mp4" },
];

/** 絕對 URL（含協定或協定相對）直接採用，其餘對 MEDIA_BASE 解析。 */
function resolve(src: string): string | null {
  if (/^(?:https?:)?\/\//i.test(src)) return src;
  if (!MEDIA_BASE) return null;
  return `${MEDIA_BASE}/${src.replace(/^\/+/, "")}`;
}

/** 解析完成、確定拿得到的片段；來源未設定時為空陣列。 */
export const PREVIEWS: PreviewClip[] = PREVIEW_CLIPS.flatMap((clip) => {
  const src = resolve(clip.src);
  if (!src) return [];
  const poster = clip.poster ? (resolve(clip.poster) ?? undefined) : undefined;
  return [{ ...clip, src, poster }];
});

/** 有沒有可播的片段——首頁據此決定要不要輸出預覽區塊。 */
export const HAS_PREVIEWS = PREVIEWS.length > 0;
