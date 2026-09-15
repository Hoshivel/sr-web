/*
  Shattered Realms sr-web -- source configuration for the preview videos (the
  single place to configure them).

  **Videos are not deployed with the site.** The site artifact is purely static
  HTML/JS/CSS, and videos running to hundreds of MB do not belong in dist/: that
  would re-upload the same bytes on every deploy and tie the videos' cache
  lifetime to the site's release cycle. Videos belong in object storage or a
  media CDN, and this site only describes where to fetch them.

  Two knobs:
  - `PUBLIC_MEDIA_BASE`: origin of the external storage (a build-time environment
    variable, see `.env.example`).
  - `PREVIEW_CLIPS`: which clips to play and in what order.

  `src` may be an **absolute URL** (used as-is, so clips can live on different
  hosts) or a **relative path** (resolved against `PUBLIC_MEDIA_BASE`).
  When no origin is configured and `src` is not absolute, that clip is skipped;
  if every clip is skipped, `PREVIEWS` is empty and the home page emits no preview
  section at all -- rather than leaving a broken <video> behind.
*/

export interface PreviewClip {
  /** An absolute URL, or a path relative to PUBLIC_MEDIA_BASE. */
  src: string;
  /** MIME type, for <source type>. */
  type: string;
  /** Poster image for the first frame (likewise an absolute URL or a relative path). */
  poster?: string;
}

/** External storage origin; trailing slash stripped, empty string when unset. */
export const MEDIA_BASE = (import.meta.env.PUBLIC_MEDIA_BASE ?? "").replace(/\/+$/, "");

/*
  The clips to play. Swapping, adding or reordering them touches only this list;
  no component needs to change.
  Only filenames are written here, not full URLs, because the origin belongs to
  the *environment*: local, staging and production point at different buckets, and
  hardcoding one here would mean editing code to change environment.
*/
const PREVIEW_CLIPS: readonly PreviewClip[] = [
  { src: "preview-1.mp4", type: "video/mp4" },
  { src: "preview-hakuto.mp4", type: "video/mp4" },
];

/** Absolute URLs (with a scheme, or protocol-relative) are used as-is; everything else resolves against MEDIA_BASE. */
function resolve(src: string): string | null {
  if (/^(?:https?:)?\/\//i.test(src)) return src;
  if (!MEDIA_BASE) return null;
  return `${MEDIA_BASE}/${src.replace(/^\/+/, "")}`;
}

/** Clips that resolved and are known to be fetchable; empty when no origin is configured. */
export const PREVIEWS: PreviewClip[] = PREVIEW_CLIPS.flatMap((clip) => {
  const src = resolve(clip.src);
  if (!src) return [];
  const poster = clip.poster ? (resolve(clip.poster) ?? undefined) : undefined;
  return [{ ...clip, src, poster }];
});

/** Whether any clip is playable -- the home page uses this to decide whether to emit the preview section. */
export const HAS_PREVIEWS = PREVIEWS.length > 0;
