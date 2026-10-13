/* ============================================================
   HYDRO — logique de calcul (js/calculs.js)
   ------------------------------------------------------------
   Toutes les fonctions de ce fichier sont PURES : elles ne
   touchent jamais au DOM, ne lisent et n'écrivent aucune
   variable globale d'état. Elles prennent des données en entrée
   et renvoient un résultat, pour pouvoir être testées et
   réutilisées sans risque d'effet de bord.
   ============================================================ */

/* ----------------------------------------------------------------
   Agrégats de base sur un jeu de 10 concentrations par molécule
   ---------------------------------------------------------------- */

/* Additionne les 10 molécules quantifiées -> somme des 20 PFAS
   (les 10 autres molécules réglementées sont sous le seuil de
   détection et comptent donc pour 0, comme indiqué par le sujet). */
function sommerMolecules(molecules) {
  var total = 0;
  for (var i = 0; i < ORDRE_MOLECULES.length; i++) {
    var cle = ORDRE_MOLECULES[i];
    total += molecules[cle] || 0;
  }
  return total;
}

/* Additionne les 4 molécules de la recommandation HCSP.
   PFNA n'est pas quantifié dans le sujet : il vaut toujours 0 ici. */
function sommer4PFASHcsp(molecules) {
  var total = 0;
  for (var i = 0; i < MOLECULES_HCSP.length; i++) {
    var cle = MOLECULES_HCSP[i];
    total += molecules[cle] || 0; // PFNA renverra 0 (clé absente)
  }
  return total;
}

/* Détermine le niveau de qualité (une des clés de NIVEAUX_QUALITE)
   à partir de la somme des 20 PFAS et de la somme des 4 PFAS HCSP,
   en appliquant exactement les règles du tableau du brief. */
function determinerNiveau(sommeTotale, somme4Pfas) {
  if (sommeTotale <= 0) return "non_detecte";
  if (sommeTotale > SEUIL_CRITIQUE) return "critique";
  if (sommeTotale > LIMITE_LEGALE_PFAS) return "non_conforme";
  if (somme4Pfas > RECOMMANDATION_HCSP) return "depasse_hcsp";
  return "sous_limites";
}

/* Un captage est conforme si la somme des 20 PFAS ne dépasse pas
   la limite légale (0,10 µg/L). */
function estConforme(sommeTotale) {
  return sommeTotale <= LIMITE_LEGALE_PFAS;
}

/* ----------------------------------------------------------------
   Application d'un traitement à un jeu de molécules
   ---------------------------------------------------------------- */

/* Applique un tableau d'abattement (une fraction par molécule) à un
   jeu de concentrations. Renvoie un NOUVEL objet : la sortie d'une
   molécule vaut concentration_entrée × (1 − abattement). */
function appliquerAbattement(molecules, tableauAbattement) {
  var resultat = {};
  for (var i = 0; i < ORDRE_MOLECULES.length; i++) {
    var cle = ORDRE_MOLECULES[i];
    var entree = molecules[cle] || 0;
    var taux = tableauAbattement[cle] || 0;
    resultat[cle] = entree * (1 - taux);
  }
  return resultat;
}

/* Applique un traitement complet (identifié par son id dans
   TRAITEMENTS) à un jeu de molécules brutes. Pour le Bouclier PFAS,
   les étapes sont appliquées EN SÉRIE : la sortie du charbon actif
   devient l'entrée de la résine. Pour les autres traitements, un
   seul passage suffit. */
function appliquerTraitementComplet(moleculesBrutes, idTraitement) {
  var traitement = TRAITEMENTS[idTraitement];
  if (!traitement) return moleculesBrutes;

  if (traitement.etapes) {
    // Cas du Bouclier PFAS : charbon puis résine, en série
    var resultat = moleculesBrutes;
    for (var i = 0; i < traitement.etapes.length; i++) {
      var etape = TRAITEMENTS[traitement.etapes[i]];
      resultat = appliquerAbattement(resultat, etape.abattement);
    }
    return resultat;
  }

  return appliquerAbattement(moleculesBrutes, traitement.abattement);
}

/* Mélange l'eau traitée et l'eau brute selon la part traitée (0 à 1) :
   sortie = part × traitée + (1 − part) × brute, molécule par molécule.
   C'est ce qui permet de simuler un traitement partiel du débit. */
