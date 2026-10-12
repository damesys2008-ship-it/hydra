/* ============================================================
   HYDRA — données des captages (js/data-captages.js)
   ------------------------------------------------------------
   DONNÉES FICTIVES DE DÉMONSTRATION — seules les 4 mesures du
   captage pilote (Montabuzard) sont issues du sujet du hackathon.
   Positions géographiques approximatives.

   Ce fichier construit la variable globale CAPTAGES : un tableau
   de 30 objets décrivant chacun un captage (forage) d'eau potable
   d'Orléans Métropole. Pour rester lisible, les concentrations et
   les historiques des 29 captages non pilotes sont générés à la
   fin de ce fichier à partir d'un objectif de concentration totale
   (sommeCible) et du profil réel du captage pilote, plutôt que
   saisis un par un : cela évite les erreurs de recopie et garde un
   seul endroit où corriger le profil si besoin.
   ============================================================ */

/* --------------------------------------------------------------
   1) Les 4 vraies mesures du captage pilote, telles que fournies
      par le sujet (en µg/L). Ce sont les SEULES données réelles
      de toute l'application.
   -------------------------------------------------------------- */
var MESURES_REELLES_PILOTE = [
  {
    date: "2023-11-07",
    molecules: {
      PFBA: 0.0090, PFPeA: 0.0223, PFHxA: 0.0279, PFHpA: 0.0147, PFOA: 0.0370,
      PFBS: 0.0073, PFPeS: 0.0065, PFHxS: 0.0513, PFHpS: 0.0012, PFOS: 0.0300
    }
  },
  {
    date: "2023-12-05",
    molecules: {
      PFBA: 0.0078, PFPeA: 0.0193, PFHxA: 0.0230, PFHpA: 0.0130, PFOA: 0.0366,
      PFBS: 0.0061, PFPeS: 0.0053, PFHxS: 0.0319, PFHpS: 0, PFOS: 0.0166
    }
  },
  {
    date: "2024-01-11",
    molecules: {
      PFBA: 0.0119, PFPeA: 0.0350, PFHxA: 0.0408, PFHpA: 0.0231, PFOA: 0.0561,
      PFBS: 0.0090, PFPeS: 0.0096, PFHxS: 0.0691, PFHpS: 0.0019, PFOS: 0.0490
    }
  },
  {
    date: "2024-01-29",
    molecules: {
      PFBA: 0.0143, PFPeA: 0.0424, PFHxA: 0.0501, PFHpA: 0.0270, PFOA: 0.0714,
      PFBS: 0.0090, PFPeS: 0.0085, PFHxS: 0.0717, PFHpS: 0.0020, PFOS: 0.0309
    }
  }
];

/* Les molécules actuelles du captage pilote reprennent exactement
   la dernière colonne du sujet (29/01/2024). Somme attendue : 0,3273 µg/L. */
var MOLECULES_PILOTE = MESURES_REELLES_PILOTE[3].molecules;

/* --------------------------------------------------------------
   2) Pondération de chaque molécule dans la somme totale, déduite
      du profil réel du captage pilote. Elle sert à répartir une
      "somme cible" en 10 concentrations plausibles pour les
      29 autres captages, qui n'ont pas de mesure réelle.
   -------------------------------------------------------------- */
var SOMME_PILOTE_REFERENCE = (function () {
  var s = 0;
  for (var cle in MOLECULES_PILOTE) { s += MOLECULES_PILOTE[cle]; }
  return s;
})();

var PONDERATION_MOLECULES = (function () {
  var p = {};
  for (var cle in MOLECULES_PILOTE) {
    p[cle] = MOLECULES_PILOTE[cle] / SOMME_PILOTE_REFERENCE;
  }
  return p;
})();

/* Répartit une somme cible entre les 10 molécules, en suivant le
   profil (la pondération) du captage pilote. Fonction pure. */
function repartirMoleculesDepuisSomme(sommeCible) {
  var molecules = {};
  for (var i = 0; i < ORDRE_MOLECULES.length; i++) {
    var cle = ORDRE_MOLECULES[i];
    var valeur = (PONDERATION_MOLECULES[cle] || 0) * sommeCible;
    molecules[cle] = Math.round(valeur * 10000) / 10000; // arrondi à 4 décimales
  }
  return molecules;
}

/* Petit générateur pseudo-aléatoire déterministe (sans Math.random),
   pour que l'historique de chaque captage soit toujours identique
   d'un rechargement à l'autre — indispensable pour une démo fiable.
   "graine" est un nombre entier propre à chaque captage. */
