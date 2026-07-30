// Final script.js — GitHub Pages ready with admin features
let language = "hr";
let riddles = [];
let currentRiddle = null;
let isLoaded = false;
const $ = id => document.getElementById(id);

// Optional special riddles (MM-DD keys). Keep empty or edit in script if needed.
const specialRiddles = {};

// Start game (called from index.html buttons)
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

async function loadRiddles() {
  isLoaded = false;
  const path = `./data/riddles_${language}.json`;
  try {
    const resp = await fetch(path);
    if (!resp.ok) throw new Error(`Failed to load ${path} (${resp.status})`);
    const data = await resp.json();
    riddles = (Array.isArray(data) ? data : []).map(r => ({
      category: r.category || "",
      question: r.question || "",
      answers: (Array.isArray(r.answers) ? r.answers : [r.answers || ""])
        .map(a => String(a).toLowerCase().trim())
        .filter(a => a.length > 0)
    }));
    isLoaded = true;
  } catch (err) {
    console.error("Greška baze:", err);
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

function showDailyRiddle() {
  if (!isLoaded || riddles.length === 0) {
    const rEl = $("riddle");
    if (rEl) rEl.innerHTML = language === "hr" ? "Nema dostupnih zagonetki." : "No riddles available.";
    return;
  }

  const today = new Date();
  const key = String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");

  // check for special riddle
  let chosen = null;
  const s = specialRiddles[key];
  if (s && s.question && Array.isArray(s.answers) && s.answers.length) {
    chosen = {
      question: s.question,
      answers: s.answers.map(a => String(a).toLowerCase().trim())
    };
  } else {
    // default rotation by day of year
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today - start;
    const day = Math.floor(diff / 86400000);
    const index = (day - 1) % riddles.length;
    chosen = riddles[index];
  }

  currentRiddle = chosen;
  const rEl = $("riddle");
  if (rEl) rEl.innerHTML = currentRiddle.question || "";
  const answerEl = $("answer");
  if (answerEl) { answerEl.value = ""; answerEl.focus(); }
  const res = $("result");
  if (res) res.innerHTML = "";
  const title = $("dayTitle");
  if (title) title.innerHTML = language === "hr" ? "🏺 Sfingina zagonetka dana" : "🏺 Sphinx riddle of the day";
}

function checkAnswer() {
  if (!isLoaded || !currentRiddle) return;
  const answerEl = $("answer");
  const res = $("result");
  const input = (answerEl && answerEl.value || "").toLowerCase().trim();

  const correct = (currentRiddle.answers || []).some(a => {
    if (!a) return false;
    return input === a || input.includes(a);
  });

  if (correct) {
    if (res) {
      res.className = "success";
      res.innerHTML = language === "hr"
        ? `🗝️ TOČAN ODGOVOR!<br><br>Sfinga ti dopušta prolaz.<br>Slobodno uđi i razgledaj.`
        : `🗝️ CORRECT ANSWER!<br><br>The Sphinx allows you to enter.<br>Feel free to explore.`;
      res.style.color = "#7CFC00";
      setTimeout(showDailyRiddle, 2200);
    }
  } else {
    if (res) {
      res.className = "error";
      res.innerHTML = language === "hr"
        ? `⚠️ Netočan odgovor.<br><br>Pokušaj ponovno.<br>Ulazak je na vlastitu odgovornost.`
        : `⚠️ Wrong answer.<br><br>Try again.<br>Enter at your own risk.`;
      res.style.color = "#ff5555";
    }
  }
}

function updateVisitors() {
  const url = (window.SPHINX_CONFIG && window.SPHINX_CONFIG.counterApiUrl) || "https://api.counterapi.dev/v1/sfingin-izazov/visits/up";
  fetch(url)
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

// Enter-to-submit
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

window.onload = function () {
  try {
    const saved = localStorage.getItem("language");
    if (saved) startGame(saved);
  } catch (e) { console.error("LocalStorage error:", e); }
};
