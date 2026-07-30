// script.js — ažurirana verzija: ista pitanja za HR/EN, jezično-specifični odgovori, poruka o odgovornosti

let language = "hr";
let riddles_hr = [];
let riddles_en = [];
let currentRiddle = null;
let isLoaded = false;

const $ = id => document.getElementById(id);

// Pokretanje igre (poziva se iz index.html)
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

// UI loading state
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

// Učitavanje obje baze (HR i EN)
async function loadRiddles() {
  isLoaded = false;
  const pathHr = `./data/riddles_hr.json`;
  const pathEn = `./data/riddles_en.json`;

  try {
    const [respHr, respEn] = await Promise.all([fetch(pathHr), fetch(pathEn)]);

    if (!respHr.ok) throw new Error(`Failed to load ${pathHr} (${respHr.status})`);
    // EN could be missing; handle gracefully
    if (!respEn.ok) {
      console.warn(`Warning: ${pathEn} returned ${respEn.status}. English answers will fallback to HR.`);
    }

    const dataHr = await respHr.json();
    let dataEn = [];
    try {
      if (respEn.ok) dataEn = await respEn.json();
    } catch (e) {
      dataEn = [];
    }

    // Normaliziraj: pitanja i odgovore
    riddles_hr = (Array.isArray(dataHr) ? dataHr : []).map(r => ({
      category: r.category || "",
      question: r.question || "",
      answers: (Array.isArray(r.answers) ? r.answers : [r.answers || ""])
        .map(a => String(a).toLowerCase().trim())
        .filter(a => a.length > 0)
    }));

    riddles_en = (Array.isArray(dataEn) ? dataEn : []).map(r => ({
      category: r.category || "",
      // keep question but we will override display question with HR version so both are identical
      question: r.question || "",
      answers: (Array.isArray(r.answers) ? r.answers : [r.answers || ""])
        .map(a => String(a).toLowerCase().trim())
        .filter(a => a.length > 0)
    }));

    // If english list shorter or empty, we may fallback answers to HR later
    isLoaded = true;
  } catch (err) {
    console.error("Greška pri učitavanju baza:", err);
    const res = $("result");
    if (res) {
      res.className = "error";
      res.innerHTML = language === "hr"
        ? "Greška pri učitavanju zagonetki. Pokušaj ponovno kasnije."
        : "Error loading riddles. Please try again later.";
    }
    riddles_hr = [];
    riddles_en = [];
    isLoaded = false;
  }
}

// Prikaz dnevne zagonetke — ISTO pitanje za HR i EN (uzimamo tekst iz HR baze)
function showDailyRiddle() {
  if (!isLoaded || riddles_hr.length === 0) {
    const rEl = $("riddle");
    if (rEl) rEl.innerHTML = language === "hr" ? "Nema dostupnih zagonetki." : "No riddles available.";
    return;
  }

  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 0);
  const diff = today - start;
  const day = Math.floor(diff / 86400000);
  const index = (day - 1) % riddles_hr.length;

  // Uzmi pitanje iz HR baze – time su HR i EN pitanja ista
  const questionText = riddles_hr[index].question || "";

  // Odgovori zavise o jeziku; fallback na HR odgovore ako EN nema
  let answersForLang = [];
  if (language === "hr") {
    answersForLang = riddles_hr[index].answers || [];
  } else {
    // ENG: prefer riddles_en if it has an entry at same index with answers
    if (riddles_en[index] && Array.isArray(riddles_en[index].answers) && riddles_en[index].answers.length) {
      answersForLang = riddles_en[index].answers;
    } else {
      // fallback to HR answers if EN missing
      answersForLang = riddles_hr[index].answers || [];
    }
  }

  currentRiddle = {
    index,
    question: questionText,
    answers: answersForLang
  };

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
  if (res) { res.innerHTML = ""; res.className = ""; }

  const title = $("dayTitle");
  if (title) title.innerHTML = language === "hr" ? "🏺 Sfingina zagonetka dana" : "🏺 Sphinx riddle of the day";
}

// Provjera odgovora — ako netočno, dodaj poruku o odgovornosti (HR/EN)
function checkAnswer() {
  if (!isLoaded || !currentRiddle) return;

  const answerEl = $("answer");
  const res = $("result");
  const checkBtn = document.querySelector("button.check");
  const input = (answerEl && answerEl.value || "").toLowerCase().trim();

  const correct = (currentRiddle.answers || []).some(a => {
    if (!a) return false;
    return input === a || input.includes(a);
  });

  if (correct) {
    if (res) {
      res.className = "success";
      res.innerHTML = language === "hr"
        ? `🗝️ TOČAN ODGOVOR!<br><br>Sfinga ti dopušta prolaz.<br><strong>Hvala što si sudjelovao/la!</strong>`
        : `🗝️ CORRECT ANSWER!<br><br>The Sphinx allows you to enter.<br><strong>Thank you for participating!</strong>`;
      res.style.color = "#7CFC00";
    }
    if (answerEl) answerEl.disabled = true;
    if (checkBtn) checkBtn.disabled = true;
  } else {
    if (res) {
      res.className = "error";
      // Poruka uključuje i upozorenje o vlastitoj odgovornosti za oba jezika
      res.innerHTML = language === "hr"
        ? `❌ Sfinga nije zadovoljna.<br><br>Pokušaj ponovno.<br>Ulazak na vlastitu odgovornost.`
        : `❌ The Sphinx is not convinced.<br><br>Try again.<br>Enter at your own risk.`;
      res.style.color = "#ff5555";
    }
  }
}

// Zajednički brojač posjeta (Counter API) — tolerantno parsiranje rezultata
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

// Enter-to-submit (kada je fokus u polju za odgovor)
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

// Pri pokretanju stranice — restore jezika ako je spremljen
window.onload = function () {
  try {
    const saved = localStorage.getItem("language");
    if (saved) startGame(saved);
  } catch (e) {
    console.error("LocalStorage error:", e);
  }
};
