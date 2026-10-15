# Graf-Gruppe Reel-Frame (Premiere Pro)

Der Schnittstil der Referenz-Anzeige als Baukasten für Premiere Pro. Alle Grafiken
(Captions, Hook, Gleichung, Fakten, Proof, Karussell, Transition, CTA, Energieangaben)
werden als transparente Clips (.mov mit Alpha, 1080×1920, 25 fps) gerendert und in
Premiere einfach über das Video gelegt.

- `renderer/brand.json`: Farben und Schriften (aktuell Platzhalter aus der Referenz)
- `projekte/beispiel/spec.json`: Inhalte eines Videos, `untertitel.srt`: Untertitel aus Premiere
- `projekte/beispiel/export/`: fertig gerenderte Beispiel-Overlays
- `docs/Graf_Reel_Styleguide.html`: Zeitachse, Module, SFX-Liste, Ablauf je Videotyp

## Rendern

Benötigt Node.js 20+ und ffmpeg.

```
cd renderer
npm install
npx playwright install chromium
node render.mjs ../projekte/beispiel/spec.json            # alles
node render.mjs ../projekte/beispiel/spec.json --nur 09_CTA
node render.mjs ../projekte/beispiel/spec.json --vorschau  # nur Standbilder
```

Codec: QuickTime Animation, für bewegte Fotoflächen ProRes 4444. `--prores` erzwingt ProRes für alles.
