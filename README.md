# dajjen.me

Statisk personlig sajt för David Backman. Ingen byggprocess: ren HTML, CSS och JavaScript.

## Filer

- `index.html` – hela sajten (hero, Om mig, Expertis, Erfarenhet, Kontakt)
- `styles.css` – all styling, designtokens i `:root`
- `main.js` – navigation, scroll-reveal och kontaktformulär (Supabase edge function)
- `404.html` – felsida
- `assets/` – optimerade bilder (WebP + JPG-fallback, OG-bild)

## Lokal utveckling med Lando

```bash
lando start          # startar nginx, sajten nås på https://dajjen-me.lndo.site
lando check          # validerar nginx-konfigurationen
lando stop           # stoppar miljön
lando destroy        # tar bort containrarna
```

Nginx-konfigurationen ligger i `.lando/nginx/default.conf` och skickar
`Cache-Control: no-store` så att ändringar i CSS/JS syns direkt vid omladdning.

## Deploy

Kopiera innehållet i mappen (utom `.lando*` och `README.md`) till webbroten.
Bumpa `?v=N` på `styles.css` och `main.js` i `index.html` och `404.html` när
de ändras, så att besökare inte får gamla cachade filer.
