// script.js — finalna verzija (zamijeni postojeći)
/* Osnovne varijable */
let language = "hr";
let riddles = [];
let currentRiddle = null;
let isLoaded = false;

/* Kratki selektor */
const $ = id => document.getElementById(id);

/* Pokretanje igre (poziva se iz index.html) */
function startGame(lang) {
  language = lang || language;
  try { localStorage.setItem("language", language); } catch (e) {}
  const langBox = $("languageBox");
  if (langBox) langBox.style.display = "none";
  const game = $("game");
  if (game) game.classList.remove("hidden");

  setLoading(true);
  loadRiddles().then(() => {
    setLoading(false);
    showDailyRiddle();
    updateVisitors();
  });
}

/* UI loading state: poruka i onemogući gumb */
function setLoading(loading) {
  const res = $("result");
  const checkBtn = document.querySelector("button.check");
  if (loading) {
    if (res) {
      res.className = "";
      res.innerHTML = language === "hr" ? "Učitavanje zagonetki..." : "Loading riddles...";
      res.setAttribute("aria-live", "polite");
    }
    if (checkBtn) checkBtn.disabled = true;
  } else {
    if (res) res.innerHTML = "";
    if (checkBtn) checkBtn.disabled = false;
  }
}

/* Učitavanje JSON datoteke s riddles (relativna putanja za GH Pages) */
async function loadRiddles() {
  isLoaded = false;
  const path = `./data/riddles_${language}.json`;
  try {
    const resp = await fetch(path);
    if (!resp.ok) throw new Error(`Failed to load ${path} (${resp.status})`);
    const data = await resp.json();
    // normalizacija answers (lowercase, trim)
    riddles = (Array.isArray(data) ? data : []).map(r => ({
      category: r.category || "",
      question: r.question || "",
      answers: (Array.isArray(r.answers) ? r.answers : [r.answers || ""])
        .map(a => String(a).toLowerCase().trim())
        .filter(a => a.length > 0)
    }));
    isLoaded = true;
  } catch (err) {
    console.error("Greška pri učitavanju baze:", err);
    const res = $("result");
    if (res) {
      res.className = "error";
      res.innerHTML = language === "hr"
        ? "Greška pri učitavanju zagonetki. Pokušaj ponovno kasnije."
        : "Error loading riddles. Please try again later.";
    }
    riddles = [];
  }
}

/* Odabir i prikaz dnevne zagonetke */
function showDailyRiddle() {
  if (!isLoaded || riddles.length === 0) {
    const rEl = $("riddle");
    if (rEl) rEl.innerHTML = language === "hr" ? "Nema dostupnih zagonetki." : "No riddles available.";
    return;
  }

  const today = new Date();
  const key = String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");

  // (Opcionalno) provjera posebne zagonetke u skripti -- ostavljeno prazno ako ne koristite
  // const special = specialRiddles && specialRiddles[key];

  // Zadana rotacija po danu u godini
  const start = new Date(today.getFullYear(), 0, 0);
  const diff = today - start;
  const day = Math.floor(diff / 86400000);
  const index = (day - 1) % riddles.length;

  currentRiddle = riddles[index];

  const rEl = $("riddle");
  if (rEl) rEl.innerHTML = currentRiddle.question || "";

  const answerEl = $("answer");
  if (answerEl) {
    answerEl.value = "";
    answerEl.disabled = false;
    answerEl.focus();
  }

  const checkBtn = document.querySelector("button.check");
  if (checkBtn) checkBtn.disabled = false;

  const res = $("result");
  if (res) {
    res.innerHTML = "";
    res.className = "";
  }

  const title = $("dayTitle");
  if (title) title.innerHTML = language === "hr" ? "🏺 Sfingina zagonetka dana" : "🏺 Sphinx riddle of the day";
}

/* Provjera unesenog odgovora — IZMJENA: ne ponavlja, zahvaljuje i onemogućava unos */
function checkAnswer() {
  if (!isLoaded || !currentRiddle) return;

  const answerEl = $("answer");
  const res = $("result");
  const checkBtn = document.querySelector("button.check");
  const input = (answerEl && answerEl.value || "").toLowerCase().trim();

  const correct = (currentRiddle.answers || []).some(a => {
    if (!a) return false;
    // točno ili korisnik upisao frazu koja sadrži odgovor
    return input === a || input.includes(a);
  });

  if (correct) {
    // Pozitivna poruka i zahvalnost (bez automatskog ponavljanja)
    if (res) {
      res.className = "success";
      res.innerHTML = language === "hr"
        ? `🗝️ TOČAN ODGOVOR!<br><br>Sfinga ti dopušta prolaz.<br><strong>Hvala što si sudjelovao/la!</strong>`
        : `🗝️ CORRECT ANSWER!<br><br>The Sphinx allows you to enter.<br><strong>Thank you for participating!</strong>`;
      res.style.color = "#7CFC00";
    }

    // Onemogući daljnji unos
    if (answerEl) { answerEl.disabled = true; }
    if (checkBtn) { checkBtn.disabled = true; }

  } else {
    // Neispravan odgovor — zadrži mogućnost ponovnog pokušaja
    if (res) {
      // koristi poruku koja je bila u ranijim verzijama (Sfinga nije zadovoljna / pokušaj ponovno)
      res.className = "error";
      res.innerHTML = language === "hr"
        ? `❌ Sfinga nije zadovoljna.<br><br>Pokušaj ponovno.`
        : `❌ The Sphinx is not convinced.<br><br>Try again.`;
      res.style.color = "#ff5555";
    }
  }
}

/* Zajednički brojač posjeta koristeći Counter API */
function updateVisitors() {
  const counterUrl = (window.SPHINX_CONFIG && window.SPHINX_CONFIG.counterApiUrl) || "https://api.counterapi.dev/v1/sfingin-izazov/visits/up";
  fetch(counterUrl)
    .then(r => r.json())
    .then(data => {
      const count = (data && (data.count ?? data.value ?? data)) || "-";
      const el = $("visitorCount");
      if (el) el.innerHTML = String(count);
    })
    .catch(err => {
      console.warn("Counter API error:", err);
      const el = $("visitorCount");
      if (el) el.innerHTML = "-";
    });
}

/* Enter-to-submit (kad je fokus u inputu) */
(function attachEnter() {
  document.addEventListener("keydown", function (e) {
    const target = e.target;
    const answerEl = $("answer");
    if (e.key === "Enter" && (target === answerEl || document.activeElement === answerEl)) {
      e.preventDefault();
      const checkBtn = document.querySelector("button.check");
      if (checkBtn && !checkBtn.disabled) checkAnswer();
    }
  });
}());

/* Pri učitavanju stranice — restore jezika ako je spremljen */
window.onload = function () {
  try {
    const saved = localStorage.getItem("language");
    if (saved) {
      startGame(saved);
    }
  } catch (e) {
    console.error("LocalStorage error:", e);
  }
};
