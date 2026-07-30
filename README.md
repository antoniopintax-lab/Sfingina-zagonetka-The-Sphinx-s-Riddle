# Sfingin izazov / The Sphinx's Riddle

Static site with daily riddles (Croatian / English) ready for GitHub Pages.

Quick publish (mobile-friendly):

1. Create repository on GitHub:
   - Name: Sfingina-zagonetka-The-Sphinx-s-Riddle
   - Public
2. In the repo, tap "Add file" → "Create new file" and create these files with their exact filenames:
   - index.html
   - config.js
   - script.js
   - style.css
   - data/riddles_hr.json
   - data/riddles_en.json
   - images/sphinx.svg (paste SVG)
   - images/sand-bg.svg (paste SVG)
   - README.md
3. Commit each file (you can paste multiple files one by one).
4. On GitHub: Settings → Pages → Deploy from branch → choose `main` and folder `/ (root)` → Save.
5. After a minute your site will be available at:
   `https://antoniopintax-lab.github.io/Sfingina-zagonetka-The-Sphinx-s-Riddle/`

Admin:
- Press Ctrl+Shift+A on the page and enter the adminSecret from config.js to open the admin panel (client-side).
- Admin options (override a date's riddle, force an index) are saved to localStorage (client-side only).

QR:
- Use the QR link below to generate the black/gold QR that points to the site.

Notes:
- The included config.js contains an adminSecret. Change it if needed.
- The visitor counter uses counterapi.dev. If you prefer a different counter, update counterApiUrl in config.js.
