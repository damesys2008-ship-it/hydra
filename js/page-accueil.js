/* ============================================================
   HYDRA — page « Vue d'ensemble » (js/page-accueil.js)
   Lit les déploiements enregistrés (Etat), calcule le territoire
   (calculs.js) et remplit les KPI, la mini-carte et la liste des
   captages à traiter en priorité.
   ============================================================ */

(function () {

  var miniCarte = null;

  function el(id) { return document.getElementById(id); }

  /* ---------- KPI ---------- */

  function afficherKpis(t) {
    var n = NIVEAUX_QUALITE[t.niveauMax];

    Commun.animerValeur(el("kpi-conformes-val"), t.nbConformes, Fmt.entier, el("kpi-conformes"));
    el("kpi-conformes-total").textContent = "/ " + t.nbCaptages;
    var nonConf = t.nbCaptages - t.nbConformes;
    el("kpi-conformes-detail").textContent = nonConf === 0
      ? "Tous les captages sont sous la limite"
      : nonConf + " captage" + (nonConf > 1 ? "s" : "") + " au-dessus de la limite";

    Commun.animerValeur(el("kpi-population-val"), t.populationExposee, Fmt.entier, el("kpi-population"));

    Commun.animerValeur(el("kpi-max-val"), t.maxSomme, Fmt.concentration, el("kpi-max"));
    el("kpi-max-detail").innerHTML = Commun.badgeNiveau(t.niveauMax, true) +
      ' <span class="kpi-captage">' + t.maxCaptage.nom + '</span>';

    var enMillions = t.coutTotal >= 100000;
    el("kpi-invest-unite").textContent = enMillions ? "M€/an" : "€/an";
    Commun.animerValeur(el("kpi-invest-val"), t.coutTotal, function (v) {
      return enMillions ? Fmt.nombre(v / 1000000, 2) : Fmt.entier(v);
    }, el("kpi-invest"));
    var nbTraites = Object.keys(Etat.lire().deploiements).length;
    el("kpi-invest-detail").textContent = nbTraites === 0
      ? "Aucun traitement simulé"
      : nbTraites + " captage" + (nbTraites > 1 ? "s" : "") + " traité" + (nbTraites > 1 ? "s" : "");

    Commun.animerValeur(el("kpi-facture-val"), t.impactFacture.euroParM3,
      function (v) { return Fmt.nombre(v, 4); }, el("kpi-facture"));
    Commun.animerValeur(el("kpi-facture-foyer"), t.impactFacture.euroParAnFoyer,
      function (v) { return Fmt.nombre(v, 2); });
  }

  /* ---------- Légende des niveaux ---------- */

  function afficherLegende() {
    var cles = ["non_detecte", "sous_limites", "depasse_hcsp", "non_conforme", "critique"];
    el("legende-niveaux").innerHTML = cles.map(function (cle) {
      return "<li>" + Commun.badgeNiveau(cle, false) + "</li>";
    }).join("");
  }

  /* ---------- Liste des captages prioritaires ---------- */

  function afficherPriorites(t) {
    var liste = CAPTAGES.filter(function (c) { return !t.parCaptage[c.id].conforme; })
      .sort(function (a, b) { return t.parCaptage[b.id].sommeSortie - t.parCaptage[a.id].sommeSortie; });

    var zone = el("liste-priorite");
    if (liste.length === 0) {
      zone.innerHTML = '<p class="message-vide">Tous les captages sont conformes avec les déploiements simulés.</p>';
      return;
    }

    var html = '<div class="tableau-conteneur"><table class="tableau">' +
      '<thead><tr><th>Captage</th><th>Niveau</th><th class="num">Concentration (µg/L)</th>' +
      '<th class="num">Population desservie</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>';
    liste.forEach(function (c) {
      var res = t.parCaptage[c.id];
      html += '<tr>' +
        '<td><strong>' + c.nom + '</strong><br><span class="texte-doux petit">' + c.commune + '</span></td>' +
        '<td>' + Commun.badgeNiveau(res.niveauSortie, false) + '</td>' +
        '<td class="num">' + Fmt.concentration(res.sommeSortie) + '</td>' +
        '<td class="num">' + Fmt.entier(c.populationDesservie) + '</td>' +
        '<td class="actions">' +
          '<a class="bouton bouton-secondaire bouton-petit" href="captage.html?id=' + c.id + '">Voir la fiche</a>' +
          '<a class="bouton bouton-petit" href="simulateur.html?id=' + c.id + '">Simuler un traitement</a>' +
        '</td></tr>';
    });
    zone.innerHTML = html + '</tbody></table></div>';
  }

  /* ---------- Encart recommandation ---------- */

  function afficherRecommandation() {
    var pilote = Commun.captageParId(ID_CAPTAGE_PILOTE);
    var res = calculerResultatSimulation(pilote, "bouclier", 1);
    el("reco-chiffre").innerHTML =
      'Sur le captage pilote (' + pilote.nom + '), à 100 % du débit : <span class="num">' +
      Fmt.concentration(res.sommeBrute) + '</span> à <span class="num">' + Fmt.concentration(res.sommeSortie) +
      '</span> µg/L, pour <span class="num">' + Fmt.nombre(TRAITEMENTS.bouclier.coutParM3, 2) + '</span> €/m³ traité.';
    el("lien-simulateur").href = "simulateur.html?id=" + Etat.lire().dernierCaptage;
  }

  /* ---------- Démarrage ---------- */

  function demarrer() {
    Commun.monter("accueil");
    afficherLegende();
    miniCarte = Carte.creer("mini-carte", { interactif: false, zoom: 11 });

    var t = Commun.territoire();
    afficherKpis(t);
    miniCarte.maj(t);
    afficherPriorites(t);
    afficherRecommandation();

    setTimeout(miniCarte.redimensionner, 100);
  }

  document.addEventListener("DOMContentLoaded", demarrer);
})();