function bruitDeterministe(graine, indice) {
  var x = Math.sin(graine * 12.9898 + indice * 78.233) * 43758.5453;
  return x - Math.floor(x); // valeur entre 0 et 1
}

/* Construit un historique de 24 points mensuels menant à
   sommeFinale, avec une tendance (facteur de croissance sur la
   période) et un bruit de ±10 % autour de la tendance. Les valeurs
   ne descendent jamais sous 0. */
function genererHistorique24Mois(sommeFinale, facteurCroissance, graine) {
  var points = [];
  var nombreMois = 24;
  // Date du dernier point : alignée sur la dernière mesure réelle
  // du captage pilote, pour que tous les historiques soient comparables.
  var anneeFin = 2024, moisFin = 1; // janvier 2024

  for (var i = nombreMois - 1; i >= 0; i--) {
    var moisAvantFin = i;
    var mois = moisFin - moisAvantFin;
    var annee = anneeFin;
    while (mois <= 0) { mois += 12; annee -= 1; }

    // Progression linéaire de la tendance entre le début et la fin
    var progression = (nombreMois - 1 - i) / (nombreMois - 1);
    var sommeDebut = sommeFinale / facteurCroissance;
    var valeurTendance = sommeDebut + (sommeFinale - sommeDebut) * progression;

    var bruit = (bruitDeterministe(graine, i) - 0.5) * 2 * 0.10; // ±10 %
    var valeur = Math.max(0, valeurTendance * (1 + bruit));

    var moisTexte = (mois < 10 ? "0" : "") + mois;
    points.push({
      date: annee + "-" + moisTexte + "-01",
      somme: Math.round(valeur * 10000) / 10000,
      reel: false
    });
  }

  return points;
}

/* --------------------------------------------------------------
   3) Les 30 captages. Chaque entrée porte sa "sommeCible" (la
      concentration totale actuelle visée, en µg/L) : c'est à
      partir de cette seule valeur que les 10 molécules et
      l'historique seront générés plus bas, sauf pour le captage
      pilote qui utilise ses vraies mesures.
   -------------------------------------------------------------- */
