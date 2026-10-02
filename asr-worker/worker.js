const ALLOWED_ORIGIN = "https://zeyajing-cpu.github.io";
const ENGINE_BY_LANGUAGE = {
  "en-US": "16k_en",
  "ja-JP": "16k_ja",
  "ko-KR": "16k_ko",
  "de-DE": "16k_de"
};

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  };
}

function toBase64(bytes) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function randomNonce() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String((values[0] % 9000000000) + 1000000000);
}

async function sign(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
  );
  return toBase64(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (origin !== ALLOWED_ORIGIN) return new Response("Forbidden", { status: 403 });
    const headers = corsHeaders(origin);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers });

    const requestUrl = new URL(request.url);
    if (requestUrl.pathname !== "/sign") return new Response("Not found", { status: 404, headers });
    const language = requestUrl.searchParams.get("lang");
    const engine = ENGINE_BY_LANGUAGE[language];
    if (!engine) return Response.json({ error: "Unsupported language" }, { status: 400, headers });
    if (!env.TENCENT_APP_ID || !env.TENCENT_SECRET_ID || !env.TENCENT_SECRET_KEY) {
      return Response.json({ error: "Tencent ASR secrets are not configured" }, { status: 503, headers });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const params = new URLSearchParams({
      engine_model_type: engine,
      expired: String(timestamp + 60),
      needvad: "1",
      nonce: randomNonce(),
      secretid: env.TENCENT_SECRET_ID,
      timestamp: String(timestamp),
      voice_format: "1",
      voice_id: crypto.randomUUID()
    });
    params.sort();
    const hostPath = `asr.cloud.tencent.com/asr/v2/${env.TENCENT_APP_ID}`;
    const signature = await sign(env.TENCENT_SECRET_KEY, `${hostPath}?${params.toString()}`);
    params.set("signature", signature);
    const signedUrl = `wss://${hostPath}?${params.toString()}`;
    return Response.json({ url: signedUrl }, { headers });
  }
};

