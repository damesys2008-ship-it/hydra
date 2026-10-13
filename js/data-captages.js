/* ============================================================
   HYDRA — données des captages (js/data-captages.js)
   ------------------------------------------------------------
   DONNÉES RÉELLES — mise à jour du 13/10/2026.
   Toutes les concentrations (somme des 20 PFAS, en µg/L) viennent :
   - du contrôle sanitaire de l'ARS sur l'eau distribuée
     (API publique Hub'Eau « qualité de l'eau potable ») ;
   - du contrôle sanitaire de l'ARS sur l'eau brute des forages
     (API Hub'Eau « qualité des nappes », base ADES) ;
   - du sujet du hackathon pour les 4 mesures détaillées du captage
     des Hautes Bordes (Semoy).

   Règles appliquées (voir la page « Méthode ») :
   1. Un captage prend les mesures de SON forage quand elles sont
      publiées (eau brute). Sinon, il prend celles du RÉSEAU de
      distribution de sa commune (eau du robinet), ce qui est indiqué
      dans le champ « source ».
   2. « < 0,001 » (sous le seuil de détection) est compté comme 0.
      « < 0,028 », « < 0,029 », « < 0,100 » ne sont pas exploitables
      (seuil du laboratoire trop haut) : ces résultats sont ignorés.
   3. Deux prélèvements le même jour sur le même réseau : on garde la
      valeur la plus haute (lecture prudente).
   4. La valeur actuelle d'un captage est sa dernière mesure retenue.

   Ce qui reste NON réel : les volumes annuels (et donc la population
   desservie), les communes et positions des captages non confirmés,
   et la répartition par molécule des captages autres que le pilote
   (seule la somme des 20 PFAS est publiée pour eux).
   ============================================================ */

/* --------------------------------------------------------------
   1) Les 4 mesures détaillées du captage des Hautes Bordes (Semoy),
      fournies par le sujet (Veolia nov.-déc. 2023, ARS janv. 2024).
      Le captage a été fermé le 26/12/2023 (Orléans Métropole,
      communiqué du 16/04/2024).
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

/* Molécules actuelles du pilote : dernière mesure (29/01/2024). Somme : 0,3273 µg/L. */
var MOLECULES_PILOTE = MESURES_REELLES_PILOTE[3].molecules;

/* Date de référence de la démo : les projections (mise en service
   d'un traitement) partent d'ici, et non de la dernière mesure, qui
   peut dater de 2024 pour un captage fermé. */
var DATE_REFERENCE = "2026-10-01";

/* --------------------------------------------------------------
   2) Séries de mesures réelles (somme des 20 PFAS, µg/L).
      Une série par réseau de distribution ou par forage.
   -------------------------------------------------------------- */
