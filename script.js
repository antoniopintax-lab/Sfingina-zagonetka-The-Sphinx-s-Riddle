// script.js — ispravljeno: koristi engleska pitanja kada su dostupna

let language = "hr";
let riddles_hr = [];
let riddles_en = [];
let currentRiddle = null;
let isLoaded = false;

const $ = id => document.getElementById(id);

function updateUIText() {
  try { document.documentElement.lang = (language === "en" ? "en" : "hr"); } catch(e){}
  const appTitle = $("appTitle");
  const subtitle = $("subtitle");
  const languageBoxTitle = $("languageBoxTitle");
  const btnHR = $("btnHR");
  const btnEN = $("btnEN");
  const visitorLabel = $("visitorLabel");
  const answerEl = $("answer");
  const checkBtn = $("checkBtn");
  const dayTitle = $("dayTitle");
  const pageTitle = $("pageTitle");
  const footerText = $("footerText");

  if (language === "en") {
    if (pageTitle) pageTitle.textContent = "The Sphinx's Riddle";
    if (appTitle) appTitle.textContent = "𓂀 The Sphinx's Riddle";
    if (subtitle) subtitle.textContent = "Solve the riddle and discover the secret entrance";
    if (languageBoxTitle) languageBoxTitle.textContent = "Choose language";
    if (btnHR) btnHR.textContent = "🇭🇷 Croatian";
    if (btnEN) btnEN.textContent = "🇬🇧 English";
    if (visitorLabel) visitorLabel.textContent = "visitors today";
    if (answerEl) answerEl.placeholder = "Type your answer";
    if (checkBtn) checkBtn.textContent = "Check answer";
    if (dayTitle) dayTitle.textContent = "🏺 Sphinx riddle of the day";
    if (footerText) footerText.innerHTML = "𓆣  Only the wise pass the Sphinx 𓆣";
  } else {
    if (pageTitle) pageTitle.textContent = "Sfingin izazov";
    if (appTitle) appTitle.textContent = "𓂀 Sfingin izazov";
    if (subtitle) subtitle.textContent = "Riješi zagonetku i otkrij tajnu ulaza";
    if (languageBoxTitle) languageBoxTitle.textContent = "Odaberi jezik";
    if (btnHR) btnHR.textContent = "🇭🇷 Hrvatski";
    if (btnEN) btnEN.textContent = "🇬🇧 English";
    if (visitorLabel) visitorLabel.textContent = "posjetitelja danas";
    if (answerEl) answerEl.placeholder = "Upiši odgovor";
    if (checkBtn) checkBtn.textContent = "Provjeri odgovor";
    if (dayTitle) dayTitle.textContent = "🏺 Sfingina zagonetka dana";
    if (footerText) footerText.innerHTML = "𓆣  Samo mudri prolaze pokraj Sfinge 𓆣";
  }
}

function startGame(lang) {
  language = lang || language;
  try { localStorage.setItem("language", language); } catch (e) {}
  updateUIText();

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
  const checkBtn = $("checkBtn");
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
  const pathHr = `./data/riddles_hr.json`;
  const pathEn = `./data/riddles_en.json`;

  try {
    const [respHr, respEn] = await Promise.all([fetch(pathHr), fetch(pathEn)]);
    if (!respHr.ok) throw new Error(`Failed to load ${pathHr} (${respHr.status})`);
    if (!respEn.ok) console.warn(`Warning: ${pathEn} returned ${respEn.status}. English entries will fallback to HR.`);

    const dataHr = await respHr.json();
    let dataEn = [];
    try { if (respEn.ok) dataEn = await respEn.json(); } catch(e){ dataEn = []; }

    riddles_hr = (Array.isArray(dataHr) ? dataHr : []).map(r => ({
      category: (r.category || ""),
      question: (r.question || ""),
      answers: (Array.isArray(r.answers) ? r.answers : [r.answers || ""])
        .map(a => String(a).toLowerCase().trim())
        .filter(a => a.length > 0)
    }));

    riddles_en = (Array.isArray(dataEn) ? dataEn : []).map(r => ({
      category: (r.category || ""),
      question: (r.question || ""),
      answers: (Array.isArray(r.answers) ? r.answers : [r.answers || ""])
        .map(a => String(a).toLowerCase().trim())
        .filter(a => a.length > 0)
    }));

    isLoaded = true;
  } catch (err) {
    console.error("Greška pri učitavanju baza:", err);
    const res = $("result");
    if (res) {
      res.className = "error";
      res.innerHTML = language === "hr" ? "Greška pri učitavanju zagonetki. Pokušaj ponovno kasnije." : "Error loading riddles. Please try again later.";
    }
    riddles_hr = [];
    riddles_en = [];
    isLoaded = false;
  }
}

function showDailyRiddle() {
  updateUIText();

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

  // QUESTION selection: use EN question if language==='en' and EN question exists at same index
  let questionText = riddles_hr[index].question || "";
  if (language === "en") {
    if (riddles_en[index] && riddles_en[index].question && riddles_en[index].question.trim().length) {
      questionText = riddles_en[index].question;
    } // else keep HR question as fallback
  }

  // ANSWERS selection: prefer language-specific answers, fallback if missing
  let answersForLang = [];
  if (language === "hr") {
    answersForLang = riddles_hr[index].answers || [];
  } else {
    if (riddles_en[index] && Array.isArray(riddles_en[index].answers) && riddles_en[index].answers.length) {
      answersForLang = riddles_en[index].answers;
    } else {
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
  if (answerEl) { answerEl.value = ""; answerEl.disabled = false; answerEl.focus(); }

  const checkBtn = $("checkBtn");
  if (checkBtn) checkBtn.disabled = false;

  const res = $("result");
  if (res) { res.innerHTML = ""; res.className = ""; }

  const title = $("dayTitle");
  if (title) title.innerHTML = language === "hr" ? "🏺 Sfingina zagonetka dana" : "🏺 Sphinx riddle of the day";
}

function checkAnswer() {
  if (!isLoaded || !currentRiddle) return;

  const answerEl = $("answer");
  const res = $("result");
  const checkBtn = $("checkBtn");
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
      res.innerHTML = language === "hr"
        ? `❌ Sfinga nije zadovoljna.<br><br>Pokušaj ponovno.<br>Ulazak na vlastitu odgovornost.`
        : `❌ The Sphinx is not convinced.<br><br>Try again.<br>Enter at your own risk.`;
      res.style.color = "#ff5555";
    }
  }
}

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

(function attachEnter() {
  document.addEventListener("keydown", function (e) {
    const target = e.target;
    const answerEl = $("answer");
    if (e.key === "Enter" && (target === answerEl || document.activeElement === answerEl)) {
      e.preventDefault();
      const checkBtn = $("checkBtn");
      if (checkBtn && !checkBtn.disabled) checkAnswer();
    }
  });
}());

window.onload = function () {
  try {
    const saved = localStorage.getItem("language");
    if (saved) language = saved;
  } catch (e) { console.error("LocalStorage error:", e); }
  updateUIText();
  try {
    if (localStorage.getItem("language")) startGame(language);
  } catch (e) {}
};
