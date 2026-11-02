# Luchs-Website

Statische Website für GitHub Pages: https://realcraftguy-com.github.io/luchsnetzwerk-website/

## Ändern

1. Texte in `_quelle/seiten/<seite>.html` bearbeiten. Kopf, Navigation und Fuß stehen einmal in `_quelle/layout.html`.
2. `python3 build.py` ausführen. Es schreibt alle `*.html` neu, dazu `sitemap.xml` und `robots.txt`, und hängt eine neue Versionsnummer an CSS und JS.
3. `git commit -am "…" && git push`. Nach etwa einer Minute ist die Änderung online.

Die `*.html` im Hauptordner nie direkt bearbeiten, der nächste Build überschreibt sie.

## Was wo steht

| Datei | Inhalt |
|---|---|
| `assets/site.js` (oben) | Serveradresse, Version, Discord-Link, Vote-Seiten, Status-Dienste |
| `assets/style.css` | Design-System (Farben, Schrift, Abstände, Animationen) |
| `assets/anim.js` | Rückfall für Scroll-Animationen, Pixel-Konfetti |
| `assets/img/` | Renders der Welten und Modelle (AVIF + WebP) |
| `assets/musik/` | Hörproben der eigenen Musik |

In den Seiten erzeugt `{{bild:name|Alt-Text}}` ein `<picture>` aus `assets/img/name-800/1600.(avif|webp)`, `{{figur:name|Alt-Text}}` eines aus `name.(avif|webp)`.

## Bilder

Die Welt-Bilder sind Renders aus der 3D-Vorschau im Projekt (`modelle/vorschau.html?welt=…`), die Figuren und Werkzeuge aus den ItemsAdder-Modellen in `modelle/items/out/modelle` und `modelle/kisten/out`.