var SERIES = {
  // Eau distribuée — réseau ORLEANS (045000474), prélèvements « purs Orléans »
  // (sans le réseau de Semoy). Alimente aussi St-Jean-le-Blanc et St-Pryvé.
  orleans: {
    source: "Eau distribuée — réseau Orléans (045000474), contrôle ARS",
    type: "distribuee",
    mesures: [
      ["2024-06-19", 0], ["2024-09-26", 0.008], ["2024-11-20", 0.001], ["2025-01-09", 0],
      ["2025-02-10", 0], ["2025-05-21", 0.005], ["2025-07-07", 0.029], ["2026-01-14", 0]
    ]
  },
  // Eau distribuée — point mixte réseaux SEMOY (045000538) + Orléans
  semoy: {
    source: "Eau distribuée — réseau Semoy (045000538), point mixte avec Orléans, contrôle ARS",
    type: "distribuee",
    mesures: [
      ["2024-06-27", 0.0527], ["2024-09-17", 0.051], ["2024-11-20", 0.061],
      ["2025-06-24", 0.057], ["2026-03-26", 0.062]
    ]
  },
  saintDenis: {
    source: "Eau distribuée — Saint-Denis-en-Val (réseaux d'Orléans), contrôle ARS",
    type: "distribuee",
    mesures: [["2026-03-27", 0]]
  },
  fleury: {
    source: "Eau distribuée — réseau Fleury-les-Aubrais (045000424), contrôle ARS",
    type: "distribuee",
    mesures: [["2024-11-12", 0], ["2025-01-13", 0.014], ["2025-05-26", 0.009], ["2025-07-02", 0.003], ["2026-03-30", 0.011]]
  },
  saran: {
    source: "Eau distribuée — réseau Saran (045003570), contrôle ARS",
    type: "distribuee",
    mesures: [["2024-07-30", 0], ["2024-09-27", 0], ["2024-11-29", 0.006], ["2025-01-27", 0], ["2026-03-10", 0.001], ["2026-06-19", 0]]
  },
  ingreMontabuzard: {
    source: "Eau distribuée — réseau Ingré Montabuzard (045000439), contrôle ARS",
    type: "distribuee",
    mesures: [["2025-02-25", 0.066], ["2026-04-22", 0.063]]
  },
  ormes: {
    source: "Eau distribuée — réseaux Ormes (045000479) et Ormes Z.I. (045003944), contrôle ARS",
    type: "distribuee",
    mesures: [["2024-07-17", 0], ["2024-09-18", 0.003], ["2024-11-12", 0.001], ["2025-02-14", 0.008], ["2026-05-26", 0]]
  },
  laChapelle: {
    source: "Eau distribuée — réseau La Chapelle-Saint-Mesmin (045000379), contrôle ARS",
    type: "distribuee",
    mesures: [["2024-11-19", 0.016], ["2025-01-21", 0.017], ["2025-06-17", 0.014], ["2025-08-26", 0.001], ["2026-06-15", 0.003]]
  },
  olivet: {
    source: "Eau distribuée — réseau Olivet (045000473), contrôle ARS",
    type: "distribuee",
    mesures: [["2024-06-20", 0.0076], ["2024-08-19", 0.004], ["2024-10-08", 0.004], ["2025-02-10", 0.003],
              ["2025-06-02", 0.005], ["2025-12-04", 0.005], ["2026-04-10", 0.004]]
  },
  checyEchelette: {
    source: "Eau distribuée — réseau Chécy Échelette - Combleux (045000586), contrôle ARS",
    type: "distribuee",
    mesures: [["2025-02-26", 0.002], ["2026-03-04", 0.001]]
  },
  checyGrainloup: {
    source: "Eau distribuée — réseau Chécy Grainloup (045000584), contrôle ARS",
    type: "distribuee",
    mesures: [["2025-02-26", 0.007], ["2026-03-04", 0.006]]
  },
  mardieBou: {
    source: "Eau distribuée — réseau Mardié - Bou (045000600), contrôle ARS",
    type: "distribuee",
    mesures: [["2025-03-14", 0.020], ["2026-01-06", 0]]
  },
  marigny: {
    source: "Eau distribuée — réseau Marigny-les-Usages (045003909), contrôle ARS",
    type: "distribuee",
    mesures: [["2026-06-30", 0.004]]
  },
  // Eau brute des forages (ADES)
  chanteauForage: {
    source: "Eau brute — forage 03636X0874/FAEP (Chanteau), contrôle ARS",
    type: "brute",
    mesures: [["2024-07-30", 0], ["2024-09-27", 0.002], ["2024-11-29", 0]]
  },
  oiseliere5: {
    source: "Eau brute — forage 03983X0498/F5 (Saint-Cyr-en-Val), contrôle ARS",
    type: "brute",
    mesures: [["2024-09-26", 0.005], ["2024-11-20", 0]]
  },
  oiseliere6: {
    source: "Eau brute — forage 03983X0499/F6 (Saint-Cyr-en-Val), contrôle ARS",
    type: "brute",
    mesures: [["2024-09-26", 0], ["2024-11-20", 0]]
  }
};

