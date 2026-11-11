// Kleine Ergänzungen zu den CSS-Animationen.
// - Rückfall für Scroll-Einblendungen, wenn der Browser keine Scroll-Timelines kann (Firefox, ältere Safari)
// - Gestaffelte Einblendung in Rastern
// - Pixel-Konfetti beim Kopieren der Adresse
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Lichtbrechung per SVG-Filter in backdrop-filter kann nur Chromium; Safari und Firefox behalten den Weichzeichner
  if (navigator.userAgentData?.brands?.some((b) => b.brand === "Chromium")) document.documentElement.classList.add("lg-refrakt");

  // Glanzpunkt auf Glasflächen folgt dem Zeiger
  if (matchMedia("(hover: hover)").matches) {
    let glas = null, x = 0, y = 0, geplant = false;
    addEventListener("pointermove", (e) => {
      glas = e.target.closest?.(".glass");
      x = e.clientX; y = e.clientY;
      if (glas && !geplant) {
        geplant = true;
        requestAnimationFrame(() => {
          geplant = false;
          if (!glas) return;
          const r = glas.getBoundingClientRect();
          glas.style.setProperty("--mx", `${x - r.left}px`);
          glas.style.setProperty("--my", `${y - r.top}px`);
        });
      }
    }, { passive: true });
  }

  // Scroll-Tour: der Schritt in der Bildmitte bestimmt das Bild auf der Bühne
  document.querySelectorAll(".tour").forEach((tour) => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (tour.dataset.aktiv = e.target.dataset.i)),
      { rootMargin: "-45% 0px -45% 0px" }
    );
    tour.querySelectorAll(".tour-schritt").forEach((s) => io.observe(s));
  });

  // Raster: Kinder nacheinander einblenden
  document.querySelectorAll("[data-staffel]").forEach((g) => {
    [...g.children].forEach((c, n) => c.style.setProperty("--st", `${Math.min(n, 6) * 0.07}s`));
  });

  const kannTimeline = CSS.supports("animation-timeline: view()");
  const reveals = document.querySelectorAll(".reveal");
  if (reduce || kannTimeline || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      }),
      { rootMargin: "0px 0px -10% 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  }

  // Pixel-Konfetti wie kleine Minecraft-Blöcke
  if (reduce) return;
  const farben = ["#f2a33a", "#e8562a", "#ffd257", "#5fd38a", "#7a4a26", "#f5f1ea"];
  document.addEventListener("luchs:copied", (e) => {
    const r = e.detail.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const teile = Array.from({ length: 26 }, (_, n) => {
      const el = document.createElement("i");
      el.className = "pixel";
      const s = 5 + Math.random() * 6;
      Object.assign(el.style, { width: s + "px", height: s + "px", left: cx + "px", top: cy + "px", background: farben[n % farben.length] });
      document.body.append(el);
      const w = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2;
      const v = 160 + Math.random() * 260;
      const dx = Math.cos(w) * v, dy = Math.sin(w) * v;
      // Wurfparabel als Web-Animation (läuft auf dem Compositor)
      el.animate(
        [
          { transform: "translate(0,0) rotate(0)", opacity: 1 },
          { transform: `translate(${dx * 0.6}px, ${dy * 0.6}px) rotate(${180 * Math.sign(dx)}deg)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${dx}px, ${dy * 0.2 + 260}px) rotate(${400 * Math.sign(dx)}deg)`, opacity: 0 },
        ],
        { duration: 1100 + Math.random() * 400, easing: "cubic-bezier(.2,.6,.4,1)" }
      ).finished.then(() => el.remove());
      return el;
    });
    return teile;
  });
})();
