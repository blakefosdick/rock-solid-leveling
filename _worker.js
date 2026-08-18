export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

      if (request.method === "GET" && url.pathname === "/free-estimate/") {
        url.pathname = "/free-estimate";
        return Response.redirect(url.toString(), 308);
      }

      if (request.method === "GET" && url.pathname === "/site-config") {
        return json(
          {
            showGoogleReviews: isEnabled(env.GOOGLE_REVIEWS_ENABLED)
          },
          200,
          {
            "cache-control": "no-store"
          }
        );
      }

      if (request.method === "GET" && url.pathname === "/rock-solid-website-quote-config") {
        return json({
          success: true,
          runtime: "worker",
          hasAssetsBinding: Boolean(env?.ASSETS?.fetch),
          hasQuoteImagesBucket: Boolean(env.QUOTE_IMAGES_BUCKET),
          hasHighLevelApiToken: Boolean(env.HIGHLEVEL_API_TOKEN),
          hasLocationId: Boolean(env.HIGHLEVEL_LOCATION_ID),
          hasSlabsFieldId: Boolean(env.HIGHLEVEL_SLABS_FIELD_ID),
          hasImagesFieldId: Boolean(env.HIGHLEVEL_IMAGES_FIELD_ID),
          hasNotesFieldId: Boolean(env.HIGHLEVEL_NOTES_FIELD_ID),
          hasImagePublicBaseUrl: Boolean(env.IMAGE_PUBLIC_BASE_URL),
          hasQuoteNotificationEmail: Boolean(env.QUOTE_NOTIFICATION_EMAIL),
          hasQuoteNotificationRecipients: parseNotificationEmails(env.QUOTE_NOTIFICATION_EMAILS).length > 0,
          hasMetaPixelId: Boolean(env.META_PIXEL_ID),
          hasMetaCapiAccessToken: Boolean(env.META_CAPI_ACCESS_TOKEN),
          hasMetaTestEventCode: Boolean(env.META_TEST_EVENT_CODE)
        });
      }

      if (request.method === "GET" && url.pathname.startsWith("/quote-images/")) {
        return await handleQuoteImageRequest(request, env);
      }

      if (request.method === "POST" && url.pathname === "/rock-solid-website-quote") {
        return await handleQuoteSubmission(request, env, ctx);
      }

      if (request.method === "POST" && url.pathname === "/meta-capi/view-content") {
        return await handleMetaViewContent(request, env, ctx);
      }

      if (request.method === "GET" && url.pathname === "/google-reviews-config") {
        return json({
          success: true,
          runtime: "worker",
          hasGoogleClientId: Boolean(env.GOOGLE_BUSINESS_PROFILE_CLIENT_ID),
          hasGoogleClientSecret: Boolean(env.GOOGLE_BUSINESS_PROFILE_CLIENT_SECRET),
          hasGoogleRefreshToken: Boolean(env.GOOGLE_BUSINESS_PROFILE_REFRESH_TOKEN),
          hasGoogleLocationName: Boolean(getConfiguredGoogleLocationName(env)),
          hasGoogleAccountId: Boolean(env.GOOGLE_BUSINESS_PROFILE_ACCOUNT_ID),
          hasGoogleLocationId: Boolean(env.GOOGLE_BUSINESS_PROFILE_LOCATION_ID),
          canDiscoverGoogleAccount: Boolean(env.GOOGLE_BUSINESS_PROFILE_LOCATION_ID)
        });
      }

      if (request.method === "GET" && url.pathname === "/google-reviews") {
        return await handleGoogleReviews(env);
      }

      if (env?.ASSETS?.fetch) {
        if (request.method === "GET" && url.pathname === "/free-estimate") {
          const assetUrl = new URL(request.url);
          assetUrl.pathname = "/free-estimate.html";
          return await env.ASSETS.fetch(new Request(assetUrl.toString(), request));
        }

        return await env.ASSETS.fetch(request);
      }

      return json({ success: false, message: "Not found." }, 404);
    } catch (error) {
      return workerError(error);
    }
  }
};

