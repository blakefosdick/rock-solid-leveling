
export const onRequestGet: PagesFunction<Env> = async ({ env }) =>
  json({
    success: true,
    runtime: "pages-function",
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

interface Env {
  QUOTE_IMAGES_BUCKET: R2Bucket;
  HIGHLEVEL_API_TOKEN: string;
  HIGHLEVEL_LOCATION_ID: string;
  HIGHLEVEL_SLABS_FIELD_ID: string;
  HIGHLEVEL_IMAGES_FIELD_ID: string;
  HIGHLEVEL_NOTES_FIELD_ID: string;
  IMAGE_PUBLIC_BASE_URL: string;
  QUOTE_NOTIFICATION_EMAIL: SendEmail;
  QUOTE_NOTIFICATION_EMAILS: string;
}

type ContactPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  squareFeetOfSlabs: string;
  notes: string;
  submissionId: string;
  fileUploads: string[];
  imageUrlsText: string;
};

type GhlJsonValue =
  | string
  | number
  | boolean
  | null
  | GhlJsonValue[]
  | { [key: string]: GhlJsonValue };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });

const slugify = (value: string, fallback = "file") => {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return cleaned || fallback;
};

const splitFullName = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const [firstName, ...rest] = trimmed.split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
};

const parseNotificationEmails = (value: string) =>
  [...new Set(
    String(value || "")
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean)
  )];

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
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
  ].filter((key) => !(env as unknown as Record<string, unknown>)[key]);

  const notificationRecipients = parseNotificationEmails(env.QUOTE_NOTIFICATION_EMAILS);
  if (notificationRecipients.length === 0) {
    missingConfig.push("QUOTE_NOTIFICATION_EMAILS");
  }

  if (missingConfig.length > 0) {
    return json(
      {
        success: false,
        message: "Function configuration is incomplete.",
        detail: `Missing bindings/vars: ${missingConfig.join(", ")}`
      },
      500
    );
  }

  const form = await request.formData();
  const rawRequestText = String(form.get("rawRequest") || "{}");

  let raw: Record<string, unknown> = {};
  try {
    raw = JSON.parse(rawRequestText) as Record<string, unknown>;
  } catch {
    raw = {};
  }

  const suppliedFirst = String(form.get("firstName") || (raw as any)?.q11_name?.first || "").trim();
  const suppliedLast = String(form.get("lastName") || (raw as any)?.q11_name?.last || "").trim();
  const suppliedFullName = String(form.get("fullName") || "").trim();
  const name = suppliedFirst || suppliedLast ? { firstName: suppliedFirst, lastName: suppliedLast } : splitFullName(suppliedFullName);

  const submissionId = String(form.get("submissionID") || form.get("submissionId") || `rsl-${Date.now()}`);
  const submissionSlug = slugify(submissionId, `submission-${Date.now()}`);
  const now = new Date();
  const datePath = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${String(now.getUTCDate()).padStart(2, "0")}`;

  const imageFiles = form.getAll("images").filter((f): f is File => f instanceof File);
  const uploadedUrls: string[] = [];
  const highLevelImageFiles: File[] = [];

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

  const contact: ContactPayload = {
    firstName: name.firstName,
    lastName: name.lastName,
    email: String(form.get("email") || (raw as any)?.q5_email5 || "").trim(),
    phone: String(form.get("phone") || (raw as any)?.q12_phoneNumber?.full || "").trim(),
    address1: String(form.get("address") || "").trim(),
    city: "",
    state: "",
    postalCode: "",
    country: "United States",
    squareFeetOfSlabs: String(form.get("squareFeet") || (raw as any)?.q13_number || "").trim(),
    notes: String(form.get("details") || (raw as any)?.q17_anyNotes || "").trim(),
    submissionId,
    fileUploads: uploadedUrls,
    imageUrlsText: uploadedUrls.join("\n")
  };

  const highLevelPayload = {
    locationId: config.locationId,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    address1: contact.address1,
    city: contact.city,
    state: contact.state,
    postalCode: contact.postalCode,
    country: contact.country,
    tags: ["website quote form"],
    customFields: [
      { id: config.slabsFieldId, key: "Square Feet of Slabs", field_value: contact.squareFeetOfSlabs },
      { id: config.notesFieldId, key: "Notes", field_value: contact.notes }
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
    const errText = await upsertResponse.text();
    return json({ success: false, message: "HighLevel upsert failed.", detail: errText }, 502);
  }

  const upsertResult = await upsertResponse.json().catch(() => null) as {
    contact?: { id?: string; locationId?: string };
  } | null;
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
  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Not provided";
  const address = contact.address1 || "Not provided";
  const phone = contact.phone || "Not provided";
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
    return json({ success: false, message: "Unhandled function error.", detail }, 500);
  }
};

const buildQuoteImageUrl = (request: Request, objectKey: string, imagePublicBaseUrl: string) => {
  const configuredBaseUrl = String(imagePublicBaseUrl || "").trim();

  if (configuredBaseUrl) {
    return `${configuredBaseUrl.replace(/\/$/, "")}/${encodePathSegments(objectKey)}`;
  }

  const url = new URL(request.url);
  url.pathname = `/quote-images/${encodePathSegments(objectKey)}`;
  url.search = "";
  url.hash = "";
  return url.toString();
};

const encodePathSegments = (value: string) =>
  value
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const buildHighLevelHeaders = (token: string, contentType?: string) => {
  const headers = new Headers({
    Accept: "application/json",
    Version: "2021-07-28",
    Authorization: `Bearer ${token}`
  });

  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  return headers;
};

const readHighLevelError = async (response: Response) => {
  const payload = (await response.clone().json().catch(() => null)) as {
    message?: unknown;
    error?: unknown;
  } | null;

  if (Array.isArray(payload?.message)) {
    return payload.message.map((item) => String(item)).join("; ");
  }

  if (typeof payload?.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  if (typeof payload?.error === "string" && payload.error.trim()) {
    return payload.error;
  }

  return (await response.text().catch(() => "")) || `HighLevel returned HTTP ${String(response.status)}.`;
};

const requestHighLevelJson = async (
  token: string,
  method: string,
  path: string,
  body?: Record<string, unknown>
) => {
  const response = await fetch(`https://services.leadconnectorhq.com${path}`, {
    method,
    headers: buildHighLevelHeaders(token, body ? "application/json" : undefined),
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    throw new Error(`HighLevel request failed: ${await readHighLevelError(response)}`);
  }

  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
};

