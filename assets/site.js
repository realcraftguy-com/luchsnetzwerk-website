// ─── Hier alles eintragen, was sich ändert ──────────────────────────────
const LUCHS = {
  adresse: "practically-each.tun.ply.gg:60202",
  version: "26.2",
  // Discord-Einladung. Leer = „Bald verfügbar“.
  discord: "https://dsc.gg/luchsnetzwerk",
  // Vote-Seiten. Leere url = Karte wird als „Bald verfügbar“ angezeigt.
  votes: [
    { name: "minecraft-server.eu", url: "https://minecraft-server.eu/vote/index/23C1C" },
  ],
  // Live-Status: zuerst mcstatus.io, bei Fehlern mcsrvstat.us (beide in der Datenschutzerklärung genannt)
  statusDienste: [
    {
      url: (a) => `https://api.mcstatus.io/v2/status/java/${encodeURIComponent(a)}`,
      lesen: (d) => ({ online: !!d.online, spieler: d.players?.online, max: d.players?.max, motd: d.motd?.clean }),
    },
    {
      url: (a) => `https://api.mcsrvstat.us/3/${encodeURIComponent(a)}`,
      lesen: (d) => ({ online: !!d.online, spieler: d.players?.online, max: d.players?.max, motd: d.motd?.clean?.join("\n") }),
    },
  ],
};
// ────────────────────────────────────────────────────────────────────────

document.documentElement.classList.remove("no-js");
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

$$('[data-luchs="adresse"]').forEach((el) => (el.textContent = LUCHS.adresse));
$$('[data-luchs="version"]').forEach((el) => (el.textContent = LUCHS.version));
$$("[data-jahr]").forEach((el) => (el.textContent = new Date().getFullYear()));

// Discord-Links
$$("[data-discord]").forEach((a) => {
  if (LUCHS.discord) {
    a.href = LUCHS.discord;
    a.target = "_blank";
    a.rel = "noopener";
  } else {
    a.removeAttribute("href");
    a.setAttribute("aria-disabled", "true");
  }
});

// Mitteilung unten am Rand
const toast = document.querySelector(".toast");
let toastTimer;
function melden(text) {
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add("zeigen");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("zeigen"), 2200);
}

// Adresse kopieren
$$("[data-copy]").forEach((btn) => {
  const label = btn.querySelector("[data-copy-label]");
  const original = label?.textContent;
  let timer;
  btn.addEventListener("click", async () => {
    let ok = true;
    try {
      await navigator.clipboard.writeText(LUCHS.adresse);
    } catch {
      const t = document.createElement("textarea");
      t.value = LUCHS.adresse;
      t.setAttribute("readonly", "");
      t.style.position = "fixed";
      t.style.opacity = "0";
      document.body.append(t);
      t.select();
      ok = document.execCommand("copy");
      t.remove();
    }
    if (!ok) {
      melden("Kopieren ging nicht – bitte Adresse markieren");
      return;
    }
    btn.classList.add("is-done");
    if (label) label.textContent = "Kopiert";
    melden("Adresse kopiert – in Minecraft unter Mehrspieler einfügen");
    navigator.vibrate?.(10);
    document.dispatchEvent(new CustomEvent("luchs:copied", { detail: btn }));
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
    el.className = "vote-card" + (v.url ? "" : " is-soon");
    if (v.url) {
      el.href = v.url;
      el.target = "_blank";
      el.rel = "noopener";
    }
    el.innerHTML = `<span class="vote-nr">${String(i + 1).padStart(2, "0")}</span><span class="vote-name"></span><span class="vote-cta">${v.url ? "Jetzt voten ›" : "Bald verfügbar"}</span>`;
    el.querySelector(".vote-name").textContent = v.name;
    voteListe.append(el);
  });
}

// ── Live-Status ─────────────────────────────────────────────────────────
// Ergebnis geht an alle Felder mit data-live="…"; nichts wird erfunden: ohne Antwort steht „–“.
async function statusHolen() {
  for (const dienst of LUCHS.statusDienste) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const r = await fetch(dienst.url(LUCHS.adresse), { signal: ctrl.signal, cache: "no-store" });
      clearTimeout(t);
      if (!r.ok) continue;
      const s = dienst.lesen(await r.json());
      // mcsrvstat meldet bei playit-Tunneln oft fälschlich „offline“ – dann den nächsten Dienst fragen
      if (!s.online && dienst !== LUCHS.statusDienste.at(-1)) continue;
      return s;
    } catch {
      /* nächster Dienst */
    }
  }
  return null;
}

function statusZeigen(s) {
  const set = (key, text) => $$(`[data-live="${key}"]`).forEach((el) => (el.textContent = text));
  const zustand = s == null ? "unbekannt" : s.online ? "online" : "offline";
  $$("[data-status-pill]").forEach((el) => {
    el.dataset.status = zustand;
    el.textContent = s == null ? "Status nicht abrufbar" : s.online ? `Online · ${s.spieler ?? 0} ${s.spieler === 1 ? "Spieler" : "Spieler"}` : "Gerade offline";
  });
  set("zustand", s == null ? "Unbekannt" : s.online ? "Online" : "Offline");
  set("spieler", s?.online && s.spieler != null ? String(s.spieler) : "–");
  set("max", s?.online && s.max != null ? String(s.max) : "–");
  set("motd", s?.motd || "–");
  set("geprueft", new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  $$("[data-live-feld]").forEach((el) => {
    el.classList.toggle("ok", zustand === "online");
    el.classList.toggle("aus", zustand === "offline");
  });
  $$("[data-live-balken]").forEach((el) => {
    el.style.width = s?.online && s.max ? `${Math.max(2, Math.min(100, (s.spieler / s.max) * 100))}%` : "0";
  });
  document.dispatchEvent(new CustomEvent("luchs:status", { detail: s }));
}

async function statusAktualisieren() {
  statusZeigen(await statusHolen());
}
if (document.querySelector("[data-status-pill], [data-live]")) {
  statusAktualisieren();
  // Auf der Status-Seite jede Minute neu, sonst nur einmal
  if (document.body.classList.contains("seite-status")) setInterval(statusAktualisieren, 60000);
  $$("[data-status-neu]").forEach((b) => b.addEventListener("click", statusAktualisieren));
}

// ── Mobile Navigation ───────────────────────────────────────────────────
const navBtn = document.querySelector(".nav-toggle");
function navSetzen(offen) {
  document.body.classList.toggle("nav-open", offen);
  navBtn?.setAttribute("aria-expanded", String(offen));
  navBtn?.setAttribute("aria-label", offen ? "Menü schließen" : "Menü öffnen");
}
navBtn?.addEventListener("click", () => navSetzen(!document.body.classList.contains("nav-open")));
$$(".nav-links a").forEach((a) => a.addEventListener("click", () => navSetzen(false)));
addEventListener("keydown", (e) => e.key === "Escape" && navSetzen(false));
matchMedia("(min-width: 901px)").addEventListener("change", (e) => e.matches && navSetzen(false));

// Trailer: Klick spielt das Video von vorn mit Ton und Bedienleiste
$$("[data-trailer-ton]").forEach((b) => b.addEventListener("click", () => {
  const held = document.querySelector(".trailer-held"), v = held.querySelector("video");
  held.classList.add("mit-ton");
  held.scrollIntoView({ behavior: "smooth" });
  Object.assign(v, { muted: false, loop: false, controls: true, currentTime: 0 });
  v.play();
  v.addEventListener("ended", () => held.classList.remove("mit-ton"), { once: true });
}));
