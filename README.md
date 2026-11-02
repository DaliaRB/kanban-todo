# My Kanban Board

Tableau Kanban en HTML, CSS et JavaScript : créer une tâche, la faire passer de To do à In Progress puis Done, la modifier, la supprimer, chercher, filtrer par priorité et trier. Les tâches sont enregistrées dans le localStorage du navigateur.

## Lancer le projet

```bash
python3 -m http.server 8000
```

Puis ouvrir http://localhost:8000.

## Lancer les tests

```bash
npm install
npm test
```

Les tests (Jest + jsdom) vérifient l'ajout, les messages d'erreur, la faille XSS, le localStorage (y compris après un rechargement), les changements de statut, la modification, la suppression, la recherche, le filtre et les tris. Deux tests de qualité vérifient l'accessibilité (jest-axe) et que le HTML est valide (html-validate).

---

## English

A Kanban to-do board built with HTML, CSS and plain JavaScript. You can create a task, move it from To do to In Progress and Done, edit it, delete it, search, filter by priority and sort. Tasks are saved in the browser's localStorage.

**Run it:** `python3 -m http.server 8000`, then open http://localhost:8000.

**Run the tests:** `npm install`, then `npm test` (22 tests with Jest and jsdom, plus an accessibility audit with jest-axe and HTML validation with html-validate).

**Security:**
- user text is displayed with `textContent`, never `innerHTML`, to prevent XSS;
- a Content Security Policy only allows the site's own files (`script-src 'self'`);
- form inputs are checked (minimum and maximum length, no past date) and limited with `maxlength`;
- the font is self-hosted, so no visitor data is sent to Google Fonts (GDPR).