function melangerDebit(moleculesBrutes, moleculesTraitees, partTraitee) {
  var resultat = {};
  for (var i = 0; i < ORDRE_MOLECULES.length; i++) {
    var cle = ORDRE_MOLECULES[i];
    var brute = moleculesBrutes[cle] || 0;
    var traitee = moleculesTraitees[cle] || 0;
    resultat[cle] = partTraitee * traitee + (1 - partTraitee) * brute;
  }
  return resultat;
}

/* Calcule le jeu de molécules en sortie de captage, en tenant compte
   du traitement choisi et de la part du débit réellement traitée.
   Si idTraitement est null ou partTraitee est 0, renvoie les
   molécules brutes inchangées. */
function calculerMoleculesSortie(moleculesBrutes, idTraitement, partTraitee) {
  if (!idTraitement || !partTraitee || partTraitee <= 0) {
    return moleculesBrutes;
  }
  var moleculesTraitees = appliquerTraitementComplet(moleculesBrutes, idTraitement);
  return melangerDebit(moleculesBrutes, moleculesTraitees, partTraitee);
}

/* Pourcentage d'abattement global obtenu entre la somme brute et la
   somme en sortie (0 à 100). Renvoie 0 si la somme brute est nulle. */
function calculerPourcentageAbattement(sommeBrute, sommeSortie) {
  if (sommeBrute <= 0) return 0;
  var abattement = (1 - sommeSortie / sommeBrute) * 100;
  return Math.max(0, abattement);
}

/* ----------------------------------------------------------------
   Coûts, délais et déchets d'un déploiement
   ---------------------------------------------------------------- */

/* Coût annuel d'un déploiement, en euros par an, pour un captage
   dont le volume annuel (m³) est partiellement traité. */
function calculerCoutAnnuelDeploiement(volumeAnnuelCaptage, idTraitement, partTraitee) {
  var traitement = TRAITEMENTS[idTraitement];
  if (!traitement || !partTraitee) return 0;
  var volumeTraite = volumeAnnuelCaptage * partTraitee;
  return volumeTraite * traitement.coutParM3;
}

/* Délai de mise en service (en mois) d'un traitement. */
function calculerDelaiMois(idTraitement) {
  var traitement = TRAITEMENTS[idTraitement];
  return traitement ? traitement.delaiMois : 0;
}

/* Calcule les déchets générés par un déploiement et indique si une
   alerte doit être levée (cas de la nanofiltration, dont le
   concentrat est trop volumineux pour une destruction sur site par
   Elixir, dont la capacité est de 1200 m³/an et par unité). */
function calculerDechets(volumeAnnuelCaptage, idTraitement, partTraitee) {
  var traitement = TRAITEMENTS[idTraitement];
  if (!traitement || !partTraitee) {
    return { description: "Aucun déchet (pas de traitement actif)", alerte: false, message: "" };
  }

  var volumeTraite = volumeAnnuelCaptage * partTraitee;

  if (idTraitement === "nanofiltration") {
    var volumeConcentrat = volumeTraite * traitement.tauxConcentrat;
    var unitesNecessaires = Math.ceil(volumeConcentrat / CAPACITE_ELIXIR_M3_PAR_AN);
    return {
      description: traitement.dechet,
      volumeConcentratM3: volumeConcentrat,
      unitesElixirNecessaires: unitesNecessaires,
      alerte: true,
      message: "Concentrat trop volumineux pour une destruction sur site (" +
        unitesNecessaires + " unités Elixir nécessaires)."
    };
  }

  return {
    description: traitement.dechet,
    alerte: false,
    message: ""
  };
}

/* ----------------------------------------------------------------
   Impact territorial (facture, population, KPI)
   ---------------------------------------------------------------- */

/* Impact sur la facture, à partir du coût annuel total de TOUS les
   déploiements actifs sur le territoire. Renvoie l'impact en €/m³
   (rapporté au volume vendu) et en €/an pour un foyer de référence. */
function calculerImpactFacture(coutAnnuelTotalDeploiements) {
  var euroParM3 = coutAnnuelTotalDeploiements / VOLUME_VENDU;
  var euroParAnFoyer = euroParM3 * CONSOMMATION_FOYER_M3;
  return {
    euroParM3: euroParM3,
    euroParAnFoyer: euroParAnFoyer
  };
}

/* Calcule, pour un captage donné et un déploiement donné (peut être
   null = aucun traitement), le jeu complet d'indicateurs affichés
   dans les tuiles de résultats du simulateur. */