/* --------------------------------------------------------------
   3) Répartition par molécule pour les captages sans détail publié :
      on reprend le profil mesuré aux Hautes Bordes (seul profil réel
      disponible). C'est une ESTIMATION, signalée sur la fiche.
   -------------------------------------------------------------- */
var SOMME_PILOTE_REFERENCE = (function () {
  var s = 0;
  for (var cle in MOLECULES_PILOTE) { s += MOLECULES_PILOTE[cle]; }
  return s;
})();

var PONDERATION_MOLECULES = (function () {
  var p = {};
  for (var cle in MOLECULES_PILOTE) { p[cle] = MOLECULES_PILOTE[cle] / SOMME_PILOTE_REFERENCE; }
  return p;
})();

function repartirMoleculesDepuisSomme(sommeCible) {
  var molecules = {};
  var total = 0;
  var plusGrosse = null;
  for (var i = 0; i < ORDRE_MOLECULES.length; i++) {
    var cle = ORDRE_MOLECULES[i];
    molecules[cle] = Math.round((PONDERATION_MOLECULES[cle] || 0) * sommeCible * 100000) / 100000;
    total += molecules[cle];
    if (plusGrosse === null || molecules[cle] > molecules[plusGrosse]) { plusGrosse = cle; }
  }
  // Les arrondis ne doivent pas changer la somme mesurée : l'écart est
  // reporté sur la molécule la plus abondante.
  if (plusGrosse !== null) {
    molecules[plusGrosse] = Math.round((molecules[plusGrosse] + sommeCible - total) * 100000) / 100000;
  }
  return molecules;
}

/* --------------------------------------------------------------
   4) Les 30 captages du sujet.
      - serie : clé dans SERIES (sauf pour le pilote) ;
      - confirme : commune / position vérifiées dans une source publique ;
      - ferme : captage arrêté.
      Les volumes annuels restent ceux de la version précédente
      (aucune donnée publique par captage) : total 18,6 millions de m³.
   -------------------------------------------------------------- */