const requestHighLevelForm = async (token: string, path: string, formData: FormData) => {
  const response = await fetch(`https://services.leadconnectorhq.com${path}`, {
    method: "POST",
    headers: buildHighLevelHeaders(token),
    body: formData
  });

  if (!response.ok) {
    throw new Error(`HighLevel file upload failed: ${await readHighLevelError(response)}`);
  }

  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
};

const uploadFilesToHighLevelCustomField = async (
  config: { locationId: string; imagesFieldId: string },
  token: string,
  files: File[]
): Promise<GhlJsonValue | null> => {
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
    token,
    `/locations/${encodeURIComponent(config.locationId)}/customFields/upload`,
    formData
  );

  return extractUploadedFileFieldValue(payload, config.imagesFieldId, files);
};

const extractUploadedFileFieldValue = (
  payload: Record<string, unknown>,
  fieldId: string,
  files: File[]
): GhlJsonValue | null => {
  if (isUploadedFileMetaArray(payload.meta)) {
    return payload.meta;
  }

  const uploadedUrlsFromMap: Record<string, unknown> | null =
    payload.uploadedFiles && typeof payload.uploadedFiles === "object" && !Array.isArray(payload.uploadedFiles)
      ? payload.uploadedFiles as Record<string, unknown>
      : null;

  if (uploadedUrlsFromMap) {
    const uploadedMeta: Array<Record<string, GhlJsonValue>> = [];

    for (const file of files) {
      const url = uploadedUrlsFromMap[file.name];

      if (typeof url !== "string" || !url.trim()) {
        continue;
      }

      uploadedMeta.push({
        fieldname: fieldId,
        originalname: file.name,
        mimetype: file.type || "application/octet-stream",
        size: file.size,
        url
      });
    }

    const matchedUrls = new Set(uploadedMeta.map((item) => item.url));
    const extraUploadedMeta = Object.entries(uploadedUrlsFromMap)
      .filter(([, value]) => typeof value === "string" && value.trim() && !matchedUrls.has(value))
      .map(([fileName, url]) => ({
        fieldname: fieldId,
        originalname: fileName,
        mimetype: "application/octet-stream",
        size: 0,
        url: url as string
      }));
    const combinedMeta = [...uploadedMeta, ...extraUploadedMeta];

    if (combinedMeta.length > 0) {
      return combinedMeta;
    }
  }

  const uploadedUrls =
    payload.uploadedFiles && typeof payload.uploadedFiles === "object" && !Array.isArray(payload.uploadedFiles)
      ? Object.values(payload.uploadedFiles).filter((value): value is string => typeof value === "string" && Boolean(value))
      : [];

  if (uploadedUrls.length > 0) {
    return uploadedUrls;
  }

  for (const key of ["value", "data", "files"]) {
    const value = payload[key];

    if (isUploadedFileValueRecord(value)) {
      return value as GhlJsonValue;
    }
  }

  return isUploadedFileValueRecord(payload) ? payload as GhlJsonValue : null;
};

