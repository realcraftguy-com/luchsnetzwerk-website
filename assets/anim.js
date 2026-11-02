// Animationen der Luchs-Website. Alles läuft über Federn (Dämpfung + Ansprechzeit wie bei Apple),
// startet immer vom aktuellen Wert und lässt sich jederzeit unterbrechen.
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  // ── Feder ────────────────────────────────────────────────────────────
  class Spring {
    constructor(value = 0, { damping = 1, response = 0.4 } = {}) {
      this.value = this.target = value;
      this.v = 0;
      this.k = (2 * Math.PI / response) ** 2;
      this.c = (4 * Math.PI * damping) / response;
    }
    step(dt) {
      const a = -this.k * (this.value - this.target) - this.c * this.v;
      this.v += a * dt;
      this.value += this.v * dt;
      return Math.abs(this.v) > 0.001 || Math.abs(this.value - this.target) > 0.001;
    }
  }

  // Ein gemeinsamer Takt für alle Federn
  const active = new Set();
  let last = 0, running = false;
  function tick(t) {
    const dt = Math.min((t - (last || t)) / 1000, 1 / 30);
    last = t;
    for (const fn of active) if (!fn(dt)) active.delete(fn);
    if (active.size) requestAnimationFrame(tick);
    else { running = false; last = 0; }
  }
  function animate(fn) {
    active.add(fn);
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  // ── Wörter der Überschrift einzeln einfliegen lassen ──────────────────
  let i = 0;
  document.querySelectorAll(".split .line").forEach((line) => {
    const words = line.textContent.trim().split(/\s+/);
    line.textContent = "";
    words.forEach((w, n) => {
      const outer = document.createElement("span");
      outer.className = "w";
      const inner = document.createElement("span");
      inner.textContent = w;
      inner.style.setProperty("--i", i++);
      outer.append(inner);
      line.append(outer);
      if (n < words.length - 1) line.append(" ");
    });
  });

  // ── Bäume für die Wald-Silhouette ────────────────────────────────────
  function rng(seed) {
    return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  }
  const treeCfg = { back: [7, 30, 70, 150], mid: [13, 42, 90, 180], front: [29, 60, 110, 210] };
  document.querySelectorAll("[data-trees]").forEach((svg) => {
    const [seed, step, minH, maxH] = treeCfg[svg.dataset.trees];
    const r = rng(seed);
    // Hügel als Boden, darauf Tannen aus übereinanderliegenden Dreiecken
    const hill = (x) => 236 + Math.sin(x / 210 + seed) * 10 + Math.sin(x / 77 + seed * 2) * 4;
    let d = "M0 260";
    for (let x = 0; x <= 1440; x += 20) d += ` L${x} ${hill(x).toFixed(1)}`;
    d += " L1440 260 Z";
    for (let x = -20; x < 1480; x += step * (0.6 + r() * 0.9)) {
      const h = minH + r() * (maxH - minH);
      const w = h * (0.2 + r() * 0.06);
      const base = hill(x) + 4;
      const tiers = 4;
      for (let t = 0; t < tiers; t++) {
        const yb = base - h * 0.08 - (h * 0.78 * t) / tiers;
        const yt = t === tiers - 1 ? base - h : yb - h * 0.42;
        const ww = w * (1 - t / (tiers + 0.6));
        d += ` M${(x - ww).toFixed(1)} ${yb.toFixed(1)} Q${(x - ww * 0.35).toFixed(1)} ${(yb - 4).toFixed(1)} ${x.toFixed(1)} ${yt.toFixed(1)} Q${(x + ww * 0.35).toFixed(1)} ${(yb - 4).toFixed(1)} ${(x + ww).toFixed(1)} ${yb.toFixed(1)} Z`;
      }
      d += ` M${(x - w * 0.08).toFixed(1)} ${base} h${(w * 0.16).toFixed(1)} v-${(h * 0.12).toFixed(1)} h-${(w * 0.16).toFixed(1)} Z`;
    }
    svg.innerHTML = `<path d="${d}"/>`;
  });

  // ── Kopieren: Pixel-Konfetti wie Minecraft-Blöcke ────────────────────
  const pixelColors = ["#f2a33a", "#e8562a", "#ffd257", "#5fd38a", "#7a4a26", "#fff4e3"];
  document.addEventListener("luchs:copied", (e) => {
    if (reduce) return;
    const r = e.detail.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const parts = [];
    for (let n = 0; n < 34; n++) {
      const el = document.createElement("i");
      el.className = "pixel";
      el.style.background = pixelColors[n % pixelColors.length];
      const s = 5 + Math.random() * 7;
      el.style.width = el.style.height = s + "px";
      document.body.append(el);
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
      const sp = 260 + Math.random() * 420;
      parts.push({ el, x: cx, y: cy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, rot: Math.random() * 360, vr: (Math.random() - 0.5) * 720, life: 0 });
    }
    animate((dt) => {
      let alive = false;
      for (const p of parts) {
        p.life += dt;
        p.vy += 1100 * dt;
        p.vx *= 0.985;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        const o = Math.max(0, 1 - p.life / 1.3);
        p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rot}deg)`;
        p.el.style.opacity = o;
        if (o > 0) alive = true; else p.el.remove();
      }
      return alive;
    });
  });

  // ── Fortschrittsbalken + Navigation beim Runterscrollen ausblenden ───
  const bar = document.querySelector(".progress");
  const nav = document.querySelector(".nav");
  let lastY = scrollY;
  const parallax = [...document.querySelectorAll("[data-parallax]")];
  function onScroll() {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    if (nav && !document.body.classList.contains("nav-open")) {
      nav.classList.toggle("is-hidden", y > lastY && y > 400);
    }
    lastY = y;
    if (!reduce && y < innerHeight * 1.2) {
      for (const el of parallax) el.style.translate = `0 ${y * parseFloat(el.dataset.parallax)}px`;
    }
  }
  addEventListener("scroll", () => requestAnimationFrame(onScroll), { passive: true });
  onScroll();

  // ── Zählen beim Erscheinen ───────────────────────────────────────────
  function countUp(el, to) {
    const suffix = el.dataset.suffix || "";
    if (reduce) { el.textContent = to + suffix; return; }
    const start = performance.now(), dur = 1400;
    const from = 0;
    const step = (t) => {
      const p = Math.min((t - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(from + (to - from) * e) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const counted = new WeakSet();
  const statIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    statIO.unobserve(e.target);
    counted.add(e.target);
    if (e.target.dataset.live === undefined) countUp(e.target, +e.target.dataset.count);
    else if (e.target.dataset.ready) countUp(e.target, +e.target.dataset.count);
  }), { threshold: 0.6 });
  document.querySelectorAll("[data-count]").forEach((el) => statIO.observe(el));
  // site.js meldet die Spielerzahl, sobald sie da ist
  document.addEventListener("luchs:players", (e) => {
    const el = document.querySelector("[data-live]");
    if (!el) return;
    el.dataset.count = e.detail;
    el.dataset.ready = "1";
    if (counted.has(el)) countUp(el, e.detail);
  });

  // Gestaffeltes Erscheinen innerhalb eines Rasters
  document.querySelectorAll(".grid, .bento, .steps, .stats, .vote-grid").forEach((g) => {
    [...g.children].forEach((c, n) => c.style.setProperty("--stagger", `${n * 0.08}s`));
  });

  if (reduce) return;

  // ── Glühende Funken über dem Wald ────────────────────────────────────
  const canvas = document.querySelector(".embers");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 64;
    const sctx = sprite.getContext("2d");
    const g = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,230,170,1)");
    g.addColorStop(0.25, "rgba(242,163,58,0.85)");
    g.addColorStop(1, "rgba(232,86,42,0)");
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, 64, 64);

    let W = 0, H = 0, dpr = 1, parts = [], visible = true;
    const mouse = { x: -9999, y: -9999 };
    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(110, W / 12));
      parts = Array.from({ length: n }, () => spawn(true));
    }
    function spawn(initial) {
      return {
        x: Math.random() * W,
        y: initial ? Math.random() * H : H + 10,
        r: 2 + Math.random() * 7,
        vy: 12 + Math.random() * 38,
        sway: 10 + Math.random() * 30,
        ph: Math.random() * Math.PI * 2,
        fl: 1 + Math.random() * 3,
        ox: 0, oy: 0,
      };
    }
    let t0 = performance.now();
    function frame(t) {
      if (!visible) return;
      const dt = Math.min((t - t0) / 1000, 0.05);
      t0 = t;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (const p of parts) {
        p.y -= p.vy * dt;
        p.ph += dt;
        let x = p.x + Math.sin(p.ph * 0.8) * p.sway;
        // Funken weichen dem Zeiger aus
        const dx = x + p.ox - mouse.x, dy = p.y + p.oy - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 16000) {
          const f = (1 - d2 / 16000) * 160 * dt;
          const d = Math.sqrt(d2) || 1;
          p.ox += (dx / d) * f; p.oy += (dy / d) * f;
        }
        p.ox *= 0.96; p.oy *= 0.96;
        const life = p.y / H;
        const a = Math.max(0, Math.min(1, life * 1.4)) * (0.55 + 0.45 * Math.sin(p.ph * p.fl * 2));
        if (p.y < -20) Object.assign(p, spawn(false));
        ctx.globalAlpha = a;
        const s = p.r * 2;
        ctx.drawImage(sprite, x + p.ox - s / 2, p.y + p.oy - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }
    resize();
    addEventListener("resize", resize);
    new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting && !document.hidden;
      if (visible && !was) { t0 = performance.now(); requestAnimationFrame(frame); }
    }).observe(canvas);
    document.addEventListener("visibilitychange", () => {
      const was = visible;
      visible = !document.hidden;
      if (visible && !was) { t0 = performance.now(); requestAnimationFrame(frame); }
    });
    requestAnimationFrame(frame);

    const hero = document.getElementById("hero");
    hero.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    hero.addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });
  }

  // ── Licht unter dem Zeiger + Luchs schaut dir nach ───────────────────
  const hero = document.getElementById("hero");
  const glow = document.querySelector(".cursor-glow");
  const lynx = document.querySelector(".lynx");
  if (hero && lynx) {
    const gx = new Spring(0, { damping: 1, response: 0.5 }), gy = new Spring(0, { damping: 1, response: 0.5 });
    const px = new Spring(0, { damping: 0.8, response: 0.3 }), py = new Spring(0, { damping: 0.8, response: 0.3 });
    const rx = new Spring(0, { damping: 0.8, response: 0.5 }), ry = new Spring(0, { damping: 0.8, response: 0.5 });
    const pupils = lynx.querySelectorAll(".pupil");
    const run = (dt) => {
      const a = gx.step(dt) | gy.step(dt) | px.step(dt) | py.step(dt) | rx.step(dt) | ry.step(dt);
      if (glow) glow.style.transform = `translate(${gx.value}px, ${gy.value}px)`;
      pupils.forEach((p) => p.setAttribute("transform", `translate(${px.value} ${py.value})`));
      lynx.style.transform = `perspective(800px) rotateX(${rx.value}deg) rotateY(${ry.value}deg)`;
      return a;
    };
    function look(clientX, clientY) {
      const hr = hero.getBoundingClientRect();
      gx.target = clientX - hr.left; gy.target = clientY - hr.top;
      const lr = lynx.getBoundingClientRect();
      const dx = clientX - (lr.left + lr.width / 2), dy = clientY - (lr.top + lr.height * 0.5);
      const d = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, d / 300);
      px.target = (dx / d) * 4.2 * reach; py.target = (dy / d) * 2.4 * reach;
      ry.target = Math.max(-14, Math.min(14, dx / 30));
      rx.target = Math.max(-10, Math.min(10, -dy / 40));
      animate(run);
    }
    if (finePointer) {
      addEventListener("pointermove", (e) => {
        if (scrollY < innerHeight) look(e.clientX, e.clientY);
      }, { passive: true });
    }
    hero.addEventListener("pointerleave", () => {
      px.target = py.target = rx.target = ry.target = 0;
      animate(run);
    });

    // Blinzeln und Ohrenzucken in zufälligen Abständen
    const blink = () => {
      lynx.classList.add("blink");
      setTimeout(() => lynx.classList.remove("blink"), 140);
      if (Math.random() < 0.25) setTimeout(blink, 260);
      setTimeout(blink, 2500 + Math.random() * 4000);
    };
    setTimeout(blink, 1800);
    const twitch = () => {
      lynx.classList.add("twitch");
      setTimeout(() => lynx.classList.remove("twitch"), 160);
      setTimeout(twitch, 4000 + Math.random() * 6000);
    };
    setTimeout(twitch, 3200);
    // Antippen: Luchs zuckt mit den Ohren und blinzelt
    lynx.addEventListener("pointerdown", () => {
      lynx.classList.add("twitch", "blink");
      setTimeout(() => lynx.classList.remove("twitch", "blink"), 180);
    });
  }

  if (!finePointer) return;

  // ── Karten neigen sich zum Zeiger, Lichtfleck folgt ──────────────────
  document.querySelectorAll(".tilt").forEach((el) => {
    const rx = new Spring(0, { damping: 0.8, response: 0.4 }), ry = new Spring(0, { damping: 0.8, response: 0.4 });
    const run = (dt) => {
      const a = rx.step(dt) | ry.step(dt);
      el.style.setProperty("--rx", rx.value.toFixed(2) + "deg");
      el.style.setProperty("--ry", ry.value.toFixed(2) + "deg");
      return a;
    };
    const strength = el.classList.contains("cta") ? 3 : 6;
    el.addEventListener("pointermove", (e) => {
      if (!el.classList.contains("is-in") && el.classList.contains("reveal")) return;
      el.classList.add("tilt-live");
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--mx", x * 100 + "%");
      el.style.setProperty("--my", y * 100 + "%");
      ry.target = (x - 0.5) * strength * 2;
      rx.target = -(y - 0.5) * strength * 2;
      animate(run);
    });
    el.addEventListener("pointerleave", () => {
      rx.target = ry.target = 0;
      animate(run);
    });
  });

  // ── Magnetische Knöpfe ───────────────────────────────────────────────
  document.querySelectorAll(".magnetic").forEach((el) => {
    const x = new Spring(0, { damping: 0.7, response: 0.35 }), y = new Spring(0, { damping: 0.7, response: 0.35 });
    const run = (dt) => {
      const a = x.step(dt) | y.step(dt);
      el.style.translate = `${x.value.toFixed(2)}px ${y.value.toFixed(2)}px`;
      return a;
    };
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      x.target = (e.clientX - (r.left + r.width / 2)) * 0.25;
      y.target = (e.clientY - (r.top + r.height / 2)) * 0.35;
      animate(run);
    });
    el.addEventListener("pointerleave", () => {
      x.target = y.target = 0;
      animate(run);
    });
  });
})();
