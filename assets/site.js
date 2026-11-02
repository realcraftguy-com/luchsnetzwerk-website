// ─── Hier alles eintragen, was sich ändert ──────────────────────────────
const LUCHS = {
  adresse: "practically-each.tun.ply.gg:60202",
  version: "26.2",
  // Discord-Einladung, z. B. "https://discord.gg/abc123". Leer = „Bald verfügbar“.
  discord: "https://dsc.gg/luchsnetzwerk",
  // Vote-Seiten. Leere url = Karte wird als „Bald verfügbar“ angezeigt.
  votes: [
    { name: "minecraft-server.eu", url: "https://minecraft-server.eu/vote/index/23C1C" },
  ],
  // Live-Status über api.mcsrvstat.us (in der Datenschutzerklärung erwähnt)
  statusAbfragen: true,
};
// ────────────────────────────────────────────────────────────────────────

document.querySelectorAll('[data-luchs="adresse"]').forEach((el) => (el.textContent = LUCHS.adresse));
document.querySelectorAll('[data-luchs="version"]').forEach((el) => (el.textContent = LUCHS.version));
document.getElementById("jahr")?.replaceChildren(String(new Date().getFullYear()));

// Discord-Links
document.querySelectorAll("[data-discord]").forEach((a) => {
  if (LUCHS.discord) {
    a.href = LUCHS.discord;
    a.target = "_blank";
    a.rel = "noopener";
  } else {
    a.removeAttribute("href");
    a.setAttribute("aria-disabled", "true");
    a.title = "Discord kommt bald";
    const label = a.querySelector("[data-discord-label]");
    if (label) label.textContent = "Discord kommt bald";
  }
});

// Adresse kopieren – Rückmeldung sofort beim Drücken, Text wechselt nach dem Kopieren
document.querySelectorAll("[data-copy]").forEach((btn) => {
  const label = btn.querySelector("[data-copy-label]");
  const original = label?.textContent;
  let timer;
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(LUCHS.adresse);
    } catch {
      const t = document.createElement("textarea");
      t.value = LUCHS.adresse;
      document.body.append(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    btn.classList.add("is-done");
    document.dispatchEvent(new CustomEvent("luchs:copied", { detail: btn }));
    if (label) label.textContent = "Kopiert";
    navigator.vibrate?.(10);
    clearTimeout(timer);
    timer = setTimeout(() => {
      btn.classList.remove("is-done");
      if (label) label.textContent = original;
    }, 1800);
  });
});

// Vote-Karten
const voteListe = document.getElementById("vote-liste");
if (voteListe) {
  LUCHS.votes.forEach((v, i) => {
    const el = document.createElement(v.url ? "a" : "div");
    el.className = "vote-card tilt reveal" + (v.url ? "" : " is-soon");
    if (v.url) {
      el.href = v.url;
      el.target = "_blank";
      el.rel = "noopener";
    }
    el.innerHTML = `
      <span class="vote-nr">${String(i + 1).padStart(2, "0")}</span>
      <span class="vote-name"></span>
      <span class="vote-cta">${v.url ? "Jetzt voten →" : "Bald verfügbar"}</span>`;
    el.querySelector(".vote-name").textContent = v.name;
    voteListe.append(el);
  });
}

// Live-Status
const status = document.querySelector("[data-status]");
if (status && LUCHS.statusAbfragen) {
  const text = status.querySelector("[data-status-text]");
  fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(LUCHS.adresse)}`)
    .then((r) => r.json())
    .then((d) => {
      if (d.online) {
        status.dataset.status = "online";
        const n = d.players?.online ?? 0;
        text.textContent = `Online · ${n} Spieler`;
        document.dispatchEvent(new CustomEvent("luchs:players", { detail: n }));
      } else {
        status.dataset.status = "offline";
        text.textContent = "Gerade offline";
        document.dispatchEvent(new CustomEvent("luchs:players", { detail: 0 }));
      }
    })
    .catch(() => {
      status.dataset.status = "unknown";
      text.textContent = "Status unbekannt";
    });
} else if (status) {
  status.hidden = true;
}

// Sanftes Einblenden beim Scrollen (entfällt bei reduzierter Bewegung)
if (!matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      }),
    { rootMargin: "0px 0px -8% 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
} else {
  document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-in"));
}

// Mobile Navigation
const navBtn = document.querySelector(".nav-toggle");
navBtn?.addEventListener("click", () => {
  const open = document.body.classList.toggle("nav-open");
  navBtn.setAttribute("aria-expanded", String(open));
});
document.querySelectorAll(".nav-links a").forEach((a) =>
  a.addEventListener("click", () => {
    document.body.classList.remove("nav-open");
    navBtn?.setAttribute("aria-expanded", "false");
  })
);
