/* ============================================================
   HYDRO — calculs du CO₂ évité (js/calculs-co2.js)
   ------------------------------------------------------------
   Fonctions PURES : pas d'accès au DOM, pas d'état global. Elles
   prennent un objet de valeurs (voir valeursParDefautCO2) et
   renvoient des résultats en tonnes de CO₂ équivalent (tCO₂e).

   Choix de prudence : pour le transport, seul le trajet ALLER
   chargé est compté. Le retour à vide n'est pas compté, ce qui
   sous-estime volontairement le CO₂ évité.
   ============================================================ */

/* Extrait les valeurs par défaut de HYPOTHESES_CO2 dans un objet
   plat { nomParametre: valeur }. */
function valeursParDefautCO2() {
  var valeurs = {};
  for (var cle in HYPOTHESES_CO2) {
    valeurs[cle] = HYPOTHESES_CO2[cle].valeur;
  }
  return valeurs;
}

/* Renvoie une COPIE des valeurs de base, dans laquelle les
   paramètres de "surcharges" remplacent les valeurs par défaut. */
function fusionnerValeursCO2(base, surcharges) {
  var resultat = {};
  var cle;
  for (cle in base) { resultat[cle] = base[cle]; }
  if (surcharges) {
    for (cle in surcharges) {
      if (cle in base) { resultat[cle] = surcharges[cle]; }
    }
  }
  return resultat;
}

/* Durée en années entre deux dates "AAAA-MM-JJ", bornes incluses.
   Calcul au mois près : janvier 2027 au 30 septembre 2031 = 57 mois
   = 4,75 ans. La fraction du dernier mois est rapportée au nombre
   de jours de ce mois. */
function dureeEnAnnees(dateDebut, dateFin) {
  var d = dateDebut.split("-").map(Number);
  var f = dateFin.split("-").map(Number);
  var moisEntiers = (f[0] * 12 + f[1]) - (d[0] * 12 + d[1]);
  var joursDansMoisFin = new Date(f[0], f[1], 0).getDate();
  var fraction = (f[2] - d[2] + 1) / joursDansMoisFin;
  return Math.max(0, (moisEntiers + fraction) / 12);
}

/* Calcule toutes les émissions et équivalences.
   Renvoie un objet :
     classiqueTransport, classiqueDestruction, classiqueTotal  (tCO₂e/an)
     elixirElectricite, elixirDeplacements, elixirTotal        (tCO₂e/an)
     evitePArAn      : CO₂ évité par an (jamais négatif)       (tCO₂e/an)
     evitePourcent   : réduction par rapport à la filière classique (0 à 100)
     dureeAnnees, eviteCumule (tCO₂e)
     camionsEvitesParAn, kmVoitureEquivalents */
function calculerCO2(v) {
  var classiqueTransport = v.volumeDechetsM3An * v.densite * v.distanceIncinerateurKm *
                           v.facteurCamionKgParTkm / 1000;
  var classiqueDestruction = v.volumeDechetsM3An * v.incinerationTCO2ParM3;
  var classiqueTotal = classiqueTransport + classiqueDestruction;

  var elixirElectricite = v.volumeDechetsM3An * v.elixirKwhParM3 * v.facteurElecKgParKwh / 1000;
  var elixirDeplacements = v.deplacementsElixirAn * v.kmParDeplacement * v.facteurConvoiKgParKm / 1000;
  var elixirTotal = elixirElectricite + elixirDeplacements;

  // Jamais sous zéro : à volume nul, les déplacements donneraient un léger négatif.
  var evitePArAn = Math.max(0, classiqueTotal - elixirTotal);
  var evitePourcent = classiqueTotal > 0 ? (evitePArAn / classiqueTotal) * 100 : 0;

  var duree = dureeEnAnnees(v.dateDebut, v.dateFin);

  return {
    classiqueTransport: classiqueTransport,
    classiqueDestruction: classiqueDestruction,
    classiqueTotal: classiqueTotal,
    elixirElectricite: elixirElectricite,
    elixirDeplacements: elixirDeplacements,
    elixirTotal: elixirTotal,
    evitePArAn: evitePArAn,
    evitePourcent: evitePourcent,
    dureeAnnees: duree,
    eviteCumule: evitePArAn * duree,
    camionsEvitesParAn: v.volumeDechetsM3An / v.capaciteCiterneM3,
    kmVoitureEquivalents: evitePArAn * 1000 / v.facteurVoitureKgParKm
  };
}