function isEnabled(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

const googleStarRatingValues = {
  STAR_RATING_UNSPECIFIED: 0,
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5
};

async function handleGoogleReviews(env) {
  const missingConfig = [
    "GOOGLE_BUSINESS_PROFILE_CLIENT_ID",
    "GOOGLE_BUSINESS_PROFILE_CLIENT_SECRET",
    "GOOGLE_BUSINESS_PROFILE_REFRESH_TOKEN"
  ].filter((key) => !env[key]);

  if (!getConfiguredGoogleLocationName(env) && !env.GOOGLE_BUSINESS_PROFILE_LOCATION_ID) {
    missingConfig.push("GOOGLE_BUSINESS_PROFILE_LOCATION_NAME or GOOGLE_BUSINESS_PROFILE_LOCATION_ID");
  }

  if (missingConfig.length > 0) {
    return json(
      {
        success: false,
        message: "Google reviews configuration is incomplete.",
        detail: `Missing bindings/vars: ${missingConfig.join(", ")}`
      },
      500
    );
  }

  try {
    const accessToken = await getGoogleAccessToken(env);
    const locationName = getConfiguredGoogleLocationName(env) || await discoverGoogleLocationName(env, accessToken);

    if (!locationName) {
      return json(
        {
          success: false,
          message: "Google Business Profile location could not be resolved.",
          detail: "The OAuth account can list accounts, but none of its locations matched GOOGLE_BUSINESS_PROFILE_LOCATION_ID."
        },
        404
      );
    }

    const reviewsUrl = new URL(`https://mybusiness.googleapis.com/v4/${locationName}/reviews`);
    reviewsUrl.searchParams.set("pageSize", "10");
    reviewsUrl.searchParams.set("orderBy", "updateTime desc");

    const reviewsResponse = await fetch(reviewsUrl.toString(), {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!reviewsResponse.ok) {
      return json(
        {
          success: false,
          message: "Google reviews request failed.",
          detail: await reviewsResponse.text()
        },
        502
      );
    }

    const payload = await reviewsResponse.json();
    const reviews = Array.isArray(payload.reviews)
      ? payload.reviews
          .map(normalizeGoogleReview)
          .filter((review) => review.comment)
          .slice(0, 9)
      : [];

    return json(
      {
        success: true,
        averageRating: Number(payload.averageRating || 0),
        totalReviewCount: Number(payload.totalReviewCount || 0),
        reviews
      },
      200,
      {
        "cache-control": "public, max-age=600, s-maxage=3600"
      }
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return json({ success: false, message: "Unhandled Google reviews error.", detail }, 500);
  }
}

async function getGoogleAccessToken(env) {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: env.GOOGLE_BUSINESS_PROFILE_CLIENT_ID,
      client_secret: env.GOOGLE_BUSINESS_PROFILE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_BUSINESS_PROFILE_REFRESH_TOKEN,
      grant_type: "refresh_token"
    })
  });

  if (!tokenResponse.ok) {
    throw new Error(`Google token refresh failed: ${await tokenResponse.text()}`);
  }

  const tokenPayload = await tokenResponse.json();
  if (!tokenPayload.access_token) {
    throw new Error("Google token response did not include an access token.");
  }

  return tokenPayload.access_token;
}

function getConfiguredGoogleLocationName(env) {
  const suppliedLocationName = String(env.GOOGLE_BUSINESS_PROFILE_LOCATION_NAME || "").trim();

  if (suppliedLocationName) {
    return suppliedLocationName.replace(/^\/+|\/+$/g, "");
  }

  const accountId = String(env.GOOGLE_BUSINESS_PROFILE_ACCOUNT_ID || "").trim();
  const locationId = String(env.GOOGLE_BUSINESS_PROFILE_LOCATION_ID || "").trim();

  if (!accountId || !locationId) {
    return "";
  }

  return `accounts/${accountId}/locations/${locationId}`;
}

async function discoverGoogleLocationName(env, accessToken) {
  const targetLocationId = String(env.GOOGLE_BUSINESS_PROFILE_LOCATION_ID || "").trim();

  if (!targetLocationId) {
    return "";
  }

  const accounts = await listGoogleAccounts(accessToken);

  for (const account of accounts) {
    const accountName = String(account?.name || "").trim();
    if (!accountName) {
      continue;
    }

    const locations = await listGoogleLocations(accountName, accessToken);
    const matchedLocation = locations.find((location) => {
      const locationName = String(location?.name || "").trim();
      return extractGoogleResourceId(locationName) === targetLocationId;
    });

    if (matchedLocation) {
      return `${accountName}/locations/${targetLocationId}`;
    }
  }

  return "";
}

