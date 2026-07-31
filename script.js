// script.js — HR/EN pools + UI text switching + cache-bust for sphinx image
// + show-answer button (hidden until first attempt) + localized confirmation

let language = "hr";
let riddles_hr = [];
let riddles_en = [];
let currentRiddle = null;
let isLoaded = false;
let hasAttempted = false;

const $ = id => document.getElementById(id);

/* Update UI texts according to language */
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
  const showAnswerBtn = $("showAnswerBtn"); // ADDED
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
    if (showAnswerBtn) showAnswerBtn.textContent = "Show answer"; // ADDED
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
    if (showAnswerBtn) showAnswerBtn.textContent = "Prikaži odgovor"; // ADDED
    if (dayTitle) dayTitle.textContent = "🏺 Sfingina zagonetka dana";
    if (footerText) footerText.innerHTML = "𓆣  Samo mudri prolaze pokraj Sfinge 𓆣";
  }
}

/* Start game */
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

/* Loading UI */
function setLoading(loading) {
  const res = $("result");
  const checkBtn = $("checkBtn");
  const showAnswerBtn = $("showAnswerBtn"); // ADDED
  if (loading) {
    if (res) {
      res.className = "";
      res.innerHTML = language === "hr" ? "Učitavanje zagonetki..." : "Loading riddles...";
      res.setAttribute("aria-live", "polite");
    }
    if (checkBtn) checkBtn.disabled = true;
    if (showAnswerBtn) { showAnswerBtn.style.display = 'none'; showAnswerBtn.disabled = true; }
  } else {
    if (res) res.innerHTML = "";
    if (checkBtn) checkBtn.disabled = false;
    // showAnswerBtn stays controlled by hasAttempted/showDailyRiddle
  }
}

/* Load HR and EN JSON files (EN optional) */
async function loadRiddles() {
  isLoaded = false;
  const pathHr = `./data/riddles_hr.json`;
  const pathEn = `./data/riddles_en.json`;

  try {
    const [respHr, respEn] = await Promise.all([fetch(pathHr), fetch(pathEn).catch(()=>({ ok: false }))]);

    if (!respHr.ok) throw new Error(`Failed to load ${pathHr} (${respHr.status})`);
    if (!respEn.ok) console.warn(`Warning: ${pathEn} not available or returned ${respEn.status}. English pool will fallback to HR.`);

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
    console.error("Error loading riddle files:", err);
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

/* Show daily riddle:
   - if language === 'en' and riddles_en available -> select from EN pool
   - else select from HR pool
*/
function showDailyRiddle() {
  updateUIText();

  hasAttempted = false; // reset flag for new riddle

  const resEl = $("result");
  if (!isLoaded || riddles_hr.length === 0) {
    const rEl = $("riddle");
    if (rEl) rEl.innerHTML = language === "hr" ? "Nema dostupnih zagonetki." : "No riddles available.";
    return;
  }

  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 0);
  const diff = today - start;
  const day = Math.floor(diff / 86400000);
  let pool = riddles_hr;
  if (language === "en" && riddles_en.length > 0) pool = riddles_en;

  let index;
  const cfgIndex = (window.SPHINX_CONFIG && Number.isInteger(window.SPHINX_CONFIG.forceRiddleIndex)) ? window.SPHINX_CONFIG.forceRiddleIndex : null;
  if (cfgIndex !== null) {
    index = Math.abs(cfgIndex) % pool.length;
  } else {
    index = ((day - 1) % pool.length + pool.length) % pool.length;
  }

  const questionText = (pool[index] && pool[index].question) ? pool[index].question : "";
  const answersForLang = (pool[index] && Array.isArray(pool[index].answers)) ? pool[index].answers : [];

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

  const showAnswerBtn = $("showAnswerBtn"); // ensure hidden until attempt
  if (showAnswerBtn) {
    showAnswerBtn.style.display = 'none';
    showAnswerBtn.disabled = true;
    showAnswerBtn.setAttribute('aria-expanded', 'false');
  }

  if (resEl) { resEl.innerHTML = ""; resEl.className = ""; }

  const title = $("dayTitle");
  if (title) title.innerHTML = language === "hr" ? "🏺 Sfingina zagonetka dana" : "🏺 Sphinx riddle of the day";
}

/* Show confirmation then answer (localized) */
function confirmShowAnswer() {
  if (!currentRiddle) return;
  const msg = language === "hr"
    ? "Jeste li sigurni da želite prikazati odgovor? To će onemogućiti daljnje pokušaje."
    : "Are you sure you want to show the answer? This will disable further attempts.";
  if (window.confirm(msg)) {
    showAnswer();
  } else {
    const a = $("answer");
    if (a && !a.disabled) a.focus();
    const showAnswerBtn = $("showAnswerBtn");
    if (showAnswerBtn) showAnswerBtn.setAttribute('aria-expanded', 'false');
  }
}

/* Show the correct answer(s) and lock input */
function showAnswer() {
  if (!currentRiddle) return;
  const res = $("result");
  const answers = (currentRiddle.answers && currentRiddle.answers.length) ? currentRiddle.answers : [];

  if (!answers.length) {
    if (res) {
      res.className = "info";
      res.innerHTML = language === "hr" ? "Nema dostupnog odgovora za ovu zagonetku." : "No answer available for this riddle.";
    }
    const showAnswerBtn = $("showAnswerBtn");
    if (showAnswerBtn) showAnswerBtn.disabled = true;
    return;
  }

  const display = answers.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ');

  if (res) {
    res.className = "info";
    res.innerHTML = language === "hr"
      ? `<strong>Odgovor:</strong> ${display}`
      : `<strong>Answer:</strong> ${display}`;
  }

  const answerEl = $("answer");
  if (answerEl) { answerEl.value = ''; answerEl.disabled = true; }

  const checkBtn = $("checkBtn");
  if (checkBtn) checkBtn.disabled = true;

  const showAnswerBtn = $("showAnswerBtn");
  if (showAnswerBtn) {
    showAnswerBtn.disabled = true;
    showAnswerBtn.setAttribute('aria-expanded', 'true');
  }
}

/* Check answer: success disables input; wrong shows message + responsibility warning
   Also reveals the 'show answer' button after first attempt.
*/
function checkAnswer() {
  if (!isLoaded || !currentRiddle) return;

  hasAttempted = true;
  const answerEl = $("answer");
  const res = $("result");
  const checkBtn = $("checkBtn");
  const showAnswerBtn = $("showAnswerBtn");
  const input = (answerEl && answerEl.value || "").toLowerCase().trim();

  // reveal show-answer button after first attempt
  if (showAnswerBtn) {
    showAnswerBtn.style.display = '';
    showAnswerBtn.disabled = false;
    showAnswerBtn.setAttribute('aria-expanded', 'false');
  }

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
    if (showAnswerBtn) showAnswerBtn.disabled = true;
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

/* Visitor counter (tolerant parsing) */
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

/* Cache-bust for sphinx image: forces browser to fetch the latest file */
function bustSphinxCache() {
  const img = document.getElementById('sphinxImg') || document.querySelector('.sphinx img');
  if (!img) return;

  // get base path (strip existing query)
  const base = (img.getAttribute('data-src') || img.getAttribute('src') || '').split('?')[0];
  if (!base) return;

  // store original base once
  if (!img.getAttribute('data-src')) img.setAttribute('data-src', base);

  // set src with timestamp to bypass cache
  img.src = base + '?v=' + Date.now();
}

/* Enter-to-submit when focus is on input */
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

/* On load: restore language if saved, bust cache for sphinx image, update UI & auto-start if needed */
window.onload = function () {
  try {*

