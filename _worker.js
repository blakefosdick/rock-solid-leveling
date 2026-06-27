export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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

    return env.ASSETS.fetch(request);
  }
};

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
    tags: ["website contact form", "website quote form"],
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

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
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