const updateHighLevelContactCustomFields = async (
  _config: { locationId: string },
  token: string,
  contactId: string,
  customFields: Array<{ id: string; value: GhlJsonValue }>
) => {
  if (customFields.length === 0) {
    return;
  }

  await requestHighLevelJson(token, "PUT", `/contacts/${encodeURIComponent(contactId)}`, {
    customFields
  });
};

const getHighLevelContact = async (_config: { locationId: string }, token: string, contactId: string) =>
  requestHighLevelJson(token, "GET", `/contacts/${encodeURIComponent(contactId)}`);

const extractHighLevelContactId = (payload: unknown) =>
  readStringPath(payload, ["contact", "id"]) ||
  readStringPath(payload, ["contact", "_id"]) ||
  readStringPath(payload, ["contactId"]) ||
  readStringPath(payload, ["id"]) ||
  readStringPath(payload, ["_id"]) ||
  "";

const extractHighLevelCustomFieldValue = (payload: unknown, fieldId: string) => {
  const contactRecord =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as { contact?: unknown }).contact && typeof (payload as { contact?: unknown }).contact === "object"
        ? (payload as { contact: Record<string, unknown> }).contact
        : payload as Record<string, unknown>
      : null;
  const customFields = Array.isArray(contactRecord?.customFields)
    ? contactRecord.customFields as Array<{ id?: string; value?: unknown }>
    : [];

  return customFields.find((field) => field.id === fieldId)?.value;
};

const normalizeUploadedFileFieldValue = (
  fieldId: string,
  value: unknown
): Record<string, { meta: Record<string, GhlJsonValue>; url: string | null; documentId: string | null }> | null => {
  const entries = Array.isArray(value)
    ? value
    : value && typeof value === "object" && !Array.isArray(value)
      ? Object.values(value)
      : [];
  const normalized: Record<string, { meta: Record<string, GhlJsonValue>; url: string | null; documentId: string | null }> = {};

  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }

    const entryRecord = entry as Record<string, unknown>;
    const url = typeof entryRecord.url === "string" && entryRecord.url.trim() ? entryRecord.url : null;
    const documentId = typeof entryRecord.documentId === "string" && entryRecord.documentId.trim() ? entryRecord.documentId : null;
    const metaSource =
      entryRecord.meta && typeof entryRecord.meta === "object" && !Array.isArray(entryRecord.meta)
        ? entryRecord.meta as Record<string, unknown>
        : entryRecord;
    const meta: Record<string, GhlJsonValue> = {};

    for (const [key, item] of Object.entries(metaSource)) {
      if (["url", "documentId", "meta"].includes(key)) {
        continue;
      }

      if (item === null || ["string", "number", "boolean"].includes(typeof item)) {
        meta[key] = item as GhlJsonValue;
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
};

const isUploadedFileValueRecord = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).some((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return false;
    }

    const candidate = item as Record<string, unknown>;
    return (
      typeof candidate.url === "string" ||
      typeof candidate.documentId === "string" ||
      (candidate.meta !== undefined && typeof candidate.meta === "object")
    );
  });
};

const isUploadedFileMetaArray = (value: unknown): value is Array<Record<string, GhlJsonValue>> =>
  Array.isArray(value) &&
  value.every((item) => item && typeof item === "object" && !Array.isArray(item) && typeof (item as { url?: unknown }).url === "string");

const readStringPath = (value: unknown, path: string[]) => {
  let current = value;

  for (const segment of path) {
    if (!current || typeof current !== "object") {
      return "";
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === "string" && current.trim() ? current : "";
};

const buildNotificationHtml = ({
  fullName,
  address,
  phone,
  contactUrl
}: {
  fullName: string;
  address: string;
  phone: string;
  contactUrl: string;
}) => {
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
};

const escapeHtml = (value: string) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
