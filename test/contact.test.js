import { test } from "node:test";
import assert from "node:assert/strict";
import { validateContact, buildRawEmail, isAllowedOrigin } from "../src/contact.js";

const valid = { name: "Anna Andersson", email: "anna@example.se", message: "Hej David!" };

test("validateContact accepterar giltig data och trimmar fälten", () => {
  const r = validateContact({ ...valid, name: "  Anna  ", message: " Hej " });
  assert.equal(r.error, null);
  assert.deepEqual(r.data, { name: "Anna", email: "anna@example.se", message: "Hej" });
});

test("validateContact kräver namn, e-post och meddelande", () => {
  assert.equal(validateContact({ ...valid, name: "" }).error, "Namn krävs");
  assert.equal(validateContact({ ...valid, email: "" }).error, "E-post krävs");
  assert.equal(validateContact({ ...valid, message: "" }).error, "Meddelande krävs");
});

test("validateContact begränsar längder", () => {
  assert.equal(validateContact({ ...valid, name: "a".repeat(101) }).error, "Namn får vara max 100 tecken");
  assert.equal(validateContact({ ...valid, email: "a".repeat(252) + "@x.se" }).error, "E-post får vara max 255 tecken");
  assert.equal(validateContact({ ...valid, message: "a".repeat(1001) }).error, "Meddelande får vara max 1000 tecken");
});

test("validateContact kräver giltig e-postadress", () => {
  assert.equal(validateContact({ ...valid, email: "inte-en-adress" }).error, "Ange en giltig e-postadress");
  assert.equal(validateContact({ ...valid, email: "a@b" }).error, "Ange en giltig e-postadress");
});

test("validateContact avvisar honeypot tyst som spam", () => {
  const r = validateContact({ ...valid, honeypot: "http://spam" });
  assert.equal(r.spam, true);
});

test("validateContact tål saknade fält och fel typer", () => {
  assert.equal(validateContact({}).error, "Namn krävs");
  assert.equal(validateContact({ name: 42, email: null, message: [] }).error, "Namn krävs");
  assert.equal(validateContact(null).error, "Namn krävs");
});

test("buildRawEmail skapar ett korrekt MIME-meddelande med Reply-To", () => {
  const raw = buildRawEmail({
    from: "kontakt@dajjen.me",
    to: "perdavidbackman@gmail.com",
    data: valid,
    date: new Date("2026-09-11T12:00:00Z"),
    messageId: "<abc@dajjen.me>",
  });
  const [headers, body] = raw.split("\r\n\r\n");
  assert.match(headers, /^From: "dajjen\.me" <kontakt@dajjen\.me>\r\n/);
  assert.match(headers, /\r\nTo: perdavidbackman@gmail\.com\r\n/);
  assert.match(headers, /\r\nReply-To: "Anna Andersson" <anna@example\.se>\r\n/);
  assert.match(headers, /\r\nSubject: =\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=\r\n/);
  assert.match(headers, /\r\nDate: Fri, 11 Sep 2026 12:00:00 GMT\r\n/);
  assert.match(headers, /\r\nMessage-ID: <abc@dajjen\.me>\r\n/);
  assert.match(headers, /\r\nMIME-Version: 1\.0\r\n/);
  assert.match(headers, /\r\nContent-Type: text\/plain; charset=UTF-8\r\n/);
  assert.match(headers, /\r\nContent-Transfer-Encoding: base64$/);
  const decoded = Buffer.from(body.replace(/\r\n/g, ""), "base64").toString("utf8");
  assert.match(decoded, /Namn: Anna Andersson/);
  assert.match(decoded, /E-post: anna@example\.se/);
  assert.match(decoded, /Hej David!/);
});

test("buildRawEmail neutraliserar radbrytningar och citattecken i namn", () => {
  const raw = buildRawEmail({
    from: "kontakt@dajjen.me",
    to: "x@y.se",
    data: { name: 'Evil "Bcc: a@b.se\r\nX-Injected: 1', email: "e@f.se", message: "m" },
  });
  const headers = raw.split("\r\n\r\n")[0];
  // Ingen rad får börja med en insmugglad header, och inga råa radbrytningar får finnas i namnet.
  assert.doesNotMatch(headers, /^(X-Injected|Bcc):/m);
  assert.match(headers, /Reply-To: "Evil Bcc: a@b\.se X-Injected: 1" <e@f\.se>/);
});

test("buildRawEmail avkodar ämnesraden med avsändarens namn", () => {
  const raw = buildRawEmail({ from: "a@dajjen.me", to: "b@c.se", data: valid });
  const m = raw.match(/Subject: =\?UTF-8\?B\?([A-Za-z0-9+/=]+)\?=/);
  assert.ok(m);
  assert.equal(Buffer.from(m[1], "base64").toString("utf8"), "Nytt meddelande från Anna Andersson via dajjen.me");
});

test("isAllowedOrigin tillåter egna domäner och localhost, avvisar andra", () => {
  const allowed = ["https://dajjen.me", "https://www.dajjen.me"];
  assert.equal(isAllowedOrigin("https://dajjen.me", allowed), true);
  assert.equal(isAllowedOrigin("https://www.dajjen.me", allowed), true);
  assert.equal(isAllowedOrigin("http://localhost:8787", allowed), true);
  assert.equal(isAllowedOrigin("https://dajjen-me.dajjen.workers.dev", allowed), true);
  assert.equal(isAllowedOrigin("https://evil.example", allowed), false);
  assert.equal(isAllowedOrigin(null, allowed), false);
});
