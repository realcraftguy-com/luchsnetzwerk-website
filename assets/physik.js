// Physik für die Luchs-Website: Federn statt fester Animationsdauer.
// Jede Bewegung startet vom aktuellen Wert, übernimmt die Geschwindigkeit des Zeigers
// und lässt sich jederzeit greifen und umkehren (Prinzipien aus Apples „Designing Fluid Interfaces“).
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const fein = matchMedia("(hover: hover) and (pointer: fine)").matches;

  // ── Feder: Dämpfung 1 = ohne Überschwingen, < 1 = federt nach; Ansprechzeit in Sekunden ──
  class Feder {
    constructor(wert = 0, { daempfung = 1, ansprech = 0.4 } = {}) {
      this.wert = this.ziel = wert;
      this.v = 0;
      this.k = (2 * Math.PI / ansprech) ** 2;
      this.c = (4 * Math.PI * daempfung) / ansprech;
    }
    schritt(dt) {
      this.v += (-this.k * (this.wert - this.ziel) - this.c * this.v) * dt;
      this.wert += this.v * dt;
      return Math.abs(this.v) > 0.01 || Math.abs(this.wert - this.ziel) > 0.01;
    }
    setzen(w) { this.wert = this.ziel = w; this.v = 0; }
  }

  // Ein gemeinsamer Takt; jede Aufgabe meldet true, solange sie sich noch bewegt
  const aktiv = new Set();
  let letzte = 0;
  function takt(t) {
    // Echte Zeit in Teilschritten ≤ 1/120 s: stabil und auch bei ruckelnden Geräten nicht in Zeitlupe
    let rest = Math.min((t - (letzte || t)) / 1000, 0.1);
    letzte = t;
    const n = Math.max(1, Math.ceil(rest * 120)), dt = rest / n || 1 / 120;
    for (const f of aktiv) {
      let weiter = true;
      for (let i = 0; i < n && weiter; i++) weiter = f(dt);
      if (!weiter) aktiv.delete(f);
    }
    if (aktiv.size) requestAnimationFrame(takt);
    else letzte = 0;
  }
  const bewegen = (f) => { if (!aktiv.size) requestAnimationFrame(takt); aktiv.add(f); };

  // Geschwindigkeit aus den letzten Zeigerpositionen (px/s)
  function verlauf() {
    const p = [];
    return {
      add(x, y) { p.push({ x, y, t: performance.now() }); if (p.length > 6) p.shift(); },
      v() {
        if (p.length < 2) return { x: 0, y: 0 };
        const a = p[0], b = p.at(-1), dt = Math.max((b.t - a.t) / 1000, 0.008);
        return performance.now() - b.t > 80 ? { x: 0, y: 0 } : { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt };
      },
      leeren() { p.length = 0; },
    };
  }
  // Wohin ein Wurf ausläuft (Apples Projektion, Abbremsung wie beim Scrollen)
  const projektion = (v, d = 0.998) => (v / 1000) * d / (1 - d);
  // Widerstand hinter einer Grenze: je weiter, desto zäher
  const gummiband = (ueber, groesse, c = 0.55) => (ueber * groesse * c) / (groesse + c * Math.abs(ueber));

  // ── 1. Glasflächen neigen sich zum Zeiger und heben sich leicht an ──────────────────
  if (fein) {
    document.querySelectorAll(".tour-karte, .punkte-glas .punkt, .hero-karte, .galerie-karte, .karte, .item, .belohnung, .vote-card, .rolle, .status-feld, .schritt, .banner").forEach((el) => {
      const rx = new Feder(0, { daempfung: 0.75, ansprech: 0.45 }), ry = new Feder(0, { daempfung: 0.75, ansprech: 0.45 });
      const hoch = new Feder(0, { daempfung: 0.8, ansprech: 0.35 });
      const staerke = el.offsetWidth > 520 ? 4 : 8;
      const lauf = (dt) => {
        const a = rx.schritt(dt) | ry.schritt(dt) | hoch.schritt(dt);
        el.style.transform = `perspective(900px) rotateX(${rx.wert.toFixed(2)}deg) rotateY(${ry.wert.toFixed(2)}deg) translateY(${(-hoch.wert * 6).toFixed(2)}px) scale(${(1 + hoch.wert * 0.015).toFixed(4)})`;
        if (!a) el.style.transform = hoch.ziel ? el.style.transform : "";
        return a;
      };
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        ry.ziel = x * staerke * 2; rx.ziel = -y * staerke * 2; hoch.ziel = 1;
        bewegen(lauf);
      });
      el.addEventListener("pointerleave", () => { rx.ziel = ry.ziel = hoch.ziel = 0; bewegen(lauf); });
    });
  }

  // ── 2. Knöpfe ziehen sich wie Magnete zum Zeiger und schnappen zurück ────────────────
  if (fein) {
    document.querySelectorAll(".btn, .brand").forEach((el) => {
      const x = new Feder(0, { daempfung: 0.6, ansprech: 0.35 }), y = new Feder(0, { daempfung: 0.6, ansprech: 0.35 });
      const lauf = (dt) => { const a = x.schritt(dt) | y.schritt(dt); el.style.translate = `${x.wert.toFixed(2)}px ${y.wert.toFixed(2)}px`; return a; };
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        x.ziel = (e.clientX - r.left - r.width / 2) * 0.22;
        y.ziel = (e.clientY - r.top - r.height / 2) * 0.32;
        bewegen(lauf);
      });
      el.addEventListener("pointerleave", () => { x.ziel = y.ziel = 0; bewegen(lauf); });
    });
  }

  // ── 3. Flüssige Glas-Linse gleitet in der Navigation zum Link unter dem Zeiger ───────
  const links = document.querySelector(".nav-links");
  if (links && fein) {
    const linse = document.createElement("span");
    linse.className = "nav-linse";
    linse.setAttribute("aria-hidden", "true");
    links.prepend(linse);
    const x = new Feder(0, { daempfung: 0.72, ansprech: 0.38 }), w = new Feder(0, { daempfung: 0.8, ansprech: 0.3 });
    const sicht = new Feder(0, { daempfung: 1, ansprech: 0.25 });
    let erst = true;
    const lauf = (dt) => {
      const a = x.schritt(dt) | w.schritt(dt) | sicht.schritt(dt);
      // Dehnen in Bewegungsrichtung, wie ein Tropfen
      const dehn = Math.min(Math.abs(x.v) / 2500, 0.35);
      linse.style.transform = `translateX(${x.wert.toFixed(1)}px) scale(${1 + dehn}, ${1 - dehn * 0.5})`;
      linse.style.width = `${Math.max(w.wert, 0).toFixed(1)}px`;
      linse.style.opacity = sicht.wert.toFixed(3);
      return a;
    };
    const zu = (a) => {
      const r = a.getBoundingClientRect(), l = links.getBoundingClientRect();
      x.ziel = r.left - l.left; w.ziel = r.width; sicht.ziel = 1;
      if (erst) { x.setzen(x.ziel); w.setzen(w.ziel); erst = false; }
      bewegen(lauf);
    };
    const ruhe = () => {
      const aktuell = links.querySelector('[aria-current="page"]');
      if (aktuell) zu(aktuell); else { sicht.ziel = 0; bewegen(lauf); }
    };
    links.querySelectorAll("a").forEach((a) => a.addEventListener("pointerenter", () => zu(a)));
    links.addEventListener("pointerleave", ruhe);
    addEventListener("resize", ruhe);
    ruhe();
  }

  // ── 4. Map-Galerie: mit der Maus ziehen, Schwung hochrechnen, einrasten, Gummiband ──
  document.querySelectorAll(".galerie").forEach((g) => {
    const pos = new Feder(0, { daempfung: 1, ansprech: 0.5 });
    const gummi = new Feder(0, { daempfung: 0.8, ansprech: 0.35 });
    const hist = verlauf();
    let start = 0, startX = 0, zieht = false, gezogen = 0;
    const max = () => g.scrollWidth - g.clientWidth;
    const lauf = (dt) => {
      const a = pos.schritt(dt) | gummi.schritt(dt);
      g.scrollLeft = pos.wert;
      g.style.translate = `${gummi.wert.toFixed(1)}px 0`;
      if (!a) g.style.scrollSnapType = "";
      return a;
    };
    g.addEventListener("dragstart", (e) => e.preventDefault());
    g.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return; // Touch scrollt nativ mit eigenem Schwung
      aktiv.delete(lauf);
      zieht = true; gezogen = 0; start = g.scrollLeft; startX = e.clientX;
      pos.setzen(start); gummi.setzen(gummi.wert);
      g.style.scrollSnapType = "none";
      try { g.setPointerCapture(e.pointerId); } catch {}
      hist.leeren(); hist.add(e.clientX, 0);
    });
    g.addEventListener("pointermove", (e) => {
      if (!zieht) return;
      hist.add(e.clientX, 0);
      const ziel = start - (e.clientX - startX);
      gezogen = Math.max(gezogen, Math.abs(e.clientX - startX));
      const m = max();
      const innen = Math.min(Math.max(ziel, 0), m);
      g.scrollLeft = innen;
      g.style.translate = `${-gummiband(ziel - innen, g.clientWidth).toFixed(1)}px 0`;
      gummi.setzen(-gummiband(ziel - innen, g.clientWidth));
      pos.setzen(innen);
    });
    const los = () => {
      if (!zieht) return;
      zieht = false;
      const v = -hist.v().x;
      const karten = [...g.children];
      const mitte = g.scrollLeft + projektion(v) + g.clientWidth / 2;
      const ziel = karten.reduce((best, k) => {
        const m = k.offsetLeft + k.offsetWidth / 2;
        return Math.abs(m - mitte) < Math.abs(best - mitte) ? m : best;
      }, Infinity) - g.clientWidth / 2;
      pos.wert = g.scrollLeft; pos.v = v; pos.ziel = Math.min(Math.max(ziel, 0), max());
      gummi.ziel = 0;
      bewegen(lauf);
    };
    g.addEventListener("pointerup", los);
    g.addEventListener("pointercancel", los);
    // Nach echtem Ziehen kein Klick auf die Karte auslösen
    g.addEventListener("click", (e) => { if (gezogen > 6) { e.preventDefault(); gezogen = 0; } }, true);
    g.style.cursor = "grab";
  });

  // ── 5. Minion und Schattenluchs lassen sich greifen und werfen, sie federn zurück ───
  document.querySelectorAll(".buehne-bild picture, .belohnung picture, .banner-bild picture").forEach((el) => {
    const x = new Feder(0, { daempfung: 0.45, ansprech: 0.55 }), y = new Feder(0, { daempfung: 0.45, ansprech: 0.55 });
    const rot = new Feder(0, { daempfung: 0.5, ansprech: 0.4 });
    const hist = verlauf();
    let zieht = false, gx = 0, gy = 0;
    const lauf = (dt) => {
      const a = x.schritt(dt) | y.schritt(dt) | rot.schritt(dt);
      el.style.translate = `${x.wert.toFixed(1)}px ${y.wert.toFixed(1)}px`;
      el.style.rotate = `${rot.wert.toFixed(2)}deg`;
      return a || zieht;
    };
    el.style.touchAction = "none";
    el.style.cursor = "grab";
    el.addEventListener("dragstart", (e) => e.preventDefault());
    el.addEventListener("pointerdown", (e) => {
      zieht = true;
      try { el.setPointerCapture(e.pointerId); } catch {}
      el.style.cursor = "grabbing";
      // Greifpunkt merken, damit die Figur nicht zur Zeigermitte springt
      gx = e.clientX - x.wert; gy = e.clientY - y.wert;
      hist.leeren(); hist.add(e.clientX, e.clientY);
      bewegen(lauf);
    });
    el.addEventListener("pointermove", (e) => {
      if (!zieht) return;
      hist.add(e.clientX, e.clientY);
      x.setzen(e.clientX - gx); y.setzen(e.clientY - gy);
      rot.ziel = Math.max(-28, Math.min(28, hist.v().x / 60));
    });
    const los = () => {
      if (!zieht) return;
      zieht = false;
      el.style.cursor = "grab";
      const v = hist.v();
      // Wurfgeschwindigkeit wird an die Feder übergeben: kein Ruck zwischen Ziehen und Zurückfedern
      x.v = v.x; y.v = v.y; x.ziel = y.ziel = 0; rot.ziel = 0; rot.v = v.x / 20;
      bewegen(lauf);
    };
    el.addEventListener("pointerup", los);
    el.addEventListener("pointercancel", los);
  });

  // ── 6. Hero: Insel und Text verschieben sich gegenläufig zum Zeiger (Tiefe) ─────────
  const hero = document.querySelector(".hero");
  if (hero && fein) {
    const bild = hero.querySelector(".hero-bild"), text = hero.querySelector(".hero-inhalt");
    const x = new Feder(0, { daempfung: 1, ansprech: 0.9 }), y = new Feder(0, { daempfung: 1, ansprech: 0.9 });
    const lauf = (dt) => {
      const a = x.schritt(dt) | y.schritt(dt);
      bild.style.translate = `${(x.wert * -28).toFixed(1)}px ${(y.wert * -18).toFixed(1)}px`;
      text.style.translate = `${(x.wert * 8).toFixed(1)}px ${(y.wert * 5).toFixed(1)}px`;
      return a;
    };
    hero.addEventListener("pointermove", (e) => {
      x.ziel = e.clientX / innerWidth - 0.5; y.ziel = e.clientY / innerHeight - 0.5;
      bewegen(lauf);
    });
    hero.addEventListener("pointerleave", () => { x.ziel = y.ziel = 0; bewegen(lauf); });
  }

  // ── 7. Zahlen zählen beim Erscheinen hoch, mit kurzem Überschwingen ─────────────────
  const zaehlen = (el, ende, rest) => {
    const f = new Feder(0, { daempfung: 0.7, ansprech: 1.1 });
    f.ziel = ende;
    bewegen((dt) => {
      const a = f.schritt(dt);
      el.textContent = Math.max(0, Math.round(a ? f.wert : ende)) + rest;
      return a;
    });
  };
  const zahlIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    zahlIO.unobserve(e.target);
    const m = e.target.textContent.trim().match(/^(\d+)(\+?)$/);
    if (m) zaehlen(e.target, +m[1], m[2]);
  }), { threshold: 0.6 });
  document.querySelectorAll(".kennzahl b:not([data-live]), .status-feld b:not([data-live])").forEach((b) => zahlIO.observe(b));
  // Live-Spielerzahl zählt hoch, sobald sie da ist
  document.addEventListener("luchs:status", (e) => {
    const n = e.detail?.spieler;
    if (e.detail?.online && n > 0) document.querySelectorAll('[data-live="spieler"]').forEach((el) => zaehlen(el, n, ""));
  });

  // ── 8. Status-Dock: springt beim Kopieren kurz auf ─────────────────────────────────
  document.addEventListener("luchs:copied", (e) => {
    const el = e.detail;
    const s = new Feder(0.86, { daempfung: 0.4, ansprech: 0.35 });
    s.ziel = 1;
    bewegen((dt) => { const a = s.schritt(dt); el.style.scale = a ? s.wert.toFixed(4) : ""; return a; });
  });

  // ── 9. Gummiband am Seitenrand wie auf dem iPhone ──────────────────────────────────
  // Mausrad am Rand überdehnt die Seite, schneller Scroll gegen den Rand prallt mit seinem Tempo ab.
  // Mac-Trackpads und Touchgeräte federn schon selbst; dort nicht doppeln.
  if (fein && !/Mac/.test(navigator.platform)) {
    const flaechen = [document.querySelector("main"), document.querySelector(".footer")].filter(Boolean);
    const pille = document.querySelector(".nav-inner");
    const rand = new Feder(0, { daempfung: 0.5, ansprech: 0.5 });
    // Die Nav-Pille hängt dem Scrolltempo kurz hinterher und staucht sich dabei wie ein Tropfen
    const zug = new Feder(0, { daempfung: 0.55, ansprech: 0.45 });
    let roh = 0, loslassen, ruhig, letztY = scrollY, letztT = performance.now(), tempo = 0;
    const maxY = () => document.documentElement.scrollHeight - innerHeight;
    const zeigen = () => {
      const r = Math.abs(rand.wert) < 0.2 ? "" : `0 ${rand.wert.toFixed(1)}px`;
      flaechen.forEach((f) => (f.style.translate = r));
      if (pille) {
        const z = zug.wert;
        pille.style.translate = `0 ${(z * 10 + rand.wert * 0.25).toFixed(2)}px`;
        pille.style.scale = `${(1 + Math.abs(z) * 0.04).toFixed(4)} ${(1 - Math.abs(z) * 0.1).toFixed(4)}`;
      }
    };
    const lauf = (dt) => { const a = rand.schritt(dt) | zug.schritt(dt); zeigen(); return a; };

    addEventListener("wheel", (e) => {
      const d = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      const oben = scrollY <= 0 && d < 0, unten = scrollY >= maxY() - 1 && d > 0;
      if (!oben && !unten) return;
      roh -= d;
      rand.setzen(gummiband(roh, innerHeight));
      bewegen(lauf);
      clearTimeout(loslassen);
      // Kein Raddreh mehr: Seite schwingt zurück an ihren Platz
      loslassen = setTimeout(() => { roh = 0; rand.ziel = 0; bewegen(lauf); }, 140);
    }, { passive: true });

    addEventListener("scroll", () => {
      const t = performance.now(), dt = (t - letztT) / 1000;
      const v = (scrollY - letztY) / Math.max(dt, 0.004);
      tempo = dt < 0.15 ? v * 0.6 + tempo * 0.4 : v;
      const m = maxY();
      // Mit Schwung am Rand angekommen: Tempo wird zum Abprall in die Gegenrichtung
      if (scrollY <= 0 && letztY > 0 && tempo < -500) { rand.v = Math.min(-tempo * 0.45, 3200); rand.ziel = 0; }
      else if (scrollY >= m - 1 && letztY < m - 1 && tempo > 500) { rand.v = -Math.min(tempo * 0.45, 3200); rand.ziel = 0; }
      zug.ziel = Math.max(-1, Math.min(1, -tempo / 3000));
      clearTimeout(ruhig);
      ruhig = setTimeout(() => { tempo = 0; zug.ziel = 0; bewegen(lauf); }, 90);
      letztY = scrollY; letztT = t;
      bewegen(lauf);
    }, { passive: true });
  }
})();
