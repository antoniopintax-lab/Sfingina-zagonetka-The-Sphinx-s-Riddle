// script.js — HR/EN pools + UI switching + cache-bust for sphinx image
// + show-answer button + localized confirmation
// + robust visitor counter: CountAPI primary, localStorage fallback (always shows numbers)

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
function dailyKeyForDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `daily_${y}-${m}-${d}`;
}
// localStorage keys for fallback/last-known
const LS_LAST_TOTAL = 'sphinx_last_total';
function lsDailyKey(dateKey) { return `sphinx_last_${dateKey}`; }
const LS_FALLBACK_FLAG = 'sphinx_use_local_fallback'; // optional flag

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

/* CountAPI helpers */
async function countapiHit(namespace, key) {
  const url = `https://api.countapi.xyz/hit/${encodeURIComponent(namespace)}/${encodeURIComponent(key)}`;
  try {
    const resp = await fetchWithTimeout(url, { method: 'GET' }, 7000);
    if (!resp || !resp.ok) {
      console.debug('countapiHit non-ok', resp && resp.status, url);
      return null;
    }
    const json = await resp.json();
    if (json && typeof json.value === 'number') return json.value;
    return null;
  } catch (e) {
    console.debug('countapiHit error', e.message, url);
    return null;
  }
}

async function countapiGet(namespace, key) {
  const url = `https://api.countapi.xyz/get/${encodeURIComponent(namespace)}/${encodeURIComponent(key)}`;
  try {
    const resp = await fetchWithTimeout(url, { method: 'GET' }, 7000);
    if (!resp || !resp.ok) {
      console.debug('countapiGet non-ok', resp && resp.status, url);
      return null;
    }
    const json = await resp.json();
    if (json && typeof json.value === 'number') return json.value;
    return null;
  } catch (e) {
    console.debug('countapiGet error', e.message, url);
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
    if (visitorLabel) visitorLabel.textContent = "visitors today";
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
    if (visitorLabel) visitorLabel.textContent = "posjetitelja danas";
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
    if (respHr && respHr.ok) {*

