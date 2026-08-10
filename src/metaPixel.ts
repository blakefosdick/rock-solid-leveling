type FbqFunction = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  loaded?: boolean;
  queue?: unknown[][];
  version?: string;
};

declare global {
  interface Window {
    fbq?: FbqFunction;
    _fbq?: FbqFunction;
  }
}

const metaPixelId = import.meta.env.VITE_META_PIXEL_ID?.trim();

let hasInitializedMetaPixel = false;
let hasTrackedViewContent = false;

const isBrowser = () => typeof window !== "undefined" && typeof document !== "undefined";

const installMetaPixelScript = () => {
  if (!isBrowser() || window.fbq) {
    return;
  }

  const fbq = ((...args: unknown[]) => {
    if (fbq.callMethod) {
      fbq.callMethod(...args);
      return;
    }

    fbq.queue?.push(args);
  }) as FbqFunction;

  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];

  window.fbq = fbq;
  window._fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";

  const firstScript = document.getElementsByTagName("script")[0];
  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
    return;
  }

  document.head.appendChild(script);
};

export const isMetaPixelEnabled = Boolean(metaPixelId);

export const initMetaPixel = () => {
  if (!isBrowser() || !metaPixelId || hasInitializedMetaPixel) {
    return;
  }

  installMetaPixelScript();
  window.fbq?.("init", metaPixelId);
  window.fbq?.("track", "PageView");
  hasInitializedMetaPixel = true;
};

export const trackMetaPixelViewContent = (eventId: string) => {
  if (!eventId || hasTrackedViewContent) {
    return;
  }

  initMetaPixel();
  if (!isMetaPixelEnabled) {
    return;
  }

  window.fbq?.("track", "ViewContent", {}, { eventID: eventId });
  hasTrackedViewContent = true;
};

export const trackMetaPixelLead = (eventId: string) => {
  if (!eventId) {
    return;
  }

  initMetaPixel();
  if (!isMetaPixelEnabled) {
    return;
  }

  window.fbq?.("track", "Lead", {}, { eventID: eventId });
};
