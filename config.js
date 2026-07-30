// config.js - app configuration (loaded before script.js)
// Change adminSecret if you want a different password.
window.SPHINX_CONFIG = {
  adminSecret: "8f3b2d9a7e4c1f0a6b9d2e5f4c7a8b1d",
  forceRiddleIndex: null,
  overrides: {
    // Example:
    // "2026-12-25": { question: "Sretan Božić!", answers: ["poklon"] }
  },
  disableAutoNext: false,
  counterApiUrl: "https://api.counterapi.dev/v1/sfingin-izazov/visits/up"
};
