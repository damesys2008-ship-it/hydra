# Hydra — pilotage PFAS pour Orléans Métropole

Hydra est un prototype d'outil de pilotage de la qualité de l'eau potable : 30 captages, une nappe contaminée aux PFAS, une seule interface pour voir, comparer et décider.
On y suit la conformité du territoire, on compare quatre traitements (charbon actif, résine, Bouclier PFAS, nanofiltration) et on simule leur déploiement.
Prototype de hackathon. Concentrations PFAS : mesures officielles du contrôle sanitaire ARS (API Hub'Eau, octobre 2026). Captage pilote : Les Hautes Bordes (Semoy), fermé depuis décembre 2023. Volumes et certaines positions : approximatifs.

## Lancement

- **Le plus simple** : double-cliquer sur `index.html`.
- Ou avec un petit serveur local : `python3 -m http.server 8000`, puis ouvrir <http://localhost:8000>.

Aucune installation, aucun framework, aucun build. Deux bibliothèques sont chargées depuis `cdnjs.cloudflare.com` : Leaflet (carte) et Chart.js (graphiques). Sans réseau, la carte est remplacée par un message (la liste des captages reste disponible sur la page Carte) et les graphiques par des tableaux de valeurs ; le simulateur et les indicateurs fonctionnent toujours.

## Les cinq pages

| Page | Rôle |
|---|---|
| `index.html` | **Vue d'ensemble** : 5 indicateurs du territoire, mini-carte, captages à traiter en priorité, recommandation. |
| `carte.html` | **Carte des captages** : carte en grand, filtres (niveau, commune, usines), liste synchronisée, résumé du captage choisi. |
| `captage.html?id=11` | **Fiche d'un captage** : mesures officielles et source, composition par molécule, tableau des 10 molécules. Sans `id` valide : captage pilote. |
| `simulateur.html?id=8` | **Simulateur** : traitement, part du débit, 6 résultats, comparatif des 4 traitements, déploiements actifs. |
| `methode.html` | **Méthode et hypothèses** : contexte réglementaire, mesures réelles, règles de calcul, hypothèses. |

Les déploiements simulés sont conservés d'une page à l'autre dans `sessionStorage` (repli : `window.name`, puis mémoire). Le bouton « Réinitialiser la démo » du pied de page remet tout à zéro.

## Structure des fichiers

```
hydra/
├── index.html  carte.html  captage.html  simulateur.html  methode.html
├── README.md
├── css/
│   ├── base.css             variables, reset, typographie, composants communs
│   └── pages.css            mises en page propres à chaque page
└── js/
    ├── data-traitements.js  seuils et 4 traitements : abattements, coûts, délais, déchets
    ├── calculs.js           fonctions pures : abattement, mélange, coûts, conformité, KPI
    ├── data-captages.js     les 30 captages, leurs mesures officielles et leurs sources
    ├── etat.js              état partagé entre les pages (Etat.lire / ecrire / reinitialiser)
    ├── commun.js            en-tête, navigation, pied de page, icônes SVG, utilitaires
    ├── carte.js             module carte Leaflet réutilisable (mini-carte et carte complète)
    ├── graphiques.js        graphiques Chart.js de la fiche captage
    ├── simulateur.js        contrôles et tuiles de résultat du simulateur
    └── page-accueil.js  page-carte.js  page-captage.js  page-simulateur.js  page-methode.js
```

Chaque page ne charge que les scripts dont elle a besoin. Ordre de chargement : données, puis calculs, puis état et éléments communs, puis modules d'affichage, puis script de la page. Les fichiers d'affichage ne font aucun calcul : tout passe par `calculs.js`.

## Règles de calcul

- **Abattement** : sortie = concentration × (1 − abattement), molécule par molécule. Le Bouclier PFAS applique le charbon puis la résine **en série**.
- **Débit partiel** : avec une part traitée `p`, sortie = `p` × traitée + (1 − `p`) × brute.
- **Somme des 20 PFAS** : somme des 10 molécules quantifiées (les 10 autres sont sous le seuil de détection).
- **Conformité** : somme ≤ 0,10 µg/L (limite légale depuis le 01/01/2026). Recommandation HCSP : somme de 4 PFAS (PFOA + PFOS + PFNA + PFHxS) ≤ 0,02 µg/L.
- **Niveaux** : non détecté, sous les limites, au-dessus de la recommandation HCSP, non conforme (> 0,10), critique (> 0,20). Chaque niveau a une couleur **et** une icône et un libellé.
- **Coût annuel** = volume annuel × part traitée × coût au m³ (0,175 / 0,30 / 0,32 / 0,45 €/m³).
- **Impact facture** = somme des coûts ÷ 16 000 000 m³ vendus ; × 120 m³ pour un foyer.
- **Déchets** : pour la nanofiltration, le concentrat vaut 15 % du volume traité ; une unité Elixir en détruit 1 200 m³ par an. Le nombre d'unités nécessaires montre que la destruction sur site est irréaliste.

Valeurs de contrôle sur le captage pilote (Hautes Bordes, Semoy) à 100 % du débit : brut 0,3273 µg/L · charbon seul 0,1048 (non conforme de justesse) · résine 0,0321 · nanofiltration 0,0244 · Bouclier PFAS 0,0172 µg/L.

## Charte graphique

- **Thème** : l'eau. Fond blanc légèrement bleuté, bleus pour la structure et les graphiques, `#007F88` réservé aux boutons et aux éléments interactifs.
- **Couleurs d'alerte** (vert, jaune, ambre, orange, rouge) : uniquement pour les niveaux de qualité, jamais pour décorer. La couleur n'est jamais seule : chaque niveau a une icône et un libellé.
- **Typographie** : IBM Plex Sans pour le texte (16 px), IBM Plex Mono pour les chiffres (tabulaires).
- **Espacement** : échelle de 4 px (`--esp-4` à `--esp-64`). Rayons : 12 px (cartes), 8 px (boutons, champs), pastille pour les badges.
- **Icônes** : SVG inline au trait fin, dessinées pour le projet, sans librairie.
- Toutes les couleurs sont des variables CSS dans `:root` (`css/base.css`). Les animations respectent `prefers-reduced-motion`.

## CO₂ évité

La page `co2.html` (entrée « CO₂ évité » du menu) chiffre l'intérêt de détruire sur place les déchets concentrés en PFAS avec l'unité mobile Elixir (ArianeGroup), plutôt que de les envoyer par camion vers un incinérateur éloigné.

**Fichiers** : `co2.html`, `js/data-co2.js` (hypothèses), `js/calculs-co2.js` (fonctions pures), `js/page-co2.js` (affichage). Les calculs du reste de l'application ne sont pas concernés.

**Calcul** (pour un même volume de déchets concentrés, en tCO₂e par an) :

```
classique_transport   = volume × densité × distance × facteurCamion / 1000
classique_destruction = volume × incinerationTCO2ParM3
elixir_electricite    = volume × elixirKwhParM3 × facteurElec / 1000
elixir_deplacements   = déplacements × kmParDéplacement × facteurConvoi / 1000

évité par an = (transport + destruction classiques) − (électricité + déplacements Elixir)   (jamais négatif)
évité cumulé = évité par an × durée entre dateDebut et dateFin
```

Avec les hypothèses par défaut : filière classique 354,0 tCO₂e/an (transport 54,0 + incinération 300,0), filière Elixir 15,3 tCO₂e/an (électricité 15,0 + déplacements 0,3), soit **338,7 tCO₂e évitées par an** (environ 95,7 %), environ 1 609 tCO₂e cumulées du 01/01/2027 au 30/09/2031, 48 camions-citernes évités par an et environ 1,69 million de km en voiture équivalents.

**Hypothèses** : toutes dans `HYPOTHESES_CO2` (`js/data-co2.js`), chacune avec sa valeur, son unité, son libellé et sa justification. Trois sont réglables en direct dans la page (volume, distance de l'incinérateur, émissions de l'incinération) ; les valeurs choisies sont gardées dans `sessionStorage` sous la clé `hydra-co2`, séparée de l'état du reste de l'application.

**Lecture prudente** : seul le trajet aller du camion est compté (le retour à vide ne l'est pas), donc le CO₂ évité est volontairement sous-estimé. Ce sont des ordres de grandeur, à confirmer avec la Base Empreinte de l'ADEME et les exploitants, et le calcul ne porte que sur la destruction des déchets concentrés, pas sur l'ensemble du traitement de l'eau.

## Notes

- **Fond de carte** : OpenStreetMap, éclairci et désaturé en CSS pour un rendu proche de « Positron ». Les tuiles CARTO exigent désormais une clé d'API.
- Taux d'abattement et coûts : ordres de grandeur indicatifs. Positions des captages : approximatives.

En production, les données viendraient des systèmes de supervision des exploitants et des analyses de l'ARS (API publique Hub'Eau).
