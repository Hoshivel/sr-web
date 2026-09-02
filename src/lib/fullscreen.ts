/*
  Native fullscreen, spelled two ways, and nothing else.

  There is deliberately no "does this browser support fullscreen?" predicate
  here. `document.fullscreenEnabled` being true does not mean a given element
  will be granted: the API can be exposed, the target still refused. Only an
  actual request answers the question, so every caller sends one and reads the
  result. The debug probe at /debug/fullscreen exists to make that result
  visible on devices where a remote inspector is not practical.
*/

type FullscreenCapableElement = Element & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenCapableDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
};

/** Which spelling of the request to send. `auto` prefers the standard one. */
export type FullscreenSpelling = "auto" | "standard" | "webkit";

/** Both spellings of the change event. WebKit only sends the prefixed one. */
export const FULLSCREEN_CHANGE_EVENTS = ["fullscreenchange", "webkitfullscreenchange"] as const;

/** Both spellings of the error event. */
export const FULLSCREEN_ERROR_EVENTS = ["fullscreenerror", "webkitfullscreenerror"] as const;

export function fullscreenElement(): Element | null {
  const doc = document as FullscreenCapableDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

/**
 * Send the request and report which spelling went out.
 *
 * Callers must invoke this from inside the event handler of the gesture that
 * asked for fullscreen, with no `await` in front of it: WebKit grants the
 * request only while it is processing that gesture, and it is the engine behind
 * every browser on iPadOS.
 */
export function requestFullscreen(
  element: Element,
  spelling: FullscreenSpelling = "auto",
): { spelling: "standard" | "webkit"; done: Promise<void> } {
  const target = element as FullscreenCapableElement;
  const standard = spelling === "webkit" ? undefined : target.requestFullscreen;
  const webkit = spelling === "standard" ? undefined : target.webkitRequestFullscreen;
  const request = standard ?? webkit;
  if (!request) {
    return {
      spelling: spelling === "webkit" ? "webkit" : "standard",
      done: Promise.reject(new Error(`requestFullscreen unavailable (${spelling})`)),
    };
  }
  // Never throw at the call site. The standard returns a promise, but the
  // prefixed method predates promises and is free to throw instead — and the
  // caller is a click handler that has other work to do after this line. A
  // synchronous throw there would take the rest of the handler with it, so a
  // browser that merely refuses fullscreen would break the button entirely.
  try {
    return {
      spelling: request === standard ? "standard" : "webkit",
      done: Promise.resolve(request.call(target)).then(() => undefined),
    };
  } catch (error) {
    return {
      spelling: request === standard ? "standard" : "webkit",
      done: Promise.reject(error),
    };
  }
}

export function exitFullscreen(): Promise<void> {
  const doc = document as FullscreenCapableDocument;
  const exit = doc.exitFullscreen ?? doc.webkitExitFullscreen;
  if (!exit) return Promise.resolve();
  return Promise.resolve(exit.call(doc)).then(() => undefined);
}

/**
 * Resolve after two animation frames.
 *
 * `requestFullscreen()` resolving is not the same as the page being in
 * fullscreen — the resize and the repaint land later. Reading
 * `fullscreenElement` before the browser has laid the page out again reports
 * the state we asked for rather than the one we got.
 */
export function afterTwoFrames(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}
