# dajjen.me

Personlig sajt för David Backman. Statisk HTML, CSS och JavaScript som hostas
på **Cloudflare Workers**, med ett kontaktformulär som mejlar via **Cloudflare
Email Routing**. Ingen byggprocess för sajten själv.

## Översikt: var allt ligger

| Vad | Var | Kommentar |
|---|---|---|
| Kod | GitHub: https://github.com/dajjen/dajjen-me | Branch `main` |
| Hosting | Cloudflare Workers, worker `dajjen-me` | Konto `perdavidbackman@gmail.com`, Free-planen |
| Domän (registrering) | IONOS, https://login.ionos.se | Registrerad 2025-11-27, förnyas årligen i november |
| DNS-poster | Cloudflare, zonen `dajjen.me` | Nameservers `kevin.ns.cloudflare.com` och `pam.ns.cloudflare.com` |
| Kontaktformulär | Worker `/api/contact` → Email Routing | Skickar från `kontakt@dajjen.me` till `perdavidbackman@gmail.com` |
| Lokal utveckling | `npm run dev` (Wrangler) eller Lando | Se nedan |

Sajten svarar på `https://dajjen.me`. `http://` och `www.dajjen.me`
omdirigeras dit med 301.

## Hosting på Cloudflare

Sajten körs som en Cloudflare Worker med **Workers Static Assets**:

- Filerna i `public/` laddas upp som statiska filer och serveras från
  Cloudflares edge. `404.html` returneras med status 404 för okända sökvägar.
- `src/worker.js` körs före asset-serveringen (`run_worker_first`) och gör
  tre saker: omdirigerar till kanonisk adress, hanterar `POST /api/contact`,
  och skickar allt annat vidare till de statiska filerna.
- Kontaktformuläret skickar mejl via `send_email`-bindningen `CONTACT_EMAIL`
  till en adress som är verifierad under Email Routing. Inga externa
  tjänster eller API-nycklar behövs.
- All konfiguration ligger i `wrangler.jsonc`: assets, bindningar,
  miljövariabler och egna domäner (`routes`).

Dashboard: https://dash.cloudflare.com → **Compute → Workers & Pages →
dajjen-me**. Loggar och fel visas under fliken **Observability** på workern.

## Deploya ny kod

Det finns ingen automatisk deploy ännu. Ändringar går live först när någon
kör `npm run deploy`. **Production deployas bara från `main`.** Skriptet
`scripts/require-main.sh` körs automatiskt före deploy och stoppar om du står
på en annan branch, har ocommittade ändringar eller inte har pushat `main`.
Arbeta på en featurebranch, merga till `main`, pusha och deploya därifrån.

1. Gör ändringen i `public/` (sajten) eller `src/` (workern). Ändras CV:t:
   redigera `cv/cv.html` och kör `npm run cv` så att PDF:en byggs om.
2. Om `styles.css` eller `main.js` ändrats: bumpa `?v=N` på raderna som
   laddar dem i `public/index.html` och `public/404.html`, så att besökare
   inte får en cachad version.
3. Testa lokalt: `npm test` och `npm run dev` (se Utveckling).
4. Committa, merga till `main` och pusha till GitHub så att repot speglar
   det som ligger live.
5. Deploya från `main`:

```bash
npx wrangler login   # bara första gången på en ny dator, öppnar webbläsaren
npm run deploy       # laddar upp public/ och workern, live inom några sekunder
```

Verifiera med `curl -I https://dajjen.me/` eller i webbläsaren. Behöver du
backa: **Workers & Pages → dajjen-me → Deployments → Rollback** i
dashboarden.

### Slå på automatisk deploy vid push (valfritt)

I dashboarden: **Workers & Pages → dajjen-me → Settings → Build → Connect**,
välj repot `dajjen/dajjen-me` och branch `main`. Lämna byggkommandot tomt och
sätt deploy-kommandot till `npx wrangler deploy`. Därefter deployar
Cloudflare varje push till `main`, och steg 5 ovan kan hoppas över.

## Domän och DNS

Domänen `dajjen.me` är **registrerad hos IONOS**. IONOS sköter registrering,
förnyelse och nameserver-inställningen, ingenting annat. Nameservers pekar
på Cloudflare (bytt 2026-09-11). Vill du ändra dem: logga in på
https://login.ionos.se → **Domäner & SSL → dajjen.me → Namnservrar**.

**DNS-posterna hanteras i Cloudflare**, under zonen `dajjen.me` → **DNS**.
Poster som läggs in hos IONOS har ingen effekt så länge nameservers pekar på
Cloudflare. Posterna som finns idag skapas och ägs av Cloudflare själv:

- A/AAAA för `dajjen.me` och `www` skapas av workerns `routes` vid deploy.
- MX och SPF (TXT) skapas av Email Routing.

Domänen var tidigare kopplad till Lovable via Domain Connect. Den kopplingen
och Lovable-hostingen är avvecklade, liksom Supabase-funktionen som
formuläret använde förut.

## Struktur

```
public/            Sajten (serveras som statiska filer)
  index.html       Hela sidan: hero, Om mig, Expertis, Erfarenhet, Kontakt
  styles.css       All styling, designtokens i :root
  main.js          Navigation, scroll-reveal, kontaktformulär (POST /api/contact)
  404.html         Felsida
  assets/          Optimerade bilder (WebP + JPG-fallback, OG-bild)
  cv/              Nedladdningsbart CV (david-backman-cv.pdf), byggs från cv/
cv/
  cv.html          Källan till CV:t, samma palett och typsnitt som sajten
  build.sh         Renderar cv.html till public/cv/david-backman-cv.pdf
scripts/
  require-main.sh  Körs före deploy: kräver main, rent arbetsträd och pushad main
src/
  worker.js        Cloudflare Worker: omdirigeringar, /api/contact, statiska filer
  contact.js       Validering och MIME-bygge, utan Cloudflare-beroenden
  redirects.js     http->https och www->apex
test/              Enhetstester (node:test)
wrangler.jsonc     Cloudflare-konfiguration (assets, send_email, vars, domäner)
.lando.yml         Lando-miljö med nginx för snabb förhandsvisning
```

## Utveckling

```bash
npm install        # installerar wrangler
npm test           # enhetstester
npm run cv         # bygger CV-PDF:en med headless Chromium (kräver chromium i PATH)
npm run dev        # hela sajten inkl. formulär på http://localhost:8787
npm run check      # dry-run av deploy, validerar wrangler.jsonc
```

I `npm run dev` skrivs skickade mejl till `.wrangler/tmp/email/` i stället
för att skickas på riktigt.

### Lando

```bash
lando start        # nginx på https://dajjen-me.lndo.site
lando check        # validerar nginx-konfigurationen
```

Lando serverar bara `public/` utan cache. Kontaktformuläret svarar 503 där,
eftersom workern inte körs i nginx. Använd `npm run dev` för att testa det.

## Engångsuppsättningen som gjordes 2026-09-11

Dokumenterat för att kunna återskapas på ett nytt Cloudflare-konto.

1. Zonen `dajjen.me` lades till i Cloudflare, gamla IONOS/Lovable-poster
   raderades, nameservers byttes hos IONOS.
2. Email Routing aktiverades under **Compute → Email Service → Email
   Routing**. `perdavidbackman@gmail.com` verifierades som destination och
   `kontakt@dajjen.me` skapades som vidarebefordrande adress.
3. Första deployen kördes manuellt med `npx wrangler login` + `npm run deploy`.
   Den skapade workern, kopplade båda domänerna och `send_email`-bindningen.
