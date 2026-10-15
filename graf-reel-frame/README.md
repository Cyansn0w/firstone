# Graf-Gruppe Reel-Frame

Nachbau des Schnittstils der Referenz-Werbeanzeige für After Effects und Premiere Pro.

1. Farben (HEX) und Schriften (PostScript-Namen) in `ae/graf_config.jsxinc` eintragen.
2. In After Effects `ae/01_GrafReel_Framework.jsx` ausführen. Das Skript baut alle Module und exportiert sie optional als `.mogrt` für Premiere.
3. Pro Video: Captions aus SRT mit `ae/02_GrafReel_Captions_aus_SRT.jsx`, Zooms mit `ae/03_GrafReel_Zoom_Rig.jsx`.

Styleguide mit Zeitachse, SFX-Liste und Ablauf je Videotyp: `docs/Graf_Reel_Styleguide.html`.