async function listGoogleAccounts(accessToken) {
  const accounts = [];
  let pageToken = "";

  do {
    const accountsUrl = new URL("https://mybusinessaccountmanagement.googleapis.com/v1/accounts");
    accountsUrl.searchParams.set("pageSize", "20");
    if (pageToken) {
      accountsUrl.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(accountsUrl.toString(), {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Google accounts request failed: ${await response.text()}`);
    }

    const payload = await response.json();
    accounts.push(...(Array.isArray(payload.accounts) ? payload.accounts : []));
    pageToken = String(payload.nextPageToken || "");
  } while (pageToken);

  return accounts;
}

async function listGoogleLocations(accountName, accessToken) {
  const locations = [];
  let pageToken = "";

  do {
    const locationsUrl = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`);
    locationsUrl.searchParams.set("pageSize", "100");
    locationsUrl.searchParams.set("readMask", "name,title");
    if (pageToken) {
      locationsUrl.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(locationsUrl.toString(), {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Google locations request failed for ${accountName}: ${await response.text()}`);
    }

    const payload = await response.json();
    locations.push(...(Array.isArray(payload.locations) ? payload.locations : []));
    pageToken = String(payload.nextPageToken || "");
  } while (pageToken);

  return locations;
}

function extractGoogleResourceId(resourceName) {
  const segments = String(resourceName || "").split("/").filter(Boolean);
  return segments[segments.length - 1] || "";
}

function normalizeGoogleReview(review) {
  const authorName = String(review?.reviewer?.displayName || "Google reviewer").trim();
  const comment = String(review?.comment || "").trim();
  const rating = normalizeGoogleRating(review?.starRating);
  const updateTime = String(review?.updateTime || review?.createTime || "");
  const id = String(review?.reviewId || review?.name || `${authorName}-${updateTime}`).trim();

  return {
    id,
    authorName,
    relativeTime: formatRelativeTime(updateTime),
    comment,
    rating,
    profilePhotoUrl: String(review?.reviewer?.profilePhotoUrl || "")
  };
}

function normalizeGoogleRating(starRating) {
  if (typeof starRating === "number") {
    return Math.max(0, Math.min(5, Math.round(starRating)));
  }

  const normalized = googleStarRatingValues[String(starRating || "").toUpperCase()];
  return normalized || 0;
}

function formatRelativeTime(value) {
  const time = new Date(value).getTime();

  if (!Number.isFinite(time)) {
    return "Google review";
  }

  const seconds = Math.max(1, Math.floor((Date.now() - time) / 1000));
  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60]
  ];

  for (const [label, unitSeconds] of units) {
    const count = Math.floor(seconds / unitSeconds);
    if (count >= 1) {
      return `${count} ${label}${count === 1 ? "" : "s"} ago`;
    }
  }

  return "Just now";
}

async function handleMetaViewContent(request, env, ctx) {
  const payload = await request.json().catch(() => ({}));
  const metaConfig = getMetaCapiConfig(env);

  queueMetaCapiEvent(ctx, async () =>
    sendMetaCapiEvent(env, {
      event_name: "ViewContent",
      event_time: unixSeconds(),
      event_id: sanitizeMetaEventId(payload?.event_id, "rsl-viewcontent"),
      event_source_url: sanitizeMetaEventSourceUrl(
        String(payload?.event_source_url || ""),
        request.url
      ),
      action_source: "website",
      user_data: buildMetaBrowserUserData({
        request,
        fbp: payload?.fbp,
        fbc: payload?.fbc
      })
    })
  );

  return json({
    success: true,
    queued: metaConfig.isConfigured
  });
}

function queueMetaCapiEvent(ctx, createTask) {
  const task = Promise.resolve()
    .then(createTask)
    .catch((error) => {
      logMetaCapi("meta_capi_unhandled_error", {
        detail: error instanceof Error ? error.message : String(error)
      });
    });

  if (ctx && typeof ctx.waitUntil === "function") {
    ctx.waitUntil(task);
    return;
  }

  void task;
}

async function sendMetaCapiEvent(env, event) {
  const config = getMetaCapiConfig(env);

  if (!config.isConfigured) {
    logMetaCapi("meta_capi_skipped", {
      eventName: event.event_name,
      eventId: event.event_id,
      missing: config.missing.join(",")
    });
    return;
  }

  const eventPayload = {
    ...event,
    user_data: removeEmpty(event.user_data || {})
  };
  const requestPayload = {
    data: [eventPayload],
    ...(config.testEventCode ? { test_event_code: config.testEventCode } : {})
  };
  const eventsUrl = new URL(
    `https://graph.facebook.com/${config.graphVersion}/${encodeURIComponent(config.pixelId)}/events`
  );
  eventsUrl.searchParams.set("access_token", config.accessToken);

  const response = await fetch(eventsUrl.toString(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestPayload)
  });
  const responseText = await response.text();

  if (!response.ok) {
    logMetaCapi("meta_capi_request_failed", {
      eventName: event.event_name,
      eventId: event.event_id,
      status: response.status,
      testMode: Boolean(config.testEventCode),
      detail: truncateForLog(responseText)
    });
    return;
  }

  const result = safeJsonParse(responseText);
  logMetaCapi("meta_capi_request_succeeded", {
    eventName: event.event_name,
    eventId: event.event_id,
    testMode: Boolean(config.testEventCode),
    eventsReceived: result?.events_received,
    messages: truncateForLog(JSON.stringify(result?.messages || []), 500)
  });
}

function getMetaCapiConfig(env) {
  const pixelId = String(env.META_PIXEL_ID || "").trim();
  const accessToken = String(env.META_CAPI_ACCESS_TOKEN || "").trim();
  const graphVersion = sanitizeMetaGraphVersion(env.META_CAPI_GRAPH_VERSION || "v25.0");
  const testEventCode = String(env.META_TEST_EVENT_CODE || "").trim();
  const missing = [];

  if (!pixelId) missing.push("META_PIXEL_ID");
  if (!accessToken) missing.push("META_CAPI_ACCESS_TOKEN");

  return {
    pixelId,
    accessToken,
    graphVersion,
    testEventCode,
    missing,
    isConfigured: missing.length === 0
  };
}

function sanitizeMetaGraphVersion(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return /^v\d+\.\d+$/.test(normalized) ? normalized : "v25.0";
}

function sanitizeMetaEventId(value, prefix) {
  const supplied = String(value || "").trim();
  if (supplied) {
    return supplied.slice(0, 200);
  }

  return `${prefix}-${crypto.randomUUID()}`;
}

function sanitizeMetaEventSourceUrl(value, fallbackUrl) {
  const supplied = String(value || "").trim();
  const fallback = new URL(fallbackUrl);

  try {
    const parsed = new URL(supplied || fallbackUrl);
    const isHttp = parsed.protocol === "http:" || parsed.protocol === "https:";
    if (isHttp && parsed.hostname === fallback.hostname) {
      return parsed.toString();
    }
  } catch {
    // Fall through to the request URL.
  }

  return fallback.toString();
}

function buildMetaBrowserUserData({ request, fbp, fbc }) {
  return removeEmpty({
    client_ip_address: getClientIp(request),
    client_user_agent: request.headers.get("user-agent") || "",
    fbp: String(fbp || "").trim(),
    fbc: String(fbc || "").trim()
  });
}

async function buildMetaLeadUserData({ request, form, contact, externalId }) {
  const userData = buildMetaBrowserUserData({
    request,
    fbp: form.get("fbp"),
    fbc: form.get("fbc")
  });

  await addHashedMetaField(userData, "em", contact.email, normalizeMetaEmail);
  await addHashedMetaField(userData, "ph", contact.phone, normalizeMetaPhone);
  await addHashedMetaField(userData, "fn", contact.firstName, normalizeMetaName);
  await addHashedMetaField(userData, "ln", contact.lastName, normalizeMetaName);
  await addHashedMetaField(userData, "ct", contact.city, normalizeMetaCity);
  await addHashedMetaField(userData, "st", contact.state, normalizeMetaState);
  await addHashedMetaField(userData, "zp", contact.postalCode, normalizeMetaPostalCode);
  await addHashedMetaField(userData, "country", contact.country, normalizeMetaCountry);
  await addHashedMetaField(userData, "external_id", externalId, normalizeMetaExternalId);

  return removeEmpty(userData);
}

async function addHashedMetaField(target, key, value, normalize) {
  const normalized = normalize(value);
  if (!normalized) {
    return;
  }

  target[key] = await sha256Hex(normalized);
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getClientIp(request) {
  const directIp = request.headers.get("cf-connecting-ip");
  if (directIp) {
    return directIp;
  }

  return String(request.headers.get("x-forwarded-for") || "")
    .split(",")[0]
    .trim();
}

function normalizeMetaEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeMetaPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) {
    return `1${digits}`;
  }

  return digits;
}

function normalizeMetaName(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeMetaCity(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z]/g, "");
}

function normalizeMetaState(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[^a-z]/g, "");
  return usStateCodes[normalized] || normalized;
}

function normalizeMetaPostalCode(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function normalizeMetaCountry(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[^a-z]/g, "");
  if (["us", "usa", "unitedstates", "unitedstatesofamerica"].includes(normalized)) {
    return "us";
  }

  return normalized;
}

function normalizeMetaExternalId(value) {
  return String(value || "").trim().toLowerCase();
}

function getAddressParts(form, raw) {
  return {
    city: getFirstValue(form, raw, ["city", "q_city", "q7_city"]),
    state: getFirstValue(form, raw, ["state", "province", "q_state", "q7_state"]),
    postalCode: getFirstValue(form, raw, ["postalCode", "zip", "zipcode", "q_zip", "q7_zip"]),
    country: getFirstValue(form, raw, ["country", "q_country", "q7_country"]) || "United States"
  };
}

function getFirstValue(form, raw, keys) {
  for (const key of keys) {
    const formValue = String(form.get(key) || "").trim();
    if (formValue) {
      return formValue;
    }

    const rawValue = raw && typeof raw === "object" ? raw[key] : "";
    if (typeof rawValue === "string" && rawValue.trim()) {
      return rawValue.trim();
    }
  }

  return "";
}

function removeEmpty(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null && entryValue !== "")
  );
}