function calculerResultatSimulation(captage, idTraitement, partTraitee) {
  var sommeBrute = sommerMolecules(captage.molecules);
  var moleculesSortie = calculerMoleculesSortie(captage.molecules, idTraitement, partTraitee);
  var sommeSortie = sommerMolecules(moleculesSortie);
  var somme4PfasSortie = sommer4PFASHcsp(moleculesSortie);

  return {
    moleculesSortie: moleculesSortie,
    sommeBrute: sommeBrute,
    sommeSortie: sommeSortie,
    niveauSortie: determinerNiveau(sommeSortie, somme4PfasSortie),
    conforme: estConforme(sommeSortie),
    pourcentageAbattement: calculerPourcentageAbattement(sommeBrute, sommeSortie),
    coutAnnuel: calculerCoutAnnuelDeploiement(captage.volumeAnnuel, idTraitement, partTraitee),
    delaiMois: calculerDelaiMois(idTraitement),
    dechets: calculerDechets(captage.volumeAnnuel, idTraitement, partTraitee)
  };
}

/* ----------------------------------------------------------------
   Vue d'ensemble du territoire (alimente le bandeau KPI et la carte)
   ---------------------------------------------------------------- */

/* Calcule l'état de TOUT le territoire pour un jeu de déploiements.
   - captages : le tableau CAPTAGES
   - configs  : objet { idCaptage: { traitement: "bouclier", part: 0.5 } }
                (un captage absent de l'objet n'est pas traité)
   Renvoie les résultats par captage et les 5 indicateurs globaux. */
function calculerEtatTerritoire(captages, configs) {
  var parCaptage = {};
  var nbConformes = 0;
  var populationExposee = 0;
  var coutTotal = 0;
  var maxSomme = -1;
  var maxCaptage = null;

  for (var i = 0; i < captages.length; i++) {
    var c = captages[i];
    var cfg = configs[c.id];
    var traitement = cfg ? cfg.traitement : null;
    var part = cfg ? cfg.part : 0;

    var res = calculerResultatSimulation(c, traitement, part);
    res.traite = !!(cfg && part > 0);
    parCaptage[c.id] = res;

    if (res.conforme) { nbConformes++; } else { populationExposee += c.populationDesservie; }
    coutTotal += res.coutAnnuel;
    if (res.sommeSortie > maxSomme) { maxSomme = res.sommeSortie; maxCaptage = c; }
  }

  return {
    parCaptage: parCaptage,
    nbCaptages: captages.length,
    nbConformes: nbConformes,
    populationExposee: populationExposee,
    maxSomme: Math.max(0, maxSomme),
    maxCaptage: maxCaptage,
    niveauMax: parCaptage[maxCaptage.id].niveauSortie,
    coutTotal: coutTotal,
    impactFacture: calculerImpactFacture(coutTotal)
  };
}

/* ----------------------------------------------------------------
   Préparation des données des graphiques (sans dessiner quoi que
   ce soit : c'est graphiques.js qui s'en charge)
   ---------------------------------------------------------------- */

var MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin",
                   "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/* Ajoute n mois à une date "AAAA-MM-JJ" et renvoie "AAAA-MM-01". */
function ajouterMois(dateIso, n) {
  var morceaux = dateIso.split("-");
  var total = parseInt(morceaux[0], 10) * 12 + (parseInt(morceaux[1], 10) - 1) + n;
  var annee = Math.floor(total / 12);
  var mois = total - annee * 12 + 1;
  return annee + "-" + (mois < 10 ? "0" : "") + mois + "-01";
}

/* "2023-11-07" -> "nov. 23" (ou "7 nov. 23" si avecJour est vrai). */
function formaterDateCourte(dateIso, avecJour) {
  var m = dateIso.split("-");
  var texte = MOIS_COURTS[parseInt(m[1], 10) - 1] + " " + m[0].slice(2);
  return avecJour ? parseInt(m[2], 10) + " " + texte : texte;
}

/* Construit la série du graphique d'évolution :
   - l'historique de 24 points du captage ;
   - si un traitement est simulé : les mois à venir jusqu'à la mise en
     service (+ 2 mois), avec une courbe "après traitement" qui démarre
     à la date de mise en service.
   Les tableaux brut / apres / reels ont tous la même longueur que
   labels ; une valeur null signifie "pas de point". */
