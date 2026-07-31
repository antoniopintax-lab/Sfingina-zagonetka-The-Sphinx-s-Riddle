// script.js — HR/EN pools + UI text switching + cache-bust for sphinx image
// + show-answer button (hidden until first attempt) + localized confirmation
// + visitor counter: total / daily (uses CountAPI: https://api.countapi.xyz)
// NOTE: counts every page visit, even from the same browser

let language = "hr";
let riddles_hr = [];
let riddles_en = [];
let currentRiddle = null;
let isLoaded = false;
let hasAttempted = false;

const $ = id => document.getElementById(id);

/* --- utility for visitor counting --- */
const COUNTAPI_NAMESPACE = 'antoniopintax_lab_sfinga'; // unique namespace
const TOTAL_KEY = 'total_visits';
function dailyKeyForDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `daily_${y}-${m}-${d}`;
}

function fetchWithTimeout(url, opts = {}, ms = 7000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(url, opts).then(res => {
      clearTimeout(timer);
      resolve(res);
    }).catch(err => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/* --- Update UI texts according to language --- */
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
  const showAnswerBtn = $("showAnswerBtn");
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
    if (visitorLabel) visitorLabel.textContent = "visitors all/today";
    if (answerEl) answerEl.placeholder = "Type your answer";
    if (checkBtn) checkBtn.textContent = "Check answer";
    if (showAnswerBtn) showAnswerBtn.textContent = "Show answer";
    if (dayTitle) dayTitle.textContent = "🏺 Sphinx riddle of the day";
    if (footerText) footerText.innerHTML = "𓆣  Only the wise pass the Sphinx 𓆣";
  } else {
    if (pageTitle) pageTitle.textContent = "Sfingin izazov";
    if (appTitle) appTitle.textContent = "𓂀 Sfingin izazov";
    if (subtitle) subtitle.textContent = "Riješi zagonetku i otkrij tajnu ulaza";
    if (languageBoxTitle) languageBoxTitle.textContent = "Odaberi jezik";
    if (btnHR) btnHR.textContent = "🇭🇷 Hrvatski";
    if (btnEN) btnEN.textContent = "🇬🇧 English";
    if (visitorLabel) visitorLabel.textContent = "posjetitelja ukupno/danas";
    if (answerEl) answerEl.placeholder = "Upiši odgovor";
    if (checkBtn) checkBtn.textContent = "Provjeri odgovor";
    if (showAnswerBtn) showAnswerBtn.textContent = "Prikaži odgovor";
    if (dayTitle) dayTitle.textContent = "🏺 Sfingina zagonetka dana";
    if (footerText) footerText.innerHTML = "𓆣  Samo mudri prolaze pokraj Sfinge 𓆣";
  }
}

/* --- Start / Loading / Riddles (unchanged) --- */
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
    updateVisitors(); // update visitors after showing UI
  });
}

function setLoading(loading) {
  const res = $("result");
  const checkBtn = $("checkBtn");
  const showAnswerBtn = $("showAnswerBtn");
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
  }
}

/* Load riddles with fallback */
const FALLBACK_HR = [
  { question: "Što hoda četiri noge ujutro, dvije popodne i tri navečer?", answers: ["čovjek","covjek","clovjek"] },
  { question: "Koja riječ postane kraća kad joj dodaš dva slova?", answers: ["kratko","shorter"] }
];
const FALLBACK_EN = [
  { question: "What walks on four legs in the morning, two in the afternoon, and three at night?", answers: ["man","human"] },
  { question: "What word becomes shorter when you add two letters to it?", answers: ["short"] }
];

async function loadRiddles() {
  isLoaded = false;
  const pathHr = `./data/riddles_hr.json`;
  const pathEn = `./data/riddles_en.json`;

  try {
    const respHrPromise = fetch(pathHr).catch(()=>({ ok:false }));
    const respEnPromise = fetch(pathEn).catch(()=>({ ok:false }));
    const [respHr, respEn] = await Promise.all([respHrPromise, respEnPromise]);

    let dataHr = null;
    if (respHr && respHr.ok) {
      try { dataHr = await respHr.json(); } catch(e){ dataHr = null; }
    }
    let dataEn = null;
    if (respEn && respEn.ok) {
      try { dataEn = await respEn.json(); } catch(e){ dataEn = null; }
    }

    if (!dataHr) dataHr = FALLBACK_HR;
    if (!dataEn) dataEn = [];

    riddles_hr = (Array.isArray(dataHr) ? dataHr : []).map(r => ({
      category: (r.category || ""),
      question: (r.question || r.q || ""),
      answers: (Array.isArray(r.answers) ? r.answers : [r.answers || ""])
        .map(a => String(a).toLowerCase().trim())
        .filter(a => a.length > 0)
    }));

    riddles_en = (Array.isArray(dataEn) ? dataEn : []).map(r => ({
      category: (r.category || ""),
      question: (r.question || r.q || ""),
      answers: (Array.isArray(r.answers) ? r.answers : [r.answers || ""])
        .map(a => String(a).toLowerCase().trim())
        .filter(a => a.length > 0)
    }));

    if (language === "en" && riddles_en.length === 0 && FALLBACK_EN.length) {
      riddles_en = FALLBACK_EN.map(r => ({ question: r.question, answers: r.answers.map(a=>String(a).toLowerCase()) }));
    }

    isLoaded = true;
  } catch (err) {
    console.error("Error loading riddle files:", err);
    const res = $("result");
    if (res) {
      res.className = "error";
      res.innerHTML = language === "hr" ? "Greška pri učitavanju zagonetki. Pokušaj ponovno kasnije." : "Error loading riddles. Please try again later.";
    }
    riddles_hr = FALLBACK_HR.map(r => ({ question: r.question, answers: r.answers.map(a=>String(a).toLowerCase()) }));
    riddles_en = (language === "en" ? FALLBACK_EN.map(r => ({ question: r.question, answers: r.answers.map(a=>String(a).toLowerCase()) })) : []);
    isLoaded = true;
  }
}

