# dajjen.me

Personlig sajt för David Backman. Statisk HTML, CSS och JavaScript som hostas
på Cloudflare Workers, med ett kontaktformulär som mejlar via Cloudflare
Email Routing. Ingen byggprocess för sajten själv.

## Struktur

```
public/            Sajten (serveras som statiska filer)
  index.html       Hela sidan: hero, Om mig, Expertis, Erfarenhet, Kontakt
  styles.css       All styling, designtokens i :root
  main.js          Navigation, scroll-reveal, kontaktformulär (POST /api/contact)
  404.html         Felsida
  assets/          Optimerade bilder (WebP + JPG-fallback, OG-bild)
src/
  worker.js        Cloudflare Worker: serverar public/ och hanterar /api/contact
  contact.js       Validering och MIME-bygge, utan Cloudflare-beroenden
test/              Enhetstester (node:test)
wrangler.jsonc     Cloudflare-konfiguration (assets, send_email, vars, domäner)
.lando.yml         Lando-miljö med nginx för snabb förhandsvisning
```

## Utveckling

```bash
npm install        # installerar wrangler
npm test           # enhetstester
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

## Deploy till Cloudflare

Sajten deployas automatiskt när `main` pushas, om repot är kopplat till
Workers Builds i Cloudflare-dashboarden. Manuell deploy:

```bash
npx wrangler login
npm run deploy
```

### Engångsuppsättning i Cloudflare

1. Lägg till zonen `dajjen.me` under **Add a domain** och byt nameservers hos
   domänleverantören till de Cloudflare anger.
2. Aktivera **Email Routing** på zonen. Lägg till `perdavidbackman@gmail.com`
   som destinationsadress och verifiera via mejlet som skickas. Skapa
   adressen `kontakt@dajjen.me` som vidarebefordrar dit.
3. Gå till **Workers & Pages → Create → Import a repository**, välj
   `dajjen/dajjen-me`. Byggkommando lämnas tomt, deploy-kommando
   `npx wrangler deploy`. Första deployen skapar workern, kopplar domänerna
   i `routes` och `send_email`-bindningen.

Den gamla Supabase-funktionen används inte längre och kan tas bort.

### Cache

`styles.css` och `main.js` laddas med `?v=N` i `index.html` och `404.html`.
Bumpa siffran när filerna ändras så att besökare inte får cachade versioner.
