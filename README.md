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

Les tests (Jest + jsdom) vérifient l'ajout, les messages d'erreur, la faille XSS, le localStorage, la recherche, le filtre et le tri.
