export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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
        hasQuoteImagesBucket: Boolean(env.QUOTE_IMAGES_BUCKET),
        hasHighLevelApiToken: Boolean(env.HIGHLEVEL_API_TOKEN),
        hasLocationId: Boolean(env.HIGHLEVEL_LOCATION_ID),
        hasSlabsFieldId: Boolean(env.HIGHLEVEL_SLABS_FIELD_ID),
        hasImagesFieldId: Boolean(env.HIGHLEVEL_IMAGES_FIELD_ID),
        hasNotesFieldId: Boolean(env.HIGHLEVEL_NOTES_FIELD_ID),
        hasImagePublicBaseUrl: Boolean(env.IMAGE_PUBLIC_BASE_URL),
        hasQuoteNotificationEmail: Boolean(env.QUOTE_NOTIFICATION_EMAIL),
        hasQuoteNotificationRecipients: parseNotificationEmails(env.QUOTE_NOTIFICATION_EMAILS).length > 0
      });
    }

    if (request.method === "POST" && url.pathname === "/rock-solid-website-quote") {
      return handleQuoteSubmission(request, env);
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
      return handleGoogleReviews(env);
    }

    return env.ASSETS.fetch(request);
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

async function handleQuoteSubmission(request, env) {
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
    imagePublicBaseUrl: env.IMAGE_PUBLIC_BASE_URL || "https://images.rocksolidleveling.com"
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

  const submissionId = String(form.get("submissionID") || form.get("submissionId") || `rsl-${Date.now()}`);
  const submissionSlug = slugify(submissionId, `submission-${Date.now()}`);
  const now = new Date();
  const datePath = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${String(now.getUTCDate()).padStart(2, "0")}`;

  const imageFiles = form.getAll("images").filter((f) => f instanceof File);
  const uploadedUrls = [];

  for (let index = 0; index < imageFiles.length; index += 1) {
    const file = imageFiles[index];
    const originalName = file.name || `upload-${index + 1}`;
    const extensionMatch = originalName.match(/\.[A-Za-z0-9]+$/);
    const extension = extensionMatch ? extensionMatch[0].toLowerCase() : "";
    const baseName = extension ? originalName.slice(0, -extension.length) : originalName;
    const safeFileName = `${String(index + 1).padStart(2, "0")}-${slugify(baseName, `upload-${index + 1}`)}${extension}`;
    const objectKey = `website-quotes/${datePath}/${submissionSlug}/${safeFileName}`;

    await env.QUOTE_IMAGES_BUCKET.put(objectKey, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type || "application/octet-stream"
      }
    });

    uploadedUrls.push(`${String(config.imagePublicBaseUrl).replace(/\/$/, "")}/${objectKey}`);
  }

  const highLevelPayload = {
    locationId: config.locationId,
    firstName: name.firstName,
    lastName: name.lastName,
    email: String(form.get("email") || raw?.q5_email5 || "").trim(),
    phone: String(form.get("phone") || raw?.q12_phoneNumber?.full || "").trim(),
    address1: String(form.get("address") || "").trim(),
    city: "",
    state: "",
    postalCode: "",
    country: "United States",
    tags: ["website quote form"],
    customFields: [
      { id: config.slabsFieldId, key: "Square Feet of Slabs", field_value: String(form.get("squareFeet") || raw?.q13_number || "").trim() },
      { id: config.imagesFieldId, key: "Images of Concrete", field_value: uploadedUrls.join("\n") },
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
  const contactId = String(upsertResult?.contact?.id || "").trim();
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
