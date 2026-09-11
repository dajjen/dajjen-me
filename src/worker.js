/**
 * Cloudflare Worker för dajjen.me
 *
 * - Statiska filer i ./public serveras av Workers Static Assets (ASSETS-bindningen).
 * - POST /api/contact tar emot kontaktformuläret och skickar mejl via
 *   Email Routing (send_email-bindningen CONTACT_EMAIL).
 */
import { EmailMessage } from "cloudflare:email";
import { validateContact, buildRawEmail, isAllowedOrigin } from "./contact.js";

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=UTF-8", "Cache-Control": "no-store", ...extra },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact") {
      return handleContact(request, env);
    }

    // Allt annat: statiska filer (404.html serveras automatiskt vid miss).
    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env) {
  if (request.method !== "POST") {
    return json({ error: "Method Not Allowed" }, 405, { Allow: "POST" });
  }

  const allowedOrigins = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!isAllowedOrigin(request.headers.get("Origin"), allowedOrigins)) {
    return json({ error: "Forbidden" }, 403);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Ogiltig förfrågan" }, 400);
  }

  const result = validateContact(payload);
  if (result.spam) return json({ ok: true }); // låtsas lyckas för botar
  if (result.error) return json({ error: result.error }, 400);

  const from = env.CONTACT_FROM;
  const to = env.CONTACT_TO;
  if (!from || !to || !env.CONTACT_EMAIL) {
    console.error("Kontaktformuläret saknar konfiguration (CONTACT_FROM/CONTACT_TO/CONTACT_EMAIL).");
    return json({ error: "Formuläret är inte konfigurerat ännu." }, 503);
  }

  try {
    const raw = buildRawEmail({ from, to, data: result.data });
    await env.CONTACT_EMAIL.send(new EmailMessage(from, to, raw));
    return json({ ok: true });
  } catch (err) {
    console.error("Kunde inte skicka mejl:", err);
    return json({ error: "Det gick inte att skicka meddelandet. Försök igen senare." }, 502);
  }
}
