// script.js — HR/EN + show-answer + cache-bust + visitor counter (total only, single number)
// Note: page will NOT auto-start the game on load; user must click a language button to enter the game.
// The visitor counter increments on every page load.

let language = "hr";
let riddles_hr = [];
let riddles_en = [];
let currentRiddle = null;
let isLoaded = false;
let hasAttempted = false;

const $ = id => document.getElementById(id);

/* --- CountAPI / local fallback settings --- */
const COUNTAPI_NAMESPACE = 'antoniopintax_lab_sfinga';
const TOTAL_KEY = 'total_visits';
const LS_LAST_TOTAL = 'sphinx_last_total';
const LS_FALLBACK_FLAG = 'sphinx_use_local_fallback';

/* fetch with timeout helper */
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

/* CountAPI helpers (robust) */
async function countapiHit(namespace, key) {
  const url = `https://api.countapi.xyz/hit/${encodeURIComponent(namespace)}/${encodeURIComponent(key)}`;
  try {
    const resp = await fetchWithTimeout(url, { method: 'GET' }, 7000);
    if (!resp || !resp.ok) return null;
    const json = await resp.json();
    return (json && typeof json.value === 'number') ? json.value : null;
  } catch (e) {
    console.debug('countapiHit error', e && e.message, url);
    return null;
  }
}

async function countapiGet(namespace, key) {
  const url = `https://api.countapi.xyz/get/${encodeURIComponent(namespace)}/${encodeURIComponent(key)}`;
  try {
    const resp = await fetchWithTimeout(url, { method: 'GET' }, 7000);
    if (!resp || !resp.ok) return null;
    const json = await resp.json();
    return (json && typeof json.value === 'number') ? json.value : null;
  } catch (e) {
    console.debug('countapiGet error', e && e.message, url);
    return null;
  }
}

/* LocalStorage helpers */
function safeSetLS(key, value) {
  try { localStorage.setItem(key, String(value)); } catch (e) { /* ignore */ }
}
function safeGetLSInt(key) {
  try { const v = localStorage.getItem(key); return v === null ? null : parseInt(v, 10); } catch (e) { return null; }
}

/* --- Fallback riddles --- */
const FALLBACK_HR = [
  { question: "Što hoda četiri noge ujutro, dvije popodne i tri navečer?", answers: ["čovjek","covjek","clovjek"] },
  { question: "Koja riječ postane kraća kad joj dodaš dva slova?", answers: ["kratko","shorter"] }
];
const FALLBACK_EN = [
  { question: "What walks on four legs in the morning, two in the afternoon, and three at night?", answers: ["man","human"] },
  { question: "What word becomes shorter when you add two letters to it?", answers: ["short"] }
];

/* --- UI text updates (HR/EN) --- */
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
    if (visitorLabel) visitorLabel.textContent = "total visitors";
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
    if (visitorLabel) visitorLabel.textContent = "posjetitelja ukupno";
    if (answerEl) answerEl.placeholder = "Upiši odgovor";
    if (checkBtn) checkBtn.textContent = "Provjeri odgovor";
    if (showAnswerBtn) showAnswerBtn.textContent = "Prikaži odgovor";
    if (dayTitle) dayTitle.textContent = "🏺 Sfingina zagonetka dana";
    if (footerText) footerText.innerHTML = "𓆣  Samo mudri prolaze pokraj Sfinge 𓆣";
  }
}

/* --- Start game (invoked by language buttons) --- */
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
    // do not call updateVisitors here (we count on load)
  });
}

/* Loading UI */
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

/* Load riddles (with fallback) */
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

