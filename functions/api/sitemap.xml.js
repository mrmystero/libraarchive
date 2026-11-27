/**
 * Cloudflare Pages Function: /sitemap.xml
 * Dynamically builds an XML sitemap from your static pages and resources.json
 */

export async function onRequestGet(context) {
  const { request, env } = context;
  const origin = new URL(request.url).origin;

  // 1. Fetch resources.json directly from your static site assets
  const res = await env.ASSETS.fetch(new URL("/resources.json", origin));
  const resources = res.ok ? await res.json() : [];

  // 2. Define your main static pages
  const staticPaths = [
    { path: "/", priority: "1.0", changefreq: "weekly" },
    { path: "/contribute.html", priority: "0.7", changefreq: "monthly" },
    { path: "/about.html", priority: "0.7", changefreq: "monthly" }
  ];

  const today = new Date().toISOString().split("T")[0];

  // 3. Build XML <url> entries
  const staticUrls = staticPaths
    .map(
      (page) => `  <url>
    <loc>${origin}${page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
    )
    .join("\n");

  const resourceUrls = resources
    .map(
      (item) => `  <url>
    <loc>${origin}/resource.html?slug=${encodeURIComponent(item.slug)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
${resourceUrls}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
