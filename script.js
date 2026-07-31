// script.js — simple UI + HR/EN pools + show-answer with confirmation + cache-bust

let language = "hr";
let riddles_hr = [];
let riddles_en = [];
let currentRiddle = null;
let isLoaded = false;
let hasAttempted = false;

const $ = id => document.getElementById(id);

/* Update UI text for language */
function updateUIText() {
  try { document.documentElement.lang = (language === "en" ? "en" : "hr"); } catch(e){}
  const pageTitle = $("pageTitle");
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

function setLoading(loading) {
  const res = $("result");
  const checkBtn = $("checkBtn");
  const showAnswerBtn = $("showAnswerBtn");
  if (loading) {
    if (res) res.textContent = language === "hr" ? "Učitavanje zagonetki..." : "Loading riddles...";
    if (checkBtn) checkBtn.disabled = true;
    if (showAnswerBtn) { showAnswerBtn.style.display = 'none'; showAnswerBtn.disabled = true; }
  } else {
    if (res) res.textContent = "";
    if (checkBtn) checkBtn.disabled = false;
  }
}

/* Load riddles HR and EN (EN optional) */
async function loadRiddles() {
  isLoaded = false;
  const pathHr = './data/riddles_hr.json';
  const pathEn = './data/riddles_en.json';
  try {
    const [respHr, respEn] = await Promise.all([
      fetch(pathHr),
      fetch(pathEn).catch(()=>({ ok:false }))
    ]);
    if (!respHr.ok) throw new Error('Failed to load hr riddles');
    const dataHr = await respHr.json();
    let dataEn = [];
    if (respEn.ok) {
      try { dataEn = await respEn.json(); } catch(e){ dataEn = []; }
    }
    riddles_hr = (Array.isArray(dataHr) ? dataHr : []).map(r => ({
      question: r.question || "",
      answers: (Array.isArray(r.answers) ? r.answers : [r.answers || ""])
        .map(a => String(a).toLowerCase().trim()).filter(a=>a)
    }));
    riddles_en = (Array.isArray(dataEn) ? dataEn : []).map(r => ({
      question: r.question || "",
      answers: (Array.isArray(r.answers) ? r.answers : [r.answers || ""])
        .map(a => String(a).toLowerCase().trim()).filter(a=>a)
    }));
    isLoaded = true;
  } catch (err) {
    console.error(err);
    const res = $("result");
    if (res) res.textContent = language === "hr" ? "Greška pri učitavanju zagonetki." : "Error loading riddles.";
    riddles_hr = [];
    riddles_en = [];
    isLoaded = false;
  }
}

/* Show daily riddle from chosen pool */
function showDailyRiddle() {
  updateUIText();
  hasAttempted = false;
  const res = $("result");
  if (!isLoaded || riddles_hr.length === 0) {
    const rEl = $("riddle");
    if (rEl) rEl.textContent = language === "hr" ? "Nema dostupnih zagonetki." : "No riddles available.";
    return;
  }

  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 0);
  const day = Math.floor((today - start) / 86400000);
  let pool = riddles_hr;
  if (language === "en" && riddles_en.length > 0) pool = riddles_en;
  const index = ((day - 1) % pool.length + pool.length) % pool.length;

  currentRiddle = {
    question: pool[index].question || "",
    answers: pool[index].answers || []
  };

  const rEl = $("riddle");
  if (rEl) rEl.textContent = currentRiddle.question || "";

  const answerEl = $("answer");
  if (answerEl) { answerEl.value = ""; answerEl.disabled = false; answerEl.focus(); }

  const checkBtn = $("checkBtn");
  if (checkBtn) checkBtn.disabled = false;

  const showAnswerBtn = $("showAnswerBtn");
  if (showAnswerBtn) { showAnswerBtn.style.display = 'none'; showAnswerBtn.disabled = true; showAnswerBtn.setAttribute('aria-expanded','false'); }

  if (res) res.textContent = "";
}

