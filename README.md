# Veille

Site de veille en direct sur trois rubriques : IA & Tech, Politique, Religion.

Les articles viennent uniquement des flux RSS de médias identifiés (Numerama, Le Monde, The Verge, Ars Technica, TechCrunch, MIT Technology Review, franceinfo, France 24, Le Figaro, BBC, Vatican News, Aleteia, Religion News Service). Rien n'est généré ni reformulé : chaque titre renvoie vers l'article original.

## Lancer

Node 18 ou plus récent, aucune dépendance à installer.

```bash
node lib/server.js
```

Puis ouvrir http://localhost:3000. Les flux sont relus toutes les 3 minutes et la page se met à jour toute seule.

## Fichiers

- `lib/server.js` : collecte des flux RSS, API `/api/news`, flux temps réel `/api/stream`
- `public/index.html` : interface (rubriques, à la une, fil, recherche, filtre par source) et globe 3D
- `public/immersion.js` et `immersion.css` : visites aériennes guidées, chargées à la demande

## Ajouter une source

Ajouter une entrée `{ name, url }` dans l'objet `SOURCES` de `lib/server.js`.

## Visites guidées

Un clic sur la République dominicaine, dans le globe, lance une visite en vol au-dessus du pays : imagerie satellite sur relief 3D, neuf étapes commentées, lecture automatique, pause, étape suivante ou précédente, exploration libre à la souris.

Pendant que la voix explique chaque lieu, des **photos réelles au sol** (rues, plages, sentiers) défilent, avec leur auteur et leur licence, et un bouton **Dans la rue** ouvre Google Street View au bon endroit pour les lieux qui ont une rue.

**La voix** est celle du navigateur : le module choisit automatiquement la meilleure voix française disponible (les voix « Natural » d'Edge, « Google français » dans Chrome, les voix premium de macOS). Le rythme varie selon les phrases et les textes parlés sont écrits pour l'oral. Un réglage permet de changer de voix et de vitesse.

Pour ajouter un pays : une entrée dans `TOURS` de `public/immersion.js` (code ISO à deux lettres, identifiant numérique du pays dans world-atlas, étapes avec coordonnées, texte affiché, texte parlé, photos Wikimedia Commons et caméra), puis son code dans `IMMERSION_CODES` de `public/index.html`.

Sources : imagerie © Esri, Maxar, Earthstar Geographics (World Imagery) ; relief Mapzen / AWS Terrain Tiles ; photos Wikimedia Commons (licences libres, crédits affichés) ; carte MapLibre GL JS. Les fonds Esri sont utilisables gratuitement avec leur mention, dans un cadre non commercial et à trafic modéré : pour un usage commercial, prévoir une licence ou un autre fournisseur.

## Déployer sur Vercel

Le dépôt est prêt pour Vercel : l'interface est dans `public/`, les routes `/api/*` sont des fonctions (`api/`) qui relisent les flux à la demande et sont mises en cache 2 minutes par le CDN.

```bash
npx vercel --prod
```