var CAPTAGES_BASE = [
  // --- Nord ---
  { id: 1, nom: "Tuileries", commune: "Orléans", lat: 47.9320, lng: 1.9550, volumeAnnuel: 480000, usine: "Usine du Val", serie: "orleans" },
  { id: 2, nom: "Fontaine à Mignan", commune: "Semoy", lat: 47.9470, lng: 1.9480, volumeAnnuel: 400000, usine: "Usine du Val", serie: "semoy" },
  { id: 3, nom: "Chanteau", commune: "Chanteau", lat: 47.9647, lng: 1.9683, volumeAnnuel: 560000, usine: "Station d'Ormes", serie: "chanteauForage", confirme: true },
  { id: 4, nom: "Marigny-les-Usages", commune: "Marigny-les-Usages", lat: 47.9573, lng: 2.0164, volumeAnnuel: 320000, usine: "Station d'Ormes", serie: "marigny", confirme: true },

  // --- Nord-ouest (Ingré, Ormes, Saran) ---
  { id: 5, nom: "Les Varennes", commune: "Ormes", lat: 47.9420, lng: 1.8190, volumeAnnuel: 650000, usine: "Station d'Ormes", serie: "ormes", confirme: true },
  { id: 6, nom: "Les Plantes", commune: "Ormes", lat: 47.9400, lng: 1.8225, volumeAnnuel: 580000, usine: "Station d'Ormes", serie: "ormes", confirme: true },
  { id: 7, nom: "Les Guettes", commune: "Saran", lat: 47.9410, lng: 1.8700, volumeAnnuel: 500000, usine: "Station d'Ormes", serie: "saran" },
  { id: 8, nom: "Montabuzard", commune: "Ingré", lat: 47.9204, lng: 1.8242, volumeAnnuel: 890000, usine: "Station d'Ingré", serie: "ingreMontabuzard", confirme: true, vigilance: true },
  { id: 9, nom: "Corne de Cerf", commune: "Saran", lat: 47.9460, lng: 1.8800, volumeAnnuel: 440000, usine: "Station d'Ormes", serie: "saran" },

  // --- Centre-nord (Fleury-les-Aubrais, Semoy) ---
  { id: 10, nom: "Lignerolles", commune: "Fleury-les-Aubrais", lat: 47.9389, lng: 1.9222, volumeAnnuel: 600000, usine: "Station de La Chapelle-Saint-Mesmin", serie: "fleury" },
  { id: 11, nom: "Les Hautes Bordes", commune: "Semoy", lat: 47.9427, lng: 1.9505, volumeAnnuel: 510000, usine: "Usine du Val", pilote: true, ferme: true, confirme: true },
  { id: 12, nom: "Fosse Belaude", commune: "Fleury-les-Aubrais", lat: 47.9340, lng: 1.9150, volumeAnnuel: 410000, usine: "Station de La Chapelle-Saint-Mesmin", serie: "fleury" },
  { id: 13, nom: "Hauts-Bois", commune: "Semoy", lat: 47.9380, lng: 1.9420, volumeAnnuel: 370000, usine: "Usine du Val", serie: "semoy" },
  { id: 14, nom: "Clos des Boeufs", commune: "Semoy", lat: 47.9330, lng: 1.9480, volumeAnnuel: 450000, usine: "Usine du Val", serie: "semoy" },

  // --- Est (Chécy, Mardié) ---
  { id: 15, nom: "Echelette", commune: "Chécy", lat: 47.8858, lng: 2.0206, volumeAnnuel: 690000, usine: "Usine du Val", serie: "checyEchelette", confirme: true },
  { id: 16, nom: "Grainloup", commune: "Chécy", lat: 47.9094, lng: 1.9611, volumeAnnuel: 330000, usine: "Usine du Val", serie: "checyGrainloup", confirme: true },
  { id: 17, nom: "Latingy", commune: "Mardié", lat: 47.8814, lng: 2.0486, volumeAnnuel: 300000, usine: "Usine du Val", serie: "mardieBou" },

  // --- Ouest (La Chapelle-Saint-Mesmin) ---
  { id: 18, nom: "Gouffault", commune: "La Chapelle-Saint-Mesmin", lat: 47.9065, lng: 1.8459, volumeAnnuel: 1130000, usine: "Station de La Chapelle-Saint-Mesmin", serie: "laChapelle" },
  { id: 19, nom: "Auvernais", commune: "La Chapelle-Saint-Mesmin", lat: 47.9010, lng: 1.8400, volumeAnnuel: 860000, usine: "Station de La Chapelle-Saint-Mesmin", serie: "laChapelle" },

  // --- Centre (Orléans) ---
  { id: 20, nom: "Pouponnière", commune: "Orléans", lat: 47.9029, lng: 1.9093, volumeAnnuel: 1200000, usine: "Usine du Val", serie: "orleans" },

  // --- Forages du Val (Usine du Val, Suez) ---
  { id: 21, nom: "Theuriet", commune: "Saint-Jean-le-Blanc", lat: 47.8808, lng: 1.9239, volumeAnnuel: 680000, usine: "Usine du Val", serie: "orleans" },
  { id: 22, nom: "Bouchet", commune: "Saint-Cyr-en-Val", lat: 47.8703, lng: 1.9472, volumeAnnuel: 540000, usine: "Usine du Val", serie: "orleans" },
  { id: 23, nom: "La Jonchère", commune: "Saint-Denis-en-Val", lat: 47.8650, lng: 1.9550, volumeAnnuel: 490000, usine: "Usine du Val", serie: "saintDenis" },

  // --- Sud-ouest (Olivet, Saint-Pryvé) ---
  { id: 24, nom: "Les Epinettes", commune: "Olivet", lat: 47.8614, lng: 1.9089, volumeAnnuel: 630000, usine: "Usine du Val", serie: "olivet" },
  { id: 25, nom: "Fleur de Lys", commune: "Olivet", lat: 47.8560, lng: 1.9020, volumeAnnuel: 560000, usine: "Usine du Val", serie: "olivet" },
  { id: 26, nom: "Ardillière", commune: "Saint-Pryvé-Saint-Mesmin", lat: 47.8864, lng: 1.8569, volumeAnnuel: 500000, usine: "Usine du Val", serie: "orleans" },
  { id: 27, nom: "Le Gouffre", commune: "Saint-Pryvé-Saint-Mesmin", lat: 47.8820, lng: 1.8620, volumeAnnuel: 420000, usine: "Usine du Val", serie: "orleans" },

  // --- Forages de l'Oiselière (Saint-Cyr-en-Val, La Saussaye) ---
  { id: 28, nom: "L'Oiselière 3", commune: "Saint-Cyr-en-Val", lat: 47.8315, lng: 1.9660, volumeAnnuel: 1030000, usine: "Usine du Val", serie: "orleans", confirme: true },
  { id: 29, nom: "L'Oiselière 5", commune: "Saint-Cyr-en-Val", lat: 47.8299, lng: 1.9694, volumeAnnuel: 1070000, usine: "Usine du Val", serie: "oiseliere5", confirme: true },
  { id: 30, nom: "L'Oiselière 6", commune: "Saint-Cyr-en-Val", lat: 47.8285, lng: 1.9725, volumeAnnuel: 1010000, usine: "Usine du Val", serie: "oiseliere6", confirme: true }
];

