interface Env {
  QUOTE_IMAGES_BUCKET: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  if (!env.QUOTE_IMAGES_BUCKET) {
    return new Response("Quote image storage is not configured.", { status: 500 });
  }

  const objectKey = Array.isArray(params.path) ? params.path.join("/") : String(params.path || "");

  if (!objectKey || objectKey.includes("..")) {
    return new Response("Image not found.", { status: 404 });
  }

  const object = await env.QUOTE_IMAGES_BUCKET.get(objectKey);

  if (!object || !object.body) {
    return new Response("Image not found.", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);

  if (object.httpEtag) {
    headers.set("etag", object.httpEtag);
  }

  if (!headers.has("content-type")) {
    headers.set("content-type", "application/octet-stream");
  }

  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
};
