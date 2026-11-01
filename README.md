# Le Caracas — site web

Site de la concession **Le Caracas** (serveur RP Limitless) : véhicules neufs, occasions, rachat.

- Site statique HTML/CSS/JS, sans build. Le contenu publié est dans `docs/`.
- Catalogue : `docs/data/vehicules.json` (ajouter un véhicule = ajouter un objet + son image).
- Suivi du projet : `PROJET.md`.

Aperçu local : `cd docs && python3 -m http.server 8000` puis http://localhost:8000

En ligne : https://lecaracas.netlify.app/ (Netlify, dossier `docs/` ; copie sur https://groslardon0.github.io/caracas/), données dans Supabase (`outils/supabase.sql`, clé publique dans `docs/assets/js/config.js`).
Publier une modification : `git add -A && git commit -m "…" && git push`.
