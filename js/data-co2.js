/* ============================================================
   O-PURE — hypothèses du calcul CO₂ évité (js/data-co2.js)
   ------------------------------------------------------------
   Compare, pour un même volume de déchets concentrés en PFAS :
     - la filière classique : transport par camion-citerne vers un
       incinérateur éloigné, puis incinération à plus de 1 100 °C ;
     - la filière Elixir : destruction sur site par oxydation
       hydrothermale supercritique, électrique.

   Toutes les valeurs sont des ORDRES DE GRANDEUR, modifiables ici
   (et en direct dans la page pour trois d'entre elles). Ce fichier
   ne contient que des données : les calculs sont dans
   js/calculs-co2.js.

   Chaque paramètre a : valeur, unite, libelle, source.
   ============================================================ */

var HYPOTHESES_CO2 = {

  volumeDechetsM3An: {
    valeur: 1200,
    unite: "m³/an",
    libelle: "Volume de déchets concentrés à détruire",
    source: "Capacité d'une unité Elixir (support ArianeGroup)."
  },
  densite: {
    valeur: 1,
    unite: "t/m³",
    libelle: "Densité du déchet",
    source: "Déchet aqueux : densité proche de celle de l'eau."
  },
  distanceIncinerateurKm: {
    valeur: 450,
    unite: "km",
    libelle: "Distance vers l'incinérateur (aller)",
    source: "Incinérateur de déchets dangereux, ordre de grandeur."
  },
  facteurCamionKgParTkm: {
    valeur: 0.1,
    unite: "kgCO₂e/t·km",
    libelle: "Facteur d'émission du camion-citerne",
    source: "Poids lourd, ordre de grandeur de la Base Empreinte de l'ADEME."
  },
  incinerationTCO2ParM3: {
    valeur: 0.25,
    unite: "tCO₂e/m³",
    libelle: "Émissions de l'incinération",
    source: "Combustible d'appoint pour évaporer un déchet aqueux ; ordre de grandeur, à confirmer avec un exploitant."
  },
  elixirKwhParM3: {
    valeur: 250,
    unite: "kWh/m³",
    libelle: "Consommation électrique d'Elixir",
    source: "Support ArianeGroup."
  },
  facteurElecKgParKwh: {
    valeur: 0.05,
    unite: "kgCO₂e/kWh",
    libelle: "Facteur d'émission de l'électricité",
    source: "Mix électrique français, ordre de grandeur."
  },
  deplacementsElixirAn: {
    valeur: 6,
    unite: "déplacements/an",
    libelle: "Déplacements de l'unité mobile",
    source: "Déplacements de l'unité mobile entre captages."
  },
  kmParDeplacement: {
    valeur: 50,
    unite: "km",
    libelle: "Distance par déplacement",
    source: "Distances intra-métropole."
  },
  facteurConvoiKgParKm: {
    valeur: 1,
    unite: "kgCO₂e/km",
    libelle: "Facteur d'émission du convoi",
    source: "Convoi exceptionnel, hypothèse prudente."
  },
  capaciteCiterneM3: {
    valeur: 25,
    unite: "m³",
    libelle: "Capacité d'un camion-citerne",
    source: "Camion-citerne standard."
  },
  facteurVoitureKgParKm: {
    valeur: 0.2,
    unite: "kgCO₂e/km",
    libelle: "Facteur d'émission d'une voiture",
    source: "Voiture thermique moyenne, pour l'équivalence."
  },
  dateDebut: {
    valeur: "2027-01-01",
    unite: "date",
    libelle: "Début de la période",
    source: "Mise en service hypothétique."
  },
  dateFin: {
    valeur: "2031-09-30",
    unite: "date",
    libelle: "Fin de la période",
    source: "Fin des contrats de délégation de service public actuels (sujet)."
  }
};

/* Ordre d'affichage dans le tableau des hypothèses. */
var ORDRE_HYPOTHESES_CO2 = [
  "volumeDechetsM3An", "densite", "distanceIncinerateurKm", "facteurCamionKgParTkm",
  "incinerationTCO2ParM3", "elixirKwhParM3", "facteurElecKgParKwh",
  "deplacementsElixirAn", "kmParDeplacement", "facteurConvoiKgParKm",
  "capaciteCiterneM3", "facteurVoitureKgParKm", "dateDebut", "dateFin"
];

/* Bornes des trois curseurs de la page : { min, max, pas }. */
var LIMITES_CURSEURS_CO2 = {
  volumeDechetsM3An:      { min: 0,    max: 2400, pas: 100 },
  distanceIncinerateurKm: { min: 100,  max: 800,  pas: 25 },
  incinerationTCO2ParM3:  { min: 0.10, max: 0.40, pas: 0.01 }
};
