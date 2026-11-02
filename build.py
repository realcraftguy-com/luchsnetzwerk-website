#!/usr/bin/env python3
"""Baut die Luchs-Website aus _quelle/ in diesen Ordner.

Aufruf: python3 build.py

- _quelle/layout.html ist das Grundgerüst (Kopf, Navigation, Fuß).
- _quelle/seiten/*.html sind die Seiteninhalte. Jede Datei beginnt mit einem Kommentar
  <!--{"titel": "...", "beschreibung": "...", "nav": "start"}--> und wird als <name>.html geschrieben.
- Danach werden sitemap.xml und robots.txt neu erzeugt.
- {{V}} wird durch einen Hash über assets/ ersetzt, damit Browser nach Änderungen nichts Altes aus dem Cache nehmen.
"""
import hashlib, json, pathlib, re, datetime

BASIS = "https://realcraftguy-com.github.io/luchsnetzwerk-website/"
HIER = pathlib.Path(__file__).resolve().parent
QUELLE = HIER / "_quelle"

AKTUELL = ' aria-current="page"'
NAV = [
    ("modi", "index.html#modi", "Spielmodi"),
    ("features", "features.html", "Features"),
    ("voten", "vote.html", "Voten"),
    ("status", "status.html", "Status"),
    ("regeln", "regeln.html", "Regeln"),
]


def bild(m):
    """{{bild:name|Alt-Text|eager|sizes}} → <picture> mit AVIF/WebP in 800 und 1600 px.
    Optional: "eager" für Bilder im ersten Bildschirm, ein Teil in Klammern als sizes-Angabe."""
    teile = m.group(1).split("|")
    name, alt = teile[0], teile[1] if len(teile) > 1 else ""
    eager = "eager" in teile[2:]
    laden = 'fetchpriority="high"' if eager else 'loading="lazy" decoding="async"'
    sizes = next((t for t in teile[2:] if t.startswith("(")), "100vw")
    src = lambda ext: f"assets/img/{name}-800.{ext} 800w, assets/img/{name}-1600.{ext} 1600w"
    return (f'<picture><source type="image/avif" srcset="{src("avif")}" sizes="{sizes}">'
            f'<source type="image/webp" srcset="{src("webp")}" sizes="{sizes}">'
            f'<img src="assets/img/{name}-1600.webp" alt="{alt}" width="1600" height="1000" {laden}></picture>')


def figur(m):
    """{{figur:name|Alt-Text}} → freigestelltes Modell (eine Größe)."""
    name, alt = (m.group(1).split("|") + [""])[:2]
    return (f'<picture><source type="image/avif" srcset="assets/img/{name}.avif">'
            f'<img src="assets/img/{name}.webp" alt="{alt}" width="720" height="720" loading="lazy" decoding="async"></picture>')


def version():
    h = hashlib.sha1()
    for p in sorted((HIER / "assets").rglob("*")):
        if p.is_file() and p.suffix in {".css", ".js"}:
            h.update(p.read_bytes())
    return h.hexdigest()[:10]


def main():
    layout = (QUELLE / "layout.html").read_text()
    v = version()
    seiten = []
    for datei in sorted((QUELLE / "seiten").glob("*.html")):
        text = datei.read_text()
        m = re.match(r"\s*<!--(\{.*?\})-->\s*", text, re.S)
        meta = json.loads(m.group(1))
        inhalt = text[m.end():]
        name = datei.stem + ".html"
        nav_html = "\n".join(
            f'          <a href="{href}"{AKTUELL if meta.get("nav") == key else ""}>{label}</a>'
            for key, href, label in NAV
        )
        canonical = BASIS + ("" if name == "index.html" else name)
        html = layout
        for k, wert in {
            "titel": meta["titel"],
            "beschreibung": meta["beschreibung"],
            "canonical": canonical,
            "og_bild": BASIS + meta.get("bild", "assets/img/og.jpg"),
            "nav": nav_html,
            "kopf_extra": meta.get("kopf_extra", ""),
            "kopf_frueh": meta.get("kopf_frueh", ""),
            "body_klasse": meta.get("klasse", ""),
            "inhalt": inhalt.strip(),
        }.items():
            html = html.replace("{{" + k + "}}", wert)
        html = re.sub(r"\{\{bild:([^}]+)\}\}", bild, html)
        html = re.sub(r"\{\{figur:([^}]+)\}\}", figur, html)
        html = html.replace("{{V}}", v)
        (HIER / name).write_text(html)
        if not meta.get("versteckt"):
            seiten.append((name, meta.get("prio", "0.6")))
        print("gebaut", name)

    heute = datetime.date.today().isoformat()
    eintraege = "\n".join(
        f"  <url><loc>{BASIS + ('' if n == 'index.html' else n)}</loc><lastmod>{heute}</lastmod><priority>{p}</priority></url>"
        for n, p in seiten
    )
    (HIER / "sitemap.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{eintraege}\n</urlset>\n'
    )
    (HIER / "robots.txt").write_text(f"User-agent: *\nAllow: /\nDisallow: /_quelle/\n\nSitemap: {BASIS}sitemap.xml\n")
    print("gebaut sitemap.xml, robots.txt · Version", v)


if __name__ == "__main__":
    main()
