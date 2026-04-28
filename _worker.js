export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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

  const missingConfig = [
    "QUOTE_IMAGES_BUCKET",
    "HIGHLEVEL_API_TOKEN",
    "HIGHLEVEL_LOCATION_ID",
    "HIGHLEVEL_SLABS_FIELD_ID",
    "HIGHLEVEL_IMAGES_FIELD_ID",
    "HIGHLEVEL_NOTES_FIELD_ID",
    "IMAGE_PUBLIC_BASE_URL"
  ].filter((key) => !env[key]);

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

    uploadedUrls.push(`${String(env.IMAGE_PUBLIC_BASE_URL || "").replace(/\/$/, "")}/${objectKey}`);
  }

  const highLevelPayload = {
    locationId: env.HIGHLEVEL_LOCATION_ID,
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
      { id: env.HIGHLEVEL_SLABS_FIELD_ID, key: "Square Feet of Slabs", field_value: String(form.get("squareFeet") || raw?.q13_number || "").trim() },
      { id: env.HIGHLEVEL_IMAGES_FIELD_ID, key: "Images of Concrete", field_value: uploadedUrls.join("\n") },
      { id: env.HIGHLEVEL_NOTES_FIELD_ID, key: "Notes", field_value: String(form.get("details") || raw?.q17_anyNotes || "").trim() }
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