function unixSeconds() {
  return Math.floor(Date.now() / 1000);
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function truncateForLog(value, maxLength = 1200) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function logMetaCapi(message, detail) {
  console.log(JSON.stringify({
    message,
    ...detail
  }));
}

const usStateCodes = {
  alabama: "al",
  alaska: "ak",
  arizona: "az",
  arkansas: "ar",
  california: "ca",
  colorado: "co",
  connecticut: "ct",
  delaware: "de",
  districtofcolumbia: "dc",
  florida: "fl",
  georgia: "ga",
  hawaii: "hi",
  idaho: "id",
  illinois: "il",
  indiana: "in",
  iowa: "ia",
  kansas: "ks",
  kentucky: "ky",
  louisiana: "la",
  maine: "me",
  maryland: "md",
  massachusetts: "ma",
  michigan: "mi",
  minnesota: "mn",
  mississippi: "ms",
  missouri: "mo",
  montana: "mt",
  nebraska: "ne",
  nevada: "nv",
  newhampshire: "nh",
  newjersey: "nj",
  newmexico: "nm",
  newyork: "ny",
  northcarolina: "nc",
  northdakota: "nd",
  ohio: "oh",
  oklahoma: "ok",
  oregon: "or",
  pennsylvania: "pa",
  rhodeisland: "ri",
  southcarolina: "sc",
  southdakota: "sd",
  tennessee: "tn",
  texas: "tx",
  utah: "ut",
  vermont: "vt",
  virginia: "va",
  washington: "wa",
  westvirginia: "wv",
  wisconsin: "wi",
  wyoming: "wy"
};

async function handleQuoteSubmission(request, env, ctx) {
  try {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return json({ success: false, message: "Expected multipart/form-data." }, 400);
  }

  const config = {
    locationId: env.HIGHLEVEL_LOCATION_ID || "Tfkw5X9Yaj3OU0ZwyzYz",
    slabsFieldId: env.HIGHLEVEL_SLABS_FIELD_ID || "5pX0DhPVGkwPQ4sAoIjz",
    imagesFieldId: env.HIGHLEVEL_IMAGES_FIELD_ID || "XGPeq5EV1xvOP9fRPsNt",
    notesFieldId: env.HIGHLEVEL_NOTES_FIELD_ID || "wIkVaPWQuiJJjcxbci49",
    imagePublicBaseUrl: env.IMAGE_PUBLIC_BASE_URL || ""
  };

  const missingConfig = [
    "QUOTE_IMAGES_BUCKET",
    "HIGHLEVEL_API_TOKEN",
    "QUOTE_NOTIFICATION_EMAIL"
  ].filter((key) => !env[key]);

  const notificationRecipients = parseNotificationEmails(env.QUOTE_NOTIFICATION_EMAILS);
  if (notificationRecipients.length === 0) {
    missingConfig.push("QUOTE_NOTIFICATION_EMAILS");
  }

  if (missingConfig.length > 0) {
    return json(
      {
        success: false,
        message: "Worker configuration is incomplete.",
        detail: `Missing bindings/vars: ${missingConfig.join(", ")}`
      },
      500
    );
  }

  const form = await request.formData();
  const rawRequestText = String(form.get("rawRequest") || "{}");

  let raw = {};
  try {
    raw = JSON.parse(rawRequestText);
  } catch {
    raw = {};
  }

  const suppliedFirst = String(form.get("firstName") || raw?.q11_name?.first || "").trim();
  const suppliedLast = String(form.get("lastName") || raw?.q11_name?.last || "").trim();
  const suppliedFullName = String(form.get("fullName") || "").trim();
  const name = suppliedFirst || suppliedLast
    ? { firstName: suppliedFirst, lastName: suppliedLast }
    : splitFullName(suppliedFullName);
  const addressParts = getAddressParts(form, raw);

  const submissionId = String(form.get("submissionID") || form.get("submissionId") || `rsl-${Date.now()}`);
  const submissionSlug = slugify(submissionId, `submission-${Date.now()}`);
  const now = new Date();
  const datePath = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${String(now.getUTCDate()).padStart(2, "0")}`;

  const imageFiles = form.getAll("images").filter((f) => f instanceof File);
  const uploadedUrls = [];
  const highLevelImageFiles = [];

  for (let index = 0; index < imageFiles.length; index += 1) {
    const file = imageFiles[index];
    const originalName = file.name || `upload-${index + 1}`;
    const extensionMatch = originalName.match(/\.[A-Za-z0-9]+$/);
    const extension = extensionMatch ? extensionMatch[0].toLowerCase() : "";
    const baseName = extension ? originalName.slice(0, -extension.length) : originalName;
    const safeFileName = `${String(index + 1).padStart(2, "0")}-${slugify(baseName, `upload-${index + 1}`)}${extension}`;
    const objectKey = `website-quotes/${datePath}/${submissionSlug}/${safeFileName}`;
    const bytes = await file.arrayBuffer();
    const contentType = file.type || "application/octet-stream";

    await env.QUOTE_IMAGES_BUCKET.put(objectKey, bytes, {
      httpMetadata: {
        contentType
      }
    });

    uploadedUrls.push(buildQuoteImageUrl(request, objectKey, config.imagePublicBaseUrl));
    highLevelImageFiles.push(new File([bytes], safeFileName, { type: contentType }));
  }

  const highLevelPayload = {
    locationId: config.locationId,
    firstName: name.firstName,
    lastName: name.lastName,
    email: String(form.get("email") || raw?.q5_email5 || "").trim(),
    phone: String(form.get("phone") || raw?.q12_phoneNumber?.full || "").trim(),
    address1: String(form.get("address") || "").trim(),
    city: addressParts.city,
    state: addressParts.state,
    postalCode: addressParts.postalCode,
    country: addressParts.country,
    tags: ["website quote form"],
    customFields: [
      { id: config.slabsFieldId, key: "Square Feet of Slabs", field_value: String(form.get("squareFeet") || raw?.q13_number || "").trim() },
      { id: config.notesFieldId, key: "Notes", field_value: String(form.get("details") || raw?.q17_anyNotes || "").trim() }
    ]
  };

  const upsertResponse = await fetch("https://services.leadconnectorhq.com/contacts/upsert/", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Version: "2021-07-28",
      Authorization: `Bearer ${env.HIGHLEVEL_API_TOKEN}`
    },
    body: JSON.stringify(highLevelPayload)
  });

  if (!upsertResponse.ok) {
    return json({ success: false, message: "HighLevel upsert failed.", detail: await upsertResponse.text() }, 502);
  }

  const upsertResult = await upsertResponse.json().catch(() => null);
  const contactId = extractHighLevelContactId(upsertResult);

  if (!contactId) {
    return json({ success: false, message: "HighLevel upsert succeeded, but no contact id was returned." }, 502);
  }

  if (highLevelImageFiles.length > 0) {
    const uploadedFileValue = await uploadFilesToHighLevelCustomField(config, env.HIGHLEVEL_API_TOKEN, highLevelImageFiles);

    if (uploadedFileValue) {
      await updateHighLevelContactCustomFields(config, env.HIGHLEVEL_API_TOKEN, contactId, [
        {
          id: config.imagesFieldId,
          value: uploadedFileValue
        }
      ]);

      const refreshedContact = await getHighLevelContact(config, env.HIGHLEVEL_API_TOKEN, contactId);
      const normalizedImageValue = normalizeUploadedFileFieldValue(
        config.imagesFieldId,
        extractHighLevelCustomFieldValue(refreshedContact, config.imagesFieldId) ?? uploadedFileValue
      );

      if (normalizedImageValue) {
        await updateHighLevelContactCustomFields(config, env.HIGHLEVEL_API_TOKEN, contactId, [
          {
            id: config.imagesFieldId,
            value: normalizedImageValue
          }
        ]);
      }
    }
  }

  const contactLocationId = String(upsertResult?.contact?.locationId || config.locationId).trim();
  const contactUrl = contactId && contactLocationId
    ? `https://app.gohighlevel.com/v2/location/${encodeURIComponent(contactLocationId)}/contacts/detail/${encodeURIComponent(contactId)}`
    : "";
  const fullName = [name.firstName, name.lastName].filter(Boolean).join(" ") || "Not provided";
  const address = highLevelPayload.address1 || "Not provided";
  const phone = highLevelPayload.phone || "Not provided";
  await env.QUOTE_NOTIFICATION_EMAIL.send({
    to: notificationRecipients,
    from: {
      email: "quotes@go.rocksolidleveling.com",
      name: "Rock Solid Leveling"
    },
    subject: `New quote request from ${fullName}`,
    text: [
      "A new quote request was submitted on rocksolidleveling.com.",
      "",
      `Name: ${fullName}`,
      `Address: ${address}`,
      `Phone: ${phone}`,
      ...(contactUrl ? ["", `Open contact in HighLevel: ${contactUrl}`] : [])
    ].join("\n"),
    html: buildNotificationHtml({ fullName, address, phone, contactUrl })
  });

  queueMetaCapiEvent(ctx, async () =>
    sendMetaCapiEvent(env, {
      event_name: "Lead",
      event_time: unixSeconds(),
      event_id: String(form.get("metaLeadEventId") || form.get("metaEventId") || `rsl-lead-${submissionId}`).trim(),
      event_source_url: sanitizeMetaEventSourceUrl(
        String(form.get("metaEventSourceUrl") || ""),
        request.url
      ),
      action_source: "website",
      user_data: await buildMetaLeadUserData({
        request,
        form,
        contact: highLevelPayload,
        externalId: contactId || highLevelPayload.email || highLevelPayload.phone || submissionId
      })
    })
  );

  return json({ success: true, message: "Estimate request saved.", imageCount: uploadedUrls.length });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return json({ success: false, message: "Unhandled worker error.", detail }, 500);
  }
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers }
  });
}