/* Show daily riddle (UTC day index) */
function showDailyRiddle() {
  updateUIText();
  hasAttempted = false;

  const resEl = $("result");
  if (!isLoaded || !riddles_hr || riddles_hr.length === 0) {
    const rEl = $("riddle");
    if (rEl) rEl.innerHTML = language === "hr" ? "Nema dostupnih zagonetki." : "No riddles available.";
    console.debug('showDailyRiddle: no riddles available (isLoaded:', isLoaded, ', hr length:', riddles_hr && riddles_hr.length, ')');
    return;
  }

  const now = new Date();
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startOfYearUTC = Date.UTC(now.getUTCFullYear(), 0, 0);
  const day = Math.floor((todayUTC - startOfYearUTC) / 86400000);

  let pool = riddles_hr;
  if (language === "en" && Array.isArray(riddles_en) && riddles_en.length > 0) pool = riddles_en;

  if (!Array.isArray(pool) || pool.length === 0) {
    const rEl = $("riddle");
    if (rEl) rEl.innerHTML = language === "hr" ? "Nema dostupnih zagonetki u odabranom jeziku." : "No riddles available for selected language.";
    console.debug('showDailyRiddle: selected pool empty for language', language);
    return;
  }

  let index;
  const cfgIndex = (window.SPHINX_CONFIG && Number.isInteger(window.SPHINX_CONFIG.forceRiddleIndex)) ? window.SPHINX_CONFIG.forceRiddleIndex : null;
  if (cfgIndex !== null) {
    index = Math.abs(cfgIndex) % pool.length;
    console.debug('showDailyRiddle: using forced index', cfgIndex, '=>', index);
  } else {
    index = ((day - 1) % pool.length + pool.length) % pool.length;
    console.debug('showDailyRiddle: dayOfYear(UTC)=', day, 'pool.length=', pool.length, 'index=', index);
  }

  const questionText = (pool[index] && pool[index].question) ? pool[index].question : "";
  const answersForLang = (pool[index] && Array.isArray(pool[index].answers)) ? pool[index].answers : [];

  currentRiddle = { index, question: questionText, answers: answersForLang };

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

/* Confirm and show answer (localized) */
function confirmShowAnswer() {
  if (!currentRiddle) return;
  const msg = language === "hr"
    ? "Jeste li sigurni da želite prikazati odgovor? To će onemogućiti daljnje pokušaje."
    : "Are you sure you want to show the answer? This will disable further attempts.";
  if (window.confirm(msg)) showAnswer();
  else {
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
    if (res) { res.className = "info"; res.innerHTML = language === "hr" ? "Nema dostupnog odgovora za ovu zagonetku." : "No answer available for this riddle."; }
    const showAnswerBtn = $("showAnswerBtn");
    if (showAnswerBtn) showAnswerBtn.disabled = true;
    return;
  }

  const display = answers.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ');
  if (res) {
    res.className = "info";
    res.innerHTML = language === "hr" ? `<strong>Odgovor:</strong> ${display}` : `<strong>Answer:</strong> ${display}`;
  }

  const answerEl = $("answer");
  if (answerEl) { answerEl.value = ''; answerEl.disabled = true; }

  const checkBtn = $("checkBtn");
  if (checkBtn) checkBtn.disabled = true;

  const showAnswerBtn = $("showAnswerBtn");
  if (showAnswerBtn) { showAnswerBtn.disabled = true; showAnswerBtn.setAttribute('aria-expanded', 'true'); }
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

/* --- Visitor counter: total only (CountAPI primary, local fallback) --- */
async function updateVisitors() {
  const visitorEl = $("visitorCount");
  if (!visitorEl) return;

  let totalValue = null;

  // Try CountAPI hit for total
  try {
    const t = await countapiHit(COUNTAPI_NAMESPACE, TOTAL_KEY);
    if (typeof t === 'number') {
      totalValue = t;
      safeSetLS(LS_LAST_TOTAL, t);
      console.debug('CountAPI total hit ->', t);
    } else {
      const tv = await countapiGet(COUNTAPI_NAMESPACE, TOTAL_KEY);
      if (typeof tv === 'number') {
        totalValue = tv;
        safeSetLS(LS_LAST_TOTAL, tv);
        console.debug('CountAPI total get ->', tv);
      }
    }
  } catch (e) {
    console.debug('CountAPI total error', e && e.message);
  }

  // If CountAPI failed, fallback to localStorage and increment locally so user sees change
  if (totalValue === null) {
    console.debug('CountAPI unavailable — using local fallback/increment for total');
    const lastTotal = safeGetLSInt(LS_LAST_TOTAL) ?? 0;
    const newTotal = lastTotal + 1;
    safeSetLS(LS_LAST_TOTAL, newTotal);
    try { localStorage.setItem(LS_FALLBACK_FLAG, '1'); } catch(e){}
    totalValue = newTotal;
  }

  // Set single number (no slash)
  const totText = (typeof totalValue === 'number') ? String(totalValue) : '-';
  visitorEl.textContent = totText;
}

/* Cache-bust for sphinx image */
function bustSphinxCache() {
  const img = document.getElementById('sphinxImg') || document.querySelector('.sphinx img');
  if (!img) return;
  const base = (img.getAttribute('data-src') || img.getAttribute('src') || '').split('?')[0];
  if (!base) return;
  if (!img.getAttribute('data-src')) img.setAttribute('data-src', base);
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

/* On load: restore language pref for labels only, bust cache, and increment total visitor counter */
window.onload = function () {
  try {
    const saved = localStorage.getItem("language");
    if (saved) language = saved;
  } catch (e) { console.error("LocalStorage error:", e); }

  updateUIText();
  try { bustSphinxCache(); } catch (e) {}
  try { updateVisitors(); } catch(e) { console.debug('updateVisitors failed on load', e && e.message); }
};