/* Show daily riddle */
function showDailyRiddle() {
  updateUIText();

  hasAttempted = false;

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

  const showAnswerBtn = $("showAnswerBtn");
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

/* Show answer and lock input */
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

/* Check answer */
function checkAnswer() {
  if (!isLoaded || !currentRiddle) return;

  hasAttempted = true;
  const answerEl = $("answer");
  const res = $("result");
  const checkBtn = $("checkBtn");
  const showAnswerBtn = $("showAnswerBtn");
  const input = (answerEl && answerEl.value || "").toLowerCase().trim();

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

/* --- Visitor counter logic using CountAPI (counts every visit) --- */
async function countapiHit(namespace, key) {
  const url = `https://api.countapi.xyz/hit/${encodeURIComponent(namespace)}/${encodeURIComponent(key)}`;
  try {
    const resp = await fetchWithTimeout(url, { method: 'GET' }, 7000);
    if (!resp.ok) throw new Error('countapi hit failed');
    const json = await resp.json();
    return (json && typeof json.value === 'number') ? json.value : null;
  } catch (e) {
    console.warn('countapi hit error', e);
    return null;
  }
}

async function countapiGet(namespace, key) {
  const url = `https://api.countapi.xyz/get/${encodeURIComponent(namespace)}/${encodeURIComponent(key)}`;
  try {
    const resp = await fetchWithTimeout(url, { method: 'GET' }, 7000);
    if (!resp.ok) throw new Error('countapi get failed');
    const json = await resp.json();
    return (json && typeof json.value === 'number') ? json.value : null;
  } catch (e) {
    return null;
  }
}

async function updateVisitors() {
  const visitorEl = $("visitorCount");
  if (!visitorEl) return;

  const today = new Date();
  const dailyKey = dailyKeyForDate(today);

  let totalValue = null;
  let dailyValue = null;

  // Always increment total
  try {
    const v = await countapiHit(COUNTAPI_NAMESPACE, TOTAL_KEY);
    if (typeof v === 'number') totalValue = v;
  } catch (e) { /* ignore */ }

  // Always increment daily
  try {
    const v2 = await countapiHit(COUNTAPI_NAMESPACE, dailyKey);
    if (typeof v2 === 'number') dailyValue = v2;
  } catch (e) { /* ignore */ }

  // If values not returned from hits (API issue), fetch current values
  try {
    if (totalValue === null) {
      const tv = await countapiGet(COUNTAPI_NAMESPACE, TOTAL_KEY);
      totalValue = (tv === null) ? 0 : tv;
    }
  } catch (e) { totalValue = totalValue ?? '-'; }

  try {
    if (dailyValue === null) {
      const dv = await countapiGet(COUNTAPI_NAMESPACE, dailyKey);
      dailyValue = (dv === null) ? 0 : dv;
    }
  } catch (e) { dailyValue = dailyValue ?? '-'; }

  const totText = (typeof totalValue === 'number') ? String(totalValue) : '-';
  const dayText = (typeof dailyValue === 'number') ? String(dailyValue) : '-';
  visitorEl.textContent = `${totText}/${dayText}`;
}

/* --- rest unchanged: cache-bust, enter, onload --- */
function bustSphinxCache() {
  const img = document.getElementById('sphinxImg') || document.querySelector('.sphinx img');
  if (!img) return;
  const base = (img.getAttribute('data-src') || img.getAttribute('src') || '').split('?')[0];
  if (!base) return;
  if (!img.getAttribute('data-src')) img.setAttribute('data-src', base);
  img.src = base + '?v=' + Date.now();
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
  try { bustSphinxCache(); } catch (e) {}
  try {
    if (localStorage.getItem("language")) startGame(language);
  } catch (e) {}
};
