type MetaBrowserContext = {
  fbp: string;
  fbc: string;
  eventSourceUrl: string;
};

const fbpCookieName = "_fbp";
const fbcCookieName = "_fbc";
const cookieMaxAgeSeconds = 60 * 60 * 24 * 90;

let viewContentEventId = "";
let hasSentViewContent = false;

const isBrowser = () => typeof window !== "undefined" && typeof document !== "undefined";

const getCookie = (name: string) => {
  if (!isBrowser()) {
    return "";
  }

  const cookiePrefix = `${name}=`;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(cookiePrefix));

  if (!cookie) {
    return "";
  }

  return decodeURIComponent(cookie.slice(cookiePrefix.length));
};

const setCookie = (name: string, value: string) => {
  if (!isBrowser() || !value) {
    return;
  }

  const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${cookieMaxAgeSeconds}; Path=/; SameSite=Lax${secureFlag}`;
};

const createUuid = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const createFbp = () => {
  const bytes = new Uint32Array(2);
  crypto.getRandomValues(bytes);
  const randomValue = `${bytes[0]}${bytes[1]}`.slice(0, 10).padEnd(10, "0");

  return `fb.1.${Date.now()}.${randomValue}`;
};

const createFbc = (fbclid: string) => `fb.1.${Date.now()}.${fbclid}`;

export const createMetaLeadEventId = (submissionId: string) =>
  `rsl-lead-${submissionId}`;

export const getMetaViewContentEventId = () => {
  if (!viewContentEventId) {
    viewContentEventId = `rsl-viewcontent-${createUuid()}`;
  }

  return viewContentEventId;
};

export const getMetaBrowserContext = (): MetaBrowserContext => {
  if (!isBrowser()) {
    return {
      fbp: "",
      fbc: "",
      eventSourceUrl: ""
    };
  }

  let fbp = getCookie(fbpCookieName);
  if (!fbp) {
    fbp = createFbp();
    setCookie(fbpCookieName, fbp);
  }

  const fbclid = new URLSearchParams(window.location.search).get("fbclid")?.trim();
  let fbc = getCookie(fbcCookieName);
  if (fbclid) {
    fbc = createFbc(fbclid);
    setCookie(fbcCookieName, fbc);
  }

  return {
    fbp,
    fbc,
    eventSourceUrl: window.location.href
  };
};

export const sendMetaViewContent = () => {
  if (!isBrowser() || hasSentViewContent) {
    return;
  }

  hasSentViewContent = true;
  const context = getMetaBrowserContext();

  void fetch("/meta-capi/view-content", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      event_id: getMetaViewContentEventId(),
      event_source_url: context.eventSourceUrl,
      fbp: context.fbp,
      fbc: context.fbc
    }),
    keepalive: true
  }).catch((error) => {
    console.warn("Meta ViewContent request failed", error);
  });
};
