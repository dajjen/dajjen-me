import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalRedirect } from "../src/redirects.js";

const CANON = "dajjen.me";

test("http omdirigeras till https på samma värd och sökväg", () => {
  assert.equal(canonicalRedirect(new URL("http://dajjen.me/om?x=1"), CANON), "https://dajjen.me/om?x=1");
});

test("www omdirigeras till apex-domänen", () => {
  assert.equal(canonicalRedirect(new URL("https://www.dajjen.me/"), CANON), "https://dajjen.me/");
  assert.equal(canonicalRedirect(new URL("http://www.dajjen.me/a/b#c"), CANON), "https://dajjen.me/a/b#c");
});

test("kanonisk https-adress returnerar null (ingen omdirigering)", () => {
  assert.equal(canonicalRedirect(new URL("https://dajjen.me/"), CANON), null);
  assert.equal(canonicalRedirect(new URL("https://dajjen.me/api/contact"), CANON), null);
});

test("andra värdar (workers.dev, localhost) lämnas orörda", () => {
  assert.equal(canonicalRedirect(new URL("https://dajjen-me.dajjen.workers.dev/"), CANON), null);
  assert.equal(canonicalRedirect(new URL("http://localhost:8787/"), CANON), null);
});