function construireSerieEvolution(captage, idTraitement, partTraitee, sommeSortie) {
  var histo = captage.historique;
  var n = histo.length;
  var traite = !!(idTraitement && partTraitee > 0);
  var delai = traite ? calculerDelaiMois(idTraitement) : 0;
  var nbFutur = traite ? delai + 2 : 0;
  var derniereDate = histo[n - 1].date;
  // Les mesures d'un captage fermé peuvent dater de 2024 : la projection
  // part au plus tôt de la date de référence de la démo (data-captages.js).
  if (typeof DATE_REFERENCE !== "undefined" && DATE_REFERENCE > derniereDate) { derniereDate = DATE_REFERENCE; }

  var serie = {
    labels: [], brut: [], apres: [], reels: [],
    nbHistorique: n,
    indexMiseEnService: traite ? n - 1 + delai : -1,
    moisMiseEnService: traite ? formaterDateCourte(ajouterMois(derniereDate, delai), false) : ""
  };

  for (var i = 0; i < n; i++) {
    serie.labels.push(formaterDateCourte(histo[i].date, histo[i].reel));
    serie.brut.push(histo[i].somme);
    serie.apres.push(null);
    serie.reels.push(histo[i].reel ? histo[i].somme : null);
  }

  var derniereValeur = histo[n - 1].somme;
  for (var k = 1; k <= nbFutur; k++) {
    serie.labels.push(formaterDateCourte(ajouterMois(derniereDate, k), false));
    serie.brut.push(derniereValeur);          // projection sans traitement
    serie.apres.push(null);
    serie.reels.push(null);
  }

  if (traite) {
    // La courbe "après traitement" part du dernier point mesuré,
    // puis chute à la mise en service et reste à la valeur de sortie.
    serie.apres[serie.indexMiseEnService - 1] = derniereValeur;
    for (var j = serie.indexMiseEnService; j < serie.apres.length; j++) {
      serie.apres[j] = sommeSortie;
    }
  }
  return serie;
}

/* Molécules affichées individuellement dans le graphique de composition ;
   toutes les autres sont regroupées dans la barre "Autres". */
var MOLECULES_COMPOSITION = ["PFHxS", "PFOA", "PFHxA", "PFPeA", "PFOS"];

/* Compare avant / après traitement pour les 5 molécules principales
   + une barre "Autres". Renvoie { labels, avant, apres }. */
function calculerComposition(moleculesBrutes, moleculesSortie) {
  var res = { labels: [], avant: [], apres: [] };
  var autresAvant = 0;
  var autresApres = 0;

  for (var i = 0; i < ORDRE_MOLECULES.length; i++) {
    var cle = ORDRE_MOLECULES[i];
    if (MOLECULES_COMPOSITION.indexOf(cle) === -1) {
      autresAvant += moleculesBrutes[cle] || 0;
      autresApres += moleculesSortie[cle] || 0;
    }
  }
  for (var j = 0; j < MOLECULES_COMPOSITION.length; j++) {
    var m = MOLECULES_COMPOSITION[j];
    res.labels.push(m);
    res.avant.push(moleculesBrutes[m] || 0);
    res.apres.push(moleculesSortie[m] || 0);
  }
  res.labels.push("Autres");
  res.avant.push(autresAvant);
  res.apres.push(autresApres);
  return res;
}

/* ----------------------------------------------------------------
   Formatage des nombres à la française (fonctions pures, sans DOM)
   ---------------------------------------------------------------- */
var Fmt = {
  /* 1234.5 -> "1 234,5" (nbDecimales chiffres après la virgule) */
  nombre: function (valeur, nbDecimales) {
    return valeur.toLocaleString("fr-FR", {
      minimumFractionDigits: nbDecimales,
      maximumFractionDigits: nbDecimales
    });
  },
  /* Concentration en µg/L : toujours 4 décimales, comme dans le sujet */
  concentration: function (valeur) { return Fmt.nombre(valeur, 4); },
  /* Nombre entier avec séparateur de milliers */
  entier: function (valeur) { return Fmt.nombre(Math.round(valeur), 0); },
  /* Euros : en M€ au-delà de 100 000 €, sinon en euros entiers */
  euros: function (valeur) {
    if (valeur >= 100000) { return Fmt.nombre(valeur / 1000000, 2) + " M€"; }
    return Fmt.entier(valeur) + " €";
  }
};