/* Show confirmation then answer */
function confirmShowAnswer() {
  if (!currentRiddle) return;
  const msg = language === "hr"
    ? "Jeste li sigurni da želite prikazati odgovor? To će onemogućiti daljnje pokušaje."
    : "Are you sure you want to show the answer? This will disable further attempts.";
  if (window.confirm(msg)) showAnswer();
  else {
    const a = $("answer");
    if (a && !a.disabled) a.focus();
  }
}

/* Show answer */
function showAnswer() {
  if (!currentRiddle) return;
  const res = $("result");
  const answers = currentRiddle.answers || [];
  const display = answers.map(a => a.charAt(0).toUpperCase()+a.slice(1)).join(', ');
  if (res) res.innerHTML = language === "hr" ? `<strong>Odgovor:</strong> ${display}` : `<strong>Answer:</strong> ${display}`;
  const answerEl = $("answer"); if (answerEl) { answerEl.value = ''; answerEl.disabled = true; }
  const checkBtn = $("checkBtn"); if (checkBtn) checkBtn.disabled = true;
  const showAnswerBtn = $("showAnswerBtn"); if (showAnswerBtn) { showAnswerBtn.disabled = true; showAnswerBtn.setAttribute('aria-expanded','true'); }
}

/* Check answer */
function checkAnswer() {
  if (!isLoaded || !currentRiddle) return;
  hasAttempted = true;
  const answerEl = $("answer");
  const input = (answerEl && answerEl.value || "").toLowerCase().trim();
  const res = $("result");
  const checkBtn = $("checkBtn");
  const showAnswerBtn = $("showAnswerBtn");

  // reveal show-answer after first attempt
  if (showAnswerBtn) { showAnswerBtn.style.display = ''; showAnswerBtn.disabled = false; showAnswerBtn.setAttribute('aria-expanded','false'); }

  const correct = (currentRiddle.answers || []).some(a => {
    if (!a) return false;
    return input === a || input.includes(a);
  });

  if (correct) {
    if (res) res.innerHTML = language === "hr" ? `🗝️ TOČAN ODGOVOR!<br><strong>Hvala što si sudjelovao/la!</strong>` : `🗝️ CORRECT ANSWER!<br><strong>Thank you for participating!</strong>`;
    if (answerEl) answerEl.disabled = true;
    if (checkBtn) checkBtn.disabled = true;
    if (showAnswerBtn) showAnswerBtn.disabled = true;
  } else {
    if (res) res.innerHTML = language === "hr" ? `❌ Pogrešno. Pokušaj ponovno.` : `❌ Incorrect. Try again.`;
  }
}

/* Visitor counter (optional) */
function updateVisitors() {
  const counterUrl = (window.SPHINX_CONFIG && window.SPHINX_CONFIG.counterApiUrl) || "https://api.counterapi.dev/v1/sfingin-izazov/visits/up";
  fetch(counterUrl).then(r=>r.json()).then(data=>{
    const count = (data && (data.count ?? data.value ?? data)) || "-";
    const el = $("visitorCount"); if (el) el.textContent = String(count);
  }).catch(()=>{ const el = $("visitorCount"); if (el) el.textContent = "-"; });
}

/* Simple cache-bust for sphinx image */
function bustSphinxCache() {
  const img = $("sphinxImg") || document.querySelector('.sphinx img');
  if (!img) return;
  const base = (img.getAttribute('data-src') || img.getAttribute('src') || '').split('?')[0];
  if (!base) return;
  if (!img.getAttribute('data-src')) img.setAttribute('data-src', base);
  img.src = base + '?v=' + Date.now();
}

/* Enter to submit */
document.addEventListener('keydown', function(e){
  const answerEl = $("answer");
  if (e.key === 'Enter' && (document.activeElement === answerEl)) {
    e.preventDefault(); checkAnswer();
  }
});

/* On load */
window.onload = function() {
  try { const saved = localStorage.getItem('language'); if (saved) language = saved; } catch(e){}
  updateUIText();
  try { bustSphinxCache(); } catch(e){}
  try { if (localStorage.getItem('language')) startGame(language); } catch(e){}
};
