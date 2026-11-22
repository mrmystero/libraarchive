/**
 * Cloudflare Pages Function: /api/likes
 * Expects a KV namespace binding named `LIKES_KV` in Cloudflare Pages settings.
 */

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function sanitizeSlug(raw) {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 120) return "";
  return /^[a-zA-Z0-9_-]+$/.test(trimmed) ? trimmed : "";
}

async function readLikes(kv, slug) {
  if (!kv) return 0;
  const val = await kv.get(`likes:${slug}`);
  const parsed = Number.parseInt(val || "0", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const kv = env.LIKES_KV;

  // Batch lookup: /api/likes?slugs=slug-1,slug-2
  const slugsParam = url.searchParams.get("slugs");
  if (slugsParam !== null) {
    const slugs = slugsParam
      .split(",")
      .map(sanitizeSlug)
      .filter(Boolean)
      .slice(0, 100);

    const entries = await Promise.all(
      slugs.map(async (slug) => [slug, await readLikes(kv, slug)])
    );

    return new Response(
      JSON.stringify({ likes: Object.fromEntries(entries) }),
      { status: 200, headers: JSON_HEADERS }
    );
  }

  // Single slug lookup: /api/likes?slug=slug-1
  const slug = sanitizeSlug(url.searchParams.get("slug"));
  if (!slug) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid slug parameter." }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  const likes = await readLikes(kv, slug);
  return new Response(
    JSON.stringify({ slug, likes }),
    { status: 200, headers: JSON_HEADERS }
  );
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const kv = env.LIKES_KV;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON payload." }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  const slug = sanitizeSlug(body?.slug);
  if (!slug) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid slug." }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  const action = body?.action === "unlike" ? "unlike" : "like";

  if (!kv) {
    // Graceful fallback if LIKES_KV binding has not been configured yet
    return new Response(
      JSON.stringify({ slug, likes: action === "like" ? 1 : 0, kvBound: false }),
      { status: 200, headers: JSON_HEADERS }
    );
  }

  const current = await readLikes(kv, slug);
  const updated = action === "unlike" ? Math.max(0, current - 1) : current + 1;

  await kv.put(`likes:${slug}`, String(updated));

  return new Response(
    JSON.stringify({ slug, likes: updated }),
    { status: 200, headers: JSON_HEADERS }
  );
}