var CAPTAGES_BASE = [
  // --- Nord ---
  { id: 1, nom: "Tuileries", commune: "Orléans", lat: 47.9320, lng: 1.9550, volumeAnnuel: 480000, usine: "Usine du Val", sommeCible: 0.004, graine: 11 },
  { id: 2, nom: "Fontaine à Mignan", commune: "Semoy", lat: 47.9470, lng: 1.9480, volumeAnnuel: 400000, usine: "Usine du Val", sommeCible: 0, graine: 12 },
  { id: 3, nom: "Chanteau", commune: "Chanteau", lat: 47.9397, lng: 1.9872, volumeAnnuel: 560000, usine: "Station d'Ormes", sommeCible: 0.009, graine: 13 },
  { id: 4, nom: "Marigny-les-Usages", commune: "Marigny-les-Usages", lat: 47.9558, lng: 1.9803, volumeAnnuel: 320000, usine: "Station d'Ormes", sommeCible: 0.006, graine: 14 },

  // --- Nord-ouest (Ingré, Ormes, Saran) ---
  { id: 5, nom: "Les Varennes", commune: "Ingré", lat: 47.9235, lng: 1.8290, volumeAnnuel: 650000, usine: "Station d'Ingré", sommeCible: 0.19, graine: 15 },
  { id: 6, nom: "Les Plantes", commune: "Ormes", lat: 47.9480, lng: 1.8470, volumeAnnuel: 580000, usine: "Station d'Ormes", sommeCible: 0.015, graine: 16 },
  { id: 7, nom: "Les Guettes", commune: "Saran", lat: 47.9410, lng: 1.8700, volumeAnnuel: 500000, usine: "Station d'Ormes", sommeCible: 0.011, graine: 17 },
  { id: 8, nom: "Montabuzard", commune: "Ormes", lat: 47.9500, lng: 1.8560, volumeAnnuel: 890000, usine: "Station d'Ormes", sommeCible: 0.3273, graine: 18, pilote: true },
  { id: 9, nom: "Corne de Cerf", commune: "Saran", lat: 47.9460, lng: 1.8800, volumeAnnuel: 440000, usine: "Station d'Ormes", sommeCible: 0.025, graine: 19 },

  // --- Centre-nord (Saran, Fleury-les-Aubrais, Semoy) ---
  { id: 10, nom: "Lignerolles", commune: "Fleury-les-Aubrais", lat: 47.9389, lng: 1.9222, volumeAnnuel: 600000, usine: "Station de La Chapelle-Saint-Mesmin", sommeCible: 0.018, graine: 20 },
  { id: 11, nom: "Les Hautes Bordes", commune: "Saran", lat: 47.9470, lng: 1.8900, volumeAnnuel: 510000, usine: "Station d'Ormes", sommeCible: 0.03, graine: 21 },
  { id: 12, nom: "Fosse Belaude", commune: "Fleury-les-Aubrais", lat: 47.9340, lng: 1.9150, volumeAnnuel: 410000, usine: "Station de La Chapelle-Saint-Mesmin", sommeCible: 0.055, graine: 22 },
  { id: 13, nom: "Hauts-Bois", commune: "Semoy", lat: 47.9420, lng: 1.9400, volumeAnnuel: 370000, usine: "Usine du Val", sommeCible: 0, graine: 23 },
  { id: 14, nom: "Clos des Boeufs", commune: "Semoy", lat: 47.9330, lng: 1.9480, volumeAnnuel: 450000, usine: "Usine du Val", sommeCible: 0.013, graine: 24 },

  // --- Est (Saint-Jean-de-Braye, Chécy, Mardié) ---
  { id: 15, nom: "Echelette", commune: "Chécy", lat: 47.8858, lng: 2.0206, volumeAnnuel: 690000, usine: "Usine du Val", sommeCible: 0.23, graine: 25 },
  { id: 16, nom: "Grainloup", commune: "Saint-Jean-de-Braye", lat: 47.9094, lng: 1.9611, volumeAnnuel: 330000, usine: "Usine du Val", sommeCible: 0.005, graine: 26 },
  { id: 17, nom: "Latingy", commune: "Mardié", lat: 47.8814, lng: 2.0486, volumeAnnuel: 300000, usine: "Usine du Val", sommeCible: 0, graine: 27 },

  // --- Ouest (La Chapelle-Saint-Mesmin) ---
  { id: 18, nom: "Gouffault", commune: "La Chapelle-Saint-Mesmin", lat: 47.9065, lng: 1.8459, volumeAnnuel: 1130000, usine: "Station de La Chapelle-Saint-Mesmin", sommeCible: 0.14, graine: 28 },
  { id: 19, nom: "Auvernais", commune: "La Chapelle-Saint-Mesmin", lat: 47.9010, lng: 1.8400, volumeAnnuel: 860000, usine: "Station de La Chapelle-Saint-Mesmin", sommeCible: 0.016, graine: 29 },

  // --- Centre (Orléans) ---
  { id: 20, nom: "Pouponnière", commune: "Orléans", lat: 47.9029, lng: 1.9093, volumeAnnuel: 1200000, usine: "Usine du Val", sommeCible: 0.012, graine: 30 },

  // --- Sud de la Loire (Saint-Jean-le-Blanc, Saint-Denis-en-Val) ---
  { id: 21, nom: "Theuriet", commune: "Saint-Jean-le-Blanc", lat: 47.8808, lng: 1.9239, volumeAnnuel: 680000, usine: "Usine du Val", sommeCible: 0.07, graine: 31 },
  { id: 22, nom: "Bouchet", commune: "Saint-Denis-en-Val", lat: 47.8703, lng: 1.9472, volumeAnnuel: 540000, usine: "Usine du Val", sommeCible: 0.035, graine: 32 },
  { id: 23, nom: "La Jonchère", commune: "Saint-Denis-en-Val", lat: 47.8650, lng: 1.9550, volumeAnnuel: 490000, usine: "Usine du Val", sommeCible: 0.007, graine: 33 },

  // --- Sud-ouest (Olivet, Saint-Pryvé) ---
  { id: 24, nom: "Les Epinettes", commune: "Olivet", lat: 47.8614, lng: 1.9089, volumeAnnuel: 630000, usine: "Usine du Val", sommeCible: 0.014, graine: 34 },
  { id: 25, nom: "Fleur de Lys", commune: "Olivet", lat: 47.8560, lng: 1.9020, volumeAnnuel: 560000, usine: "Usine du Val", sommeCible: 0.009, graine: 35 },
  { id: 26, nom: "Ardillière", commune: "Saint-Pryvé-Saint-Mesmin", lat: 47.8864, lng: 1.8569, volumeAnnuel: 500000, usine: "Usine du Val", sommeCible: 0.017, graine: 36 },
  { id: 27, nom: "Le Gouffre", commune: "Saint-Pryvé-Saint-Mesmin", lat: 47.8820, lng: 1.8620, volumeAnnuel: 420000, usine: "Usine du Val", sommeCible: 0, graine: 37 },

  // --- Sud (Saint-Cyr-en-Val, La Source) ---
  { id: 28, nom: "L'Oiselière 3", commune: "Saint-Cyr-en-Val", lat: 47.8386, lng: 1.9550, volumeAnnuel: 1030000, usine: "Usine du Val", sommeCible: 0.09, graine: 38 },
  { id: 29, nom: "L'Oiselière 5", commune: "Saint-Cyr-en-Val", lat: 47.8340, lng: 1.9600, volumeAnnuel: 1070000, usine: "Usine du Val", sommeCible: 0.019, graine: 39 },
  { id: 30, nom: "L'Oiselière 6", commune: "Saint-Cyr-en-Val", lat: 47.8300, lng: 1.9500, volumeAnnuel: 1010000, usine: "Usine du Val", sommeCible: 0.003, graine: 40 }
];