function workerError(error) {
  const detail = error instanceof Error ? error.message : String(error);
  return json({ success: false, message: "Unhandled worker error.", detail }, 500);
}

async function handleQuoteImageRequest(request, env) {
  if (!env.QUOTE_IMAGES_BUCKET) {
    return new Response("Quote image storage is not configured.", { status: 500 });
  }

  const url = new URL(request.url);
  const rawKey = url.pathname.slice("/quote-images/".length);
  const objectKey = decodeURIComponent(rawKey);

  if (!objectKey || objectKey.includes("..")) {
    return new Response("Image not found.", { status: 404 });
  }

  const object = await env.QUOTE_IMAGES_BUCKET.get(objectKey);

  if (!object || !object.body) {
    return new Response("Image not found.", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata?.(headers);

  if (object.httpEtag) {
    headers.set("etag", object.httpEtag);
  }

  headers.set("cache-control", "public, max-age=31536000, immutable");

  if (!headers.has("content-type")) {
    headers.set("content-type", "application/octet-stream");
  }

  return new Response(object.body, { headers });
}

function buildQuoteImageUrl(request, objectKey, imagePublicBaseUrl) {
  const configuredBaseUrl = String(imagePublicBaseUrl || "").trim();

  if (configuredBaseUrl) {
    return `${configuredBaseUrl.replace(/\/$/, "")}/${encodePathSegments(objectKey)}`;
  }

  const url = new URL(request.url);
  url.pathname = `/quote-images/${encodePathSegments(objectKey)}`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

function encodePathSegments(value) {
  return String(value)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildHighLevelHeaders(token, contentType) {
  const headers = new Headers({
    Accept: "application/json",
    Version: "2021-07-28",
    Authorization: `Bearer ${token}`
  });

  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  return headers;
}

async function readHighLevelError(response) {
  const payload = await response.clone().json().catch(() => null);

  if (Array.isArray(payload?.message)) {
    return payload.message.map((item) => String(item)).join("; ");
  }

  if (typeof payload?.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  if (typeof payload?.error === "string" && payload.error.trim()) {
    return payload.error;
  }

  return await response.text().catch(() => "") || `HighLevel returned HTTP ${response.status}.`;
}

async function requestHighLevelJson(config, token, method, path, body) {
  const response = await fetch(`https://services.leadconnectorhq.com${path}`, {
    method,
    headers: buildHighLevelHeaders(token, body ? "application/json" : undefined),
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    throw new Error(`HighLevel request failed: ${await readHighLevelError(response)}`);
  }

  return await response.json().catch(() => ({}));
}

async function requestHighLevelForm(config, token, path, formData) {
  const response = await fetch(`https://services.leadconnectorhq.com${path}`, {
    method: "POST",
    headers: buildHighLevelHeaders(token),
    body: formData
  });

  if (!response.ok) {
    throw new Error(`HighLevel file upload failed: ${await readHighLevelError(response)}`);
  }

  return await response.json().catch(() => ({}));
}

async function uploadFilesToHighLevelCustomField(config, token, files) {
  if (files.length === 0) {
    return null;
  }

  const formData = new FormData();
  formData.set("id", config.imagesFieldId);
  formData.set("maxFiles", String(files.length));

  for (const file of files) {
    formData.append(config.imagesFieldId, file, file.name);
  }

  const payload = await requestHighLevelForm(
    config,
    token,
    `/locations/${encodeURIComponent(config.locationId)}/customFields/upload`,
    formData
  );

  return extractUploadedFileFieldValue(payload, config.imagesFieldId, files);
}

function extractUploadedFileFieldValue(payload, fieldId, files) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if (isUploadedFileMetaArray(payload.meta)) {
    return payload.meta;
  }

  const uploadedUrlsFromMap =
    payload.uploadedFiles && typeof payload.uploadedFiles === "object" && !Array.isArray(payload.uploadedFiles)
      ? payload.uploadedFiles
      : null;

  if (uploadedUrlsFromMap) {
    const uploadedMeta = files
      .map((file) => {
        const url = uploadedUrlsFromMap[file.name];

        if (typeof url !== "string" || !url.trim()) {
          return null;
        }

        return {
          fieldname: fieldId,
          originalname: file.name,
          mimetype: file.type || "application/octet-stream",
          size: file.size,
          url
        };
      })
      .filter(Boolean);
    const matchedUrls = new Set(uploadedMeta.map((item) => item.url));
    const extraUploadedMeta = Object.entries(uploadedUrlsFromMap)
      .filter(([, value]) => typeof value === "string" && value.trim() && !matchedUrls.has(value))
      .map(([fileName, url]) => ({
        fieldname: fieldId,
        originalname: fileName,
        mimetype: "application/octet-stream",
        size: 0,
        url
      }));
    const combinedMeta = [...uploadedMeta, ...extraUploadedMeta];

    if (combinedMeta.length > 0) {
      return combinedMeta;
    }
  }

  const uploadedUrls =
    payload.uploadedFiles && typeof payload.uploadedFiles === "object" && !Array.isArray(payload.uploadedFiles)
      ? Object.values(payload.uploadedFiles).filter((value) => typeof value === "string" && Boolean(value))
      : [];

  if (uploadedUrls.length > 0) {
    return uploadedUrls;
  }

  for (const key of ["value", "data", "files"]) {
    if (isUploadedFileValueRecord(payload[key])) {
      return payload[key];
    }
  }

  return isUploadedFileValueRecord(payload) ? payload : null;
}

async function updateHighLevelContactCustomFields(config, token, contactId, customFields) {
  if (customFields.length === 0) {
    return;
  }

  await requestHighLevelJson(config, token, "PUT", `/contacts/${encodeURIComponent(contactId)}`, {
    customFields
  });
}

async function getHighLevelContact(config, token, contactId) {
  return requestHighLevelJson(config, token, "GET", `/contacts/${encodeURIComponent(contactId)}`);
}

function extractHighLevelContactId(payload) {
  return (
    readStringPath(payload, ["contact", "id"]) ||
    readStringPath(payload, ["contact", "_id"]) ||
    readStringPath(payload, ["contactId"]) ||
    readStringPath(payload, ["id"]) ||
    readStringPath(payload, ["_id"]) ||
    ""
  );
}

function extractHighLevelCustomFieldValue(payload, fieldId) {
  const contactRecord =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload.contact && typeof payload.contact === "object"
        ? payload.contact
        : payload
      : null;
  const customFields = Array.isArray(contactRecord?.customFields) ? contactRecord.customFields : [];

  return customFields.find((field) => field?.id === fieldId)?.value;
}

function normalizeUploadedFileFieldValue(fieldId, value) {
  const entries = Array.isArray(value)
    ? value
    : value && typeof value === "object" && !Array.isArray(value)
      ? Object.values(value)
      : [];
  const normalized = {};

  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }

    const url = typeof entry.url === "string" && entry.url.trim() ? entry.url : null;
    const documentId = typeof entry.documentId === "string" && entry.documentId.trim() ? entry.documentId : null;
    const metaSource = entry.meta && typeof entry.meta === "object" && !Array.isArray(entry.meta) ? entry.meta : entry;
    const meta = {};

    for (const [key, item] of Object.entries(metaSource)) {
      if (["url", "documentId", "meta"].includes(key)) {
        continue;
      }

      if (item === null || ["string", "number", "boolean"].includes(typeof item)) {
        meta[key] = item;
      }
    }

    if (!meta.fieldname) {
      meta.fieldname = fieldId;
    }

    normalized[crypto.randomUUID()] = {
      url,
      documentId,
      meta
    };
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function isUploadedFileValueRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).some((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return false;
    }

    return (
      typeof item.url === "string" ||
      typeof item.documentId === "string" ||
      (item.meta !== undefined && typeof item.meta === "object")
    );
  });
}

function isUploadedFileMetaArray(value) {
  return (
    Array.isArray(value) &&
    value.every((item) => item && typeof item === "object" && !Array.isArray(item) && typeof item.url === "string")
  );
}

function readStringPath(value, path) {
  let current = value;

  for (const segment of path) {
    if (!current || typeof current !== "object") {
      return "";
    }

    current = current[segment];
  }

  return typeof current === "string" && current.trim() ? current : "";
}

function splitFullName(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const [firstName, ...rest] = trimmed.split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

function slugify(value, fallback = "file") {
  const cleaned = String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return cleaned || fallback;
}

function parseNotificationEmails(value) {
  return [...new Set(String(value || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean))];
}

function buildNotificationHtml({ fullName, address, phone, contactUrl }) {
  const safeName = escapeHtml(fullName);
  const safeAddress = escapeHtml(address);
  const safePhone = escapeHtml(phone);
  const contactButton = contactUrl
    ? `<tr><td style="padding:0 32px 32px;"><a href="${escapeHtml(contactUrl)}" style="display:inline-block;background:#e76f2e;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 20px;border-radius:6px;">Open contact in HighLevel</a></td></tr>`
    : "";

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f2f4f3;font-family:Arial,Helvetica,sans-serif;color:#173f43;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f4f3;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #d9e1df;border-radius:10px;overflow:hidden;">
          <tr><td style="padding:24px 32px;background:#173f43;"><img src="https://rocksolidleveling.com/brand/TextandSlabsHorizontal.png" width="260" alt="Rock Solid Leveling" style="display:block;width:100%;max-width:260px;height:auto;"></td></tr>
          <tr><td style="padding:30px 32px 12px;"><div style="font-size:13px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#e76f2e;">New quote request</div><h1 style="margin:8px 0 0;font-size:26px;line-height:1.25;color:#173f43;">${safeName}</h1></td></tr>
          <tr><td style="padding:12px 32px 28px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:16px;line-height:1.5;"><tr><td style="padding:10px 0;border-bottom:1px solid #e5e9e8;color:#617275;width:90px;">Address</td><td style="padding:10px 0;border-bottom:1px solid #e5e9e8;font-weight:600;">${safeAddress}</td></tr><tr><td style="padding:10px 0;color:#617275;">Phone</td><td style="padding:10px 0;font-weight:600;">${safePhone}</td></tr></table></td></tr>
          ${contactButton}
          <tr><td style="padding:18px 32px;background:#edf3f2;font-size:12px;line-height:1.5;color:#617275;">Submitted through the estimate form at rocksolidleveling.com.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
