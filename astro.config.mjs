// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// Shattered Realms sr-web -- the static-first flagship site.
// output defaults to 'static': it keeps the performance budget for motion (only
// the Pixi and GSAP islands hydrate) and lets the site deploy **purely
// statically**, with no Node runtime and no reverse proxy.
// Deploy target: sr.hoshivel.com; game nodes: play.sr.hoshivel.com;
// service routing goes through hoshi-svc's own domain (see
// PUBLIC_HOSHI_SVC_BASE in src/lib/play.ts).
export default defineConfig({
  site: "https://sr.hoshivel.com",
  integrations: [react()],
  // This site's block in the port plan is 26610-26619 (the game range). A purely
  // static site never enters hoshi-deploy's inventory `nodes`, but the dev server
  // still competes for numbers with other repos on the same development machine,
  // so the number comes from that same plan rather than astro's default 4321.
  //
  // strictPort: fail on a collision instead of sliding to the next free number.
  // This site and hoshivel-web both used to sit on 4321, and the symptom was
  // exactly that the second one was silently moved to 4322 -- while `hoshi dev`
  // declared 4321, so it refused to start.
  server: { port: 26610 },
  build: {
    // Inline small stylesheets to cut first-paint requests; Vite splits the large motion islands into their own chunks automatically.
    inlineStylesheets: "auto",
  },
  vite: {
    // strictPort: fail on a collision instead of sliding to the next free number (same reason as above).
    server: {
      strictPort: true,
      // Production CORS intentionally allows only the production site. Keep local
      // Play testing same-origin without widening that policy or adding a runtime backend.
      proxy: {
        "/__hoshi_svc": {
          target: "https://svc.hoshivel.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/__hoshi_svc/, ""),
        },
      },
    },
    build: {
      // Pixi and GSAP go into their own chunks, loaded lazily via client:visible.
      cssCodeSplit: true,
    },
  },
});