/* Vérification de cohérence du total (18,6 millions de m³ attendus) :
   la somme des volumeAnnuel ci-dessus est exactement 18 600 000 m³. */

/* --------------------------------------------------------------
   4) Construction finale du tableau global CAPTAGES : on complète
      chaque entrée avec ses molécules, son historique et sa
      population desservie (proportionnelle au volume annuel, pour
      un total d'environ 290 000 habitants).
   -------------------------------------------------------------- */
var POPULATION_METROPOLE = 290000;

var CAPTAGES = CAPTAGES_BASE.map(function (base) {
  var captage = {
    id: base.id,
    nom: base.nom,
    commune: base.commune,
    lat: base.lat,
    lng: base.lng,
    volumeAnnuel: base.volumeAnnuel,
    usine: base.usine,
    populationDesservie: Math.round(base.volumeAnnuel * POPULATION_METROPOLE / VOLUME_MIS_EN_DISTRIBUTION),
    pilote: !!base.pilote
  };

  if (base.pilote) {
    // Le captage pilote utilise ses vraies données, sans génération.
    captage.molecules = MOLECULES_PILOTE;
    captage.historique = genererHistoriquePilote();
  } else {
    captage.molecules = repartirMoleculesDepuisSomme(base.sommeCible);
    // Tendance : les captages déjà pollués (>0,02) montent davantage.
    var facteurCroissance = base.sommeCible > 0.02 ? 1.6 : 1.15;
    captage.historique = base.sommeCible > 0
      ? genererHistorique24Mois(base.sommeCible, facteurCroissance, base.graine)
      : genererHistoriqueNul(base.graine);
  }

  return captage;
});

/* Historique spécifique au captage pilote : 20 points mensuels
   générés (tendance à la hausse) suivis des 4 VRAIES mesures du
   sujet, affichées comme points distincts dans le graphique. */
function genererHistoriquePilote() {
  var points = genererHistorique24Mois(0.16, 2.0, 18).slice(0, 20);
  for (var i = 0; i < MESURES_REELLES_PILOTE.length; i++) {
    var mesure = MESURES_REELLES_PILOTE[i];
    var s = sommerMolecules(mesure.molecules);
    points.push({
      date: mesure.date,
      somme: Math.round(s * 10000) / 10000,
      reel: true
    });
  }
  return points;
}

/* Historique plat à 0 pour les captages sans aucune détection :
   un très léger bruit positif est ajouté pour éviter une ligne
   parfaitement plate (plus réaliste visuellement), sans jamais
   dépasser 0,001 µg/L. */
function genererHistoriqueNul(graine) {
  var points = [];
  var anneeFin = 2024, moisFin = 1;
  for (var i = 23; i >= 0; i--) {
    var mois = moisFin - i;
    var annee = anneeFin;
    while (mois <= 0) { mois += 12; annee -= 1; }
    var moisTexte = (mois < 10 ? "0" : "") + mois;
    points.push({
      date: annee + "-" + moisTexte + "-01",
      somme: Math.round(bruitDeterministe(graine, i) * 0.001 * 10000) / 10000,
      reel: false
    });
  }
  return points;
}

/* Identifiant du captage pilote, pratique pour la sélection par défaut. */
var ID_CAPTAGE_PILOTE = 8;
