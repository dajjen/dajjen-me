/**
 * Ren logik för kontaktformuläret: validering och MIME-bygge.
 * Inga Cloudflare-beroenden här, så modulen kan testas med node:test.
 */

const RULES = [
  { key: "name", max: 100, required: "Namn krävs", tooLong: "Namn får vara max 100 tecken" },
  { key: "email", max: 255, required: "E-post krävs", tooLong: "E-post får vara max 255 tecken" },
  { key: "message", max: 1000, required: "Meddelande krävs", tooLong: "Meddelande får vara max 1000 tecken" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const str = (v) => (typeof v === "string" ? v.trim() : "");

/**
 * @returns {{ error: string|null, spam?: boolean, data?: {name:string,email:string,message:string} }}
 */
export function validateContact(input) {
  const src = input && typeof input === "object" ? input : {};
  if (str(src.honeypot)) return { error: null, spam: true };

  const data = { name: str(src.name), email: str(src.email), message: str(src.message) };

  for (const r of RULES) {
    const v = data[r.key];
    if (!v) return { error: r.required };
    if (v.length > r.max) return { error: r.tooLong };
  }
  if (!EMAIL_RE.test(data.email)) return { error: "Ange en giltig e-postadress" };

  return { error: null, data };
}

/* ---------- MIME helpers ---------- */

const b64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));

/** RFC 2047-kodat huvudvärde, säkert för icke-ASCII. */
const encodedWord = (s) => `=?UTF-8?B?${b64(s)}?=`;

/** Tar bort allt som kan bryta en headerrad eller smyga in en ny header. */
const headerSafe = (s) => String(s).replace(/[\r\n"\\]/g, " ").replace(/\s+/g, " ").trim();

/** Radbryter base64 enligt RFC 2045 (max 76 tecken per rad). */
const wrap76 = (s) => s.match(/.{1,76}/g).join("\r\n");

/**
 * Bygger ett komplett rått e-postmeddelande (RFC 5322) som text.
 */
export function buildRawEmail({ from, to, data, date = new Date(), messageId }) {
  const fromDomain = from.split("@")[1] || "dajjen.me";
  const name = headerSafe(data.name);
  const senderEmail = headerSafe(data.email).replace(/\s/g, "");
  const id = messageId || `<${crypto.randomUUID()}@${fromDomain}>`;

  const subject = `Nytt meddelande från ${name} via ${fromDomain}`;
  const body = [
    `Namn: ${data.name}`,
    `E-post: ${data.email}`,
    `Skickat: ${date.toISOString()}`,
    "",
    "Meddelande:",
    data.message,
    "",
    "--",
    `Skickat via kontaktformuläret på ${fromDomain}`,
  ].join("\n");

  const headers = [
    `From: "${fromDomain}" <${from}>`,
    `To: ${to}`,
    `Reply-To: "${name}" <${senderEmail}>`,
    `Subject: ${encodedWord(subject)}`,
    `Date: ${date.toUTCString()}`,
    `Message-ID: ${id}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
  ];

  return headers.join("\r\n") + "\r\n\r\n" + wrap76(b64(body)) + "\r\n";
}

/**
 * Tillåter anrop från sajtens egna domäner, workers.dev-förhandsvisningar
 * och localhost under utveckling.
 */
export function isAllowedOrigin(origin, allowed) {
  if (!origin) return false;
  if (allowed.includes(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".workers.dev");
  } catch {
    return false;
  }
}
