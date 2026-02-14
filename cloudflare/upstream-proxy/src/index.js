export default {
  async fetch(request, env) {
    // Optional access control so only your backend can call this proxy.
    if (env.UPSTREAM_PROXY_TOKEN) {
      const provided = request.headers.get("x-upstream-token");
      if (!provided || provided !== env.UPSTREAM_PROXY_TOKEN) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    const incoming = new URL(request.url);
    const path = incoming.pathname.replace(/^\/+/, "");

    // Allow only year JSON files like /2026.json
    if (!/^\d{4}\.json$/.test(path)) {
      return new Response("Not Found", { status: 404 });
    }

    if (!env.ORIGIN_BASE_URL) {
      return new Response("Proxy not configured", { status: 500 });
    }

    const target = `${env.ORIGIN_BASE_URL.replace(/\/+$/, "")}/${path}`;
    const upstream = await fetch(target, {
      method: "GET",
      headers: { "User-Agent": "menaxa-upstream-proxy/1.0" },
      cf: { cacheTtl: 300, cacheEverything: true },
    });

    if (!upstream.ok) {
      return new Response("Upstream unavailable", { status: upstream.status });
    }

    const headers = new Headers(upstream.headers);
    headers.set("Cache-Control", "public, max-age=300");
    headers.delete("set-cookie");
    return new Response(upstream.body, { status: 200, headers });
  },
};

