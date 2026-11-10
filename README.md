# Veille

Site de veille en direct sur trois rubriques : IA & Tech, Politique, Religion.

Les articles viennent uniquement des flux RSS de médias identifiés (Numerama, Le Monde, The Verge, Ars Technica, TechCrunch, MIT Technology Review, franceinfo, France 24, Le Figaro, BBC, Vatican News, Aleteia, Religion News Service). Rien n'est généré ni reformulé : chaque titre renvoie vers l'article original.

## Lancer

Node 18 ou plus récent, aucune dépendance à installer.

```bash
node server.js
```

Puis ouvrir http://localhost:3000. Les flux sont relus toutes les 3 minutes et la page se met à jour toute seule.

## Fichiers

- `server.js` : collecte des flux RSS, API `/api/news`, flux temps réel `/api/stream`
- `index.html` : interface (rubriques, à la une, fil, recherche, filtre par source)

## Ajouter une source

Ajouter une entrée `{ name, url }` dans l'objet `SOURCES` de `server.js`.
