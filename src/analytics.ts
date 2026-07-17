import posthog from "posthog-js";

type AnalyticsProperties = Record<string, boolean | number | string | undefined>;

const posthogKey = import.meta.env.VITE_POSTHOG_KEY?.trim();
const posthogHost = import.meta.env.VITE_POSTHOG_HOST?.trim() || "https://records.rocksolidleveling.com";
const posthogUiHost = import.meta.env.VITE_POSTHOG_UI_HOST?.trim() || "https://us.posthog.com";

export const isAnalyticsEnabled = Boolean(posthogKey);

export const initAnalytics = () => {
  if (!posthogKey) {
    return;
  }

  posthog.init(posthogKey, {
    api_host: posthogHost,
    ui_host: posthogUiHost,
    defaults: "2026-05-30",
    capture_pageview: true,
    person_profiles: "identified_only",
    loaded: (client) => {
      client.register({
        app: "public_site",
        site: "rock-solid-leveling"
      });
    }
  });
};

export const captureEvent = (eventName: string, properties?: AnalyticsProperties) => {
  if (!isAnalyticsEnabled) {
    return;
  }

  posthog.capture(eventName, properties);
};

export const captureException = (error: unknown, properties?: AnalyticsProperties) => {
  if (!isAnalyticsEnabled) {
    return;
  }

  posthog.captureException(error instanceof Error ? error : new Error(String(error)), properties);
};
