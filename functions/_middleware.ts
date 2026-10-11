/**
 * 1) Canonical host: 301 www → https://localtakehome.com (keep path+query)
 * 2) Never serve /.publish/* build notes (404)
 */

const CANONICAL_HOST = "localtakehome.com";

export async function onRequest(context: {
  request: Request;
  next: () => Promise<Response>;
}): Promise<Response> {
  const url = new URL(context.request.url);
  const host = url.hostname.toLowerCase();

  if (host === `www.${CANONICAL_HOST}`) {
    const dest = `https://${CANONICAL_HOST}${url.pathname}${url.search}`;
    return Response.redirect(dest, 301);
  }

  if (url.pathname === "/.publish" || url.pathname.startsWith("/.publish/")) {
    return new Response("Not Found", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "cdn-cache-control": "no-store",
      },
    });
  }

  return context.next();
}
