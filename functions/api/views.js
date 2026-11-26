/**
 * Cloudflare Pages Function: /api/views
 * Reuses the existing `LIKES_KV` binding to track total site visits.
 */

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

const KV_KEY = "site:total_views";

async function readViews(kv) {
  if (!kv) return 0;
  const val = await kv.get(KV_KEY);
  const parsed = Number.parseInt(val || "0", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export async function onRequestGet(context) {
  const views = await readViews(context.env.LIKES_KV);
  return new Response(
    JSON.stringify({ views }),
    { status: 200, headers: JSON_HEADERS }
  );
}

export async function onRequestPost(context) {
  const kv = context.env.LIKES_KV;
  if (!kv) {
    return new Response(
      JSON.stringify({ views: 0, kvBound: false }),
      { status: 200, headers: JSON_HEADERS }
    );
  }

  const current = await readViews(kv);
  const updated = current + 1;
  await kv.put(KV_KEY, String(updated));

  return new Response(
    JSON.stringify({ views: updated }),
    { status: 200, headers: JSON_HEADERS }
  );
}