/* --------------------------------------------------------------
   5) Construction du tableau global CAPTAGES.
   -------------------------------------------------------------- */
var POPULATION_METROPOLE = 290000;

function historiqueDepuisSerie(serie) {
  return serie.mesures.map(function (m) { return { date: m[0], somme: m[1], reel: true }; });
}

function historiquePilote() {
  return MESURES_REELLES_PILOTE.map(function (m) {
    return { date: m.date, somme: Math.round(sommerMolecules(m.molecules) * 10000) / 10000, reel: true };
  });
}

var CAPTAGES = CAPTAGES_BASE.map(function (base) {
  var captage = {
    id: base.id,
    nom: base.nom,
    commune: base.commune,
    lat: base.lat,
    lng: base.lng,
    volumeAnnuel: base.volumeAnnuel,
    usine: base.usine,
    // Un captage fermé ne dessert plus personne (Semoy est alimentée par Orléans).
    populationDesservie: base.ferme ? 0 : Math.round(base.volumeAnnuel * POPULATION_METROPOLE / VOLUME_MIS_EN_DISTRIBUTION),
    pilote: !!base.pilote,
    ferme: !!base.ferme,
    vigilance: !!base.vigilance,
    confirme: !!base.confirme
  };

  if (base.pilote) {
    captage.molecules = MOLECULES_PILOTE;
    captage.historique = historiquePilote();
    captage.source = "Eau brute — captage des Hautes Bordes, mesures Veolia (2023) et ARS (2024) fournies par le sujet";
    captage.typeMesure = "brute";
    captage.moleculesEstimees = false;
  } else {
    var serie = SERIES[base.serie];
    captage.historique = historiqueDepuisSerie(serie);
    var actuelle = captage.historique[captage.historique.length - 1].somme;
    captage.molecules = repartirMoleculesDepuisSomme(actuelle);
    captage.source = serie.source;
    captage.typeMesure = serie.type;
    captage.moleculesEstimees = true;
  }
  return captage;
});

/* Captage mis en avant par défaut : Les Hautes Bordes (Semoy), fermé. */
var ID_CAPTAGE_PILOTE = 11;
