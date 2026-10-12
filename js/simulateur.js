/* ============================================================
   HYDRA — panneau de simulation (js/simulateur.js)
   ------------------------------------------------------------
   Gère les contrôles (choix du traitement, curseur, boutons) et
   l'affichage des 6 tuiles de résultat de la page Simulateur.
   Il ne modifie jamais l'état lui-même : il prévient la page par
   des « rappels » (callbacks), puis la page lui renvoie la vue à
   afficher avec maj().
   ============================================================ */

var Simulateur = (function () {

  var rappels = null;

  /* Libellé court et sous-titre de chaque bouton de traitement. */
  var DETAILS = {
    charbon: "Une barrière",
    resine: "Une barrière",
    bouclier: "Charbon puis résine",
    nanofiltration: "Membrane"
  };

  function el(id) { return document.getElementById(id); }

  /* ---------- Initialisation : construit les boutons et branche les événements ---------- */

  function init(callbacks) {
    rappels = callbacks;

    var conteneur = el("segments");
    ORDRE_TRAITEMENTS.forEach(function (id) {
      var t = TRAITEMENTS[id];
      var b = document.createElement("button");
      b.type = "button";
      b.className = "segment";
      b.setAttribute("data-id", id);
      b.setAttribute("aria-pressed", "false");

      var nom = document.createElement("span");
      nom.textContent = Commun.nomTraitement(id);
      b.appendChild(nom);

      var detail = document.createElement("span");
      detail.className = "segment-detail";
      detail.textContent = DETAILS[id];
      b.appendChild(detail);

      if (t.recommande) {
        var reco = document.createElement("span");
        reco.className = "segment-reco";
        reco.textContent = "Recommandé";
        b.appendChild(reco);
      }
      b.addEventListener("click", function () { rappels.surTraitement(id); });
      conteneur.appendChild(b);
    });

    el("curseur-part").addEventListener("input", function () {
      rappels.surPart(parseInt(this.value, 10));
    });
    el("btn-deployer").addEventListener("click", function () { rappels.surDeployer(); });
    el("btn-retirer").addEventListener("click", function () { rappels.surRetirer(); });
    el("btn-tous").addEventListener("click", function () { rappels.surTous(); });
  }

  /* ---------- Mise à jour de l'affichage ---------- */

  /* vue = {
       captage, res (résultat de simulation),
       brouillon { traitement, part },
       deploye (configuration déjà déployée, ou undefined),
       nbATraiter (captages non conformes pas encore à 100 % Bouclier)
     } */
  function maj(vue) {
    var c = vue.captage;
    var res = vue.res;
    var b = vue.brouillon;
    var partPct = Math.round(b.part * 100);
    var actif = b.part > 0;
    var identique = !!vue.deploye && vue.deploye.traitement === b.traitement && vue.deploye.part === b.part;

    // Statut de la simulation
    var statut = el("sim-statut");
    if (!actif) {
      statut.textContent = "Aucun traitement";
      statut.className = "badge badge-neutre";
    } else if (identique) {
      statut.textContent = "Déployé";
      statut.className = "badge badge-action";
    } else {
      statut.textContent = "Simulation non déployée";
      statut.className = "badge badge-neutre";
    }

    // Contrôles
    var boutons = el("segments").querySelectorAll(".segment");
    for (var i = 0; i < boutons.length; i++) {
      var sel = boutons[i].getAttribute("data-id") === b.traitement;
      boutons[i].setAttribute("aria-pressed", sel ? "true" : "false");
    }
    var curseur = el("curseur-part");
    if (parseInt(curseur.value, 10) !== partPct) { curseur.value = partPct; }
    el("curseur-valeur").textContent = partPct + " %";
    curseur.setAttribute("aria-valuetext", partPct + " pour cent du débit traité");

    el("btn-deployer").disabled = !actif || identique;
    el("btn-retirer").disabled = !vue.deploye;
    el("btn-tous").disabled = vue.nbATraiter === 0;

    // Tuile 1 : concentration en sortie
    Commun.animerValeur(el("t-conc"), res.sommeSortie, Fmt.concentration, el("tuile-conc"));
    el("t-abattement").innerHTML = actif
      ? Commun.icone("baisse", "icone-petite") + "<span>−" + Fmt.nombre(res.pourcentageAbattement, 1) +
        " % par rapport à l'eau brute (" + Fmt.concentration(res.sommeBrute) + ")</span>"
      : "<span>Aucun traitement : eau brute</span>";

    // Tuile 2 : conformité (icône + libellé, jamais la couleur seule)
    var niveau = NIVEAUX_QUALITE[res.niveauSortie];
    var cleStyle = res.conforme ? "non_detecte" : res.niveauSortie;
    var conf = el("t-conformite");
    conf.className = "tuile-conformite niveau-" + cleStyle;
    conf.innerHTML = Commun.icone(cleStyle) + "<span>" + (res.conforme ? "Conforme" : "Non conforme") + "</span>";

    var ecart = (res.sommeSortie / LIMITE_LEGALE_PFAS - 1) * 100;
    var detailConf;
    if (res.sommeSortie <= 0) {
      detailConf = "Non détecté";
    } else if (res.conforme) {
      detailConf = Fmt.nombre(-ecart, 0) + " % sous la limite de 0,10 µg/L · " + niveau.court;
    } else {
      detailConf = Fmt.nombre(ecart, 1) + " % au-dessus de la limite de 0,10 µg/L";
    }
    el("t-conformite-detail").textContent = detailConf;

    // Tuile 3 : coût annuel
    Commun.animerValeur(el("t-cout"), res.coutAnnuel, Fmt.euros, el("tuile-cout"));
    el("t-cout-detail").textContent = actif
      ? Fmt.entier(c.volumeAnnuel * b.part) + " m³ traités par an"
      : "Aucun volume traité";

    // Tuile 4 : délai de mise en service
    var derniere = c.historique[c.historique.length - 1].date;
    el("t-delai").textContent = actif ? String(res.delaiMois) : "–";
    el("t-delai-unite").textContent = actif ? " mois" : "";
    el("t-delai-detail").textContent = actif
      ? "Mise en service vers " + formaterDateCourte(ajouterMois(derniere, res.delaiMois), false)
      : "Aucun chantier";

    // Tuile 5 : déchets (alerte pour la nanofiltration)
    var d = res.dechets;
    var tuileD = el("tuile-dechets");
    tuileD.classList.toggle("tuile-alerte", d.alerte);
    if (d.alerte) {
      el("t-dechets").innerHTML = Commun.icone("depasse_hcsp") + "<span>Concentrat trop volumineux pour une destruction sur site</span>";
      el("t-dechets-detail").textContent =
        Fmt.entier(d.volumeConcentratM3) + " m³/an de concentrat, soit " + Fmt.entier(d.unitesElixirNecessaires) +
        " unités Elixir (1 200 m³/an chacune).";
    } else {
      el("t-dechets").textContent = d.description;
      el("t-dechets-detail").textContent = actif && d.description.indexOf("Elixir") >= 0
        ? "Capacité d'une unité Elixir : 1 200 m³ par an."
        : "";
    }

    // Tuile 6 : impact facture de CE déploiement, sur toute la Métropole
    var impact = calculerImpactFacture(res.coutAnnuel);
    Commun.animerValeur(el("t-facture"), impact.euroParM3, function (v) { return Fmt.nombre(v, 4); }, el("tuile-facture"));
    el("t-facture-detail").textContent = "Soit " + Fmt.nombre(impact.euroParAnFoyer, 2) + " € par an pour un foyer de 120 m³";
  }

  return { init: init, maj: maj };
})();
