/* ============================================================
   O-PURE — page « Simulateur » (js/page-simulateur.js)
   Orchestre le simulateur :
     - le « brouillon » (traitement + part en cours de réglage) vit
       dans cette page ;
     - les déploiements, eux, sont enregistrés dans Etat pour être
       retrouvés sur les autres pages.
   ============================================================ */

(function () {

  var captage = null;
  var brouillon = { traitement: "bouclier", part: 0 };

  function el(id) { return document.getElementById(id); }

  /* ---------- Message d'information (zone « status ») ---------- */

  function annoncer(texte) {
    var m = el("message-sim");
    m.innerHTML = Commun.icone("info") + "<span>" + texte + "</span>";
    m.hidden = false;
  }

  /* ---------- Chargement d'un captage ---------- */

  function chargerCaptage(id) {
    captage = Commun.captageParId(id);
    Etat.definirDernierCaptage(id);
    el("choix-captage").value = String(id);

    var dep = Etat.lire().deploiements[id];
    if (dep) {
      brouillon = { traitement: dep.traitement, part: dep.part };
    } else {
      // On garde le dernier traitement regardé, mais à 0 % : rien n'est simulé.
      brouillon = { traitement: brouillon.traitement, part: 0 };
    }

    try { window.history.replaceState(null, "", "simulateur.html?id=" + id); } catch (e) { /* ignoré */ }
    Commun.majLiensNavigation();
    el("message-sim").hidden = true;
    rafraichir();
  }

  /* ---------- Affichage ---------- */

  function rafraichir() {
    var deploiements = Etat.lire().deploiements;
    var res = calculerResultatSimulation(captage, brouillon.traitement, brouillon.part);

    var aTraiter = 0;
    Commun.captagesNonConformesBruts().forEach(function (c) {
      var d = deploiements[c.id];
      if (!d || d.traitement !== "bouclier" || d.part < 1) { aTraiter++; }
    });

    el("sim-cible").textContent = captage.nom;
    document.title = "Simulateur — " + captage.nom + " — O-Pure";

    Simulateur.maj({
      captage: captage,
      res: res,
      brouillon: brouillon,
      deploye: deploiements[captage.id],
      nbATraiter: aTraiter
    });

    afficherComparatif();
    afficherDeploiements();
  }

  /* Tableau comparatif : les 4 traitements à 100 % du débit. */
  function afficherComparatif() {
    var lignes = ORDRE_TRAITEMENTS.map(function (id) {
      return { id: id, res: calculerResultatSimulation(captage, id, 1) };
    });

    // Meilleure option : conforme, sans alerte déchets, concentration de sortie la plus basse.
    var meilleur = null;
    lignes.forEach(function (l) {
      if (l.res.conforme && !l.res.dechets.alerte) {
        if (meilleur === null || l.res.sommeSortie < meilleur.res.sommeSortie) { meilleur = l; }
      }
    });

    var brute = sommerMolecules(captage.molecules);
    el("comparatif-note").textContent =
      "Pour " + captage.nom + " (" + Fmt.concentration(brute) + " µg/L sans traitement), à 100 % du débit. " +
      "Option mise en avant : conforme, sans alerte déchets, concentration de sortie la plus basse.";

    var html = "<thead><tr><th>Traitement</th>" +
      '<th class="num">Concentration en sortie (µg/L)</th><th>Conformité</th>' +
      '<th class="num">Coût annuel</th><th class="num">Délai</th><th>Déchets</th>' +
      '<th><span class="sr-only">Action</span></th></tr></thead><tbody>';

    lignes.forEach(function (l) {
      var t = TRAITEMENTS[l.id];
      var estMeilleur = meilleur !== null && meilleur.id === l.id;
      var dechets = l.res.dechets.alerte
        ? '<span class="texte-alerte">' + Commun.icone("depasse_hcsp", "icone-petite") +
          "Concentrat : " + Fmt.entier(l.res.dechets.unitesElixirNecessaires) + " unités Elixir nécessaires</span>"
        : t.dechet;

      html += '<tr class="' + (estMeilleur ? "mis-en-avant" : "") + '">' +
        "<td><strong>" + Commun.nomTraitement(l.id) + "</strong>" +
        (estMeilleur ? '<br><span class="badge badge-action">Meilleure option</span>' : "") + "</td>" +
        '<td class="num">' + Fmt.concentration(l.res.sommeSortie) + "</td>" +
        "<td>" + Commun.badgeConformite(l.res) + "</td>" +
        '<td class="num">' + Fmt.euros(l.res.coutAnnuel) + "</td>" +
        '<td class="num">' + l.res.delaiMois + " mois</td>" +
        "<td>" + dechets + "</td>" +
        '<td class="actions"><button type="button" class="bouton bouton-secondaire bouton-petit" data-traitement="' + l.id + '">Simuler</button></td>' +
        "</tr>";
    });
    el("table-comparatif").innerHTML = html + "</tbody>";

    var boutons = el("table-comparatif").querySelectorAll("button[data-traitement]");
    for (var i = 0; i < boutons.length; i++) {
      boutons[i].addEventListener("click", function () {
        brouillon.traitement = this.getAttribute("data-traitement");
        brouillon.part = 1;
        rafraichir();
        el("titre-resultats").scrollIntoView({ behavior: Commun.reduireMouvement ? "auto" : "smooth", block: "start" });
      });
    }
  }

  /* Récapitulatif des déploiements actifs (avec retrait individuel). */
  function afficherDeploiements() {
    var t = Commun.territoire();
    var ids = Object.keys(Etat.lire().deploiements).map(function (k) { return parseInt(k, 10); });
    var zone = el("liste-deploiements");

    el("deploiements-resume").textContent = ids.length === 0
      ? "Aucun traitement déployé pour le moment."
      : ids.length + " captage" + (ids.length > 1 ? "s" : "") + " traité" + (ids.length > 1 ? "s" : "") +
        " · " + t.nbConformes + " / " + t.nbCaptages + " captages conformes · coût annuel " +
        Fmt.euros(t.coutTotal) + " · " + Fmt.nombre(t.impactFacture.euroParM3, 4) + " €/m³ (" +
        Fmt.nombre(t.impactFacture.euroParAnFoyer, 2) + " € par an pour un foyer de 120 m³)";

    if (ids.length === 0) {
      zone.innerHTML = '<p class="message-vide">Déployez un traitement sur un captage pour le voir apparaître ici.</p>';
      return;
    }

    ids.sort(function (a, b) { return t.parCaptage[b].sommeBrute - t.parCaptage[a].sommeBrute; });
    var deploiements = Etat.lire().deploiements;

    var html = '<div class="tableau-conteneur"><table class="tableau"><thead><tr>' +
      "<th>Captage</th><th>Traitement</th>" +
      '<th class="num">Part du débit</th><th class="num">Avant (µg/L)</th><th class="num">Après (µg/L)</th>' +
      '<th>Conformité</th><th class="num">Coût annuel</th><th><span class="sr-only">Action</span></th>' +
      "</tr></thead><tbody>";

    ids.forEach(function (id, i) {
      var c = Commun.captageParId(id);
      var res = t.parCaptage[id];
      var d = deploiements[id];
      html += '<tr class="ligne-deploiement" style="animation-delay:' + (i * 60) + 'ms">' +
        "<td><strong>" + c.nom + '</strong><br><span class="texte-doux petit">' + c.commune + "</span></td>" +
        "<td>" + Commun.nomTraitement(d.traitement) + "</td>" +
        '<td class="num">' + Math.round(d.part * 100) + " %</td>" +
        '<td class="num">' + Fmt.concentration(res.sommeBrute) + "</td>" +
        '<td class="num">' + Fmt.concentration(res.sommeSortie) + "</td>" +
        "<td>" + Commun.badgeConformite(res) + "</td>" +
        '<td class="num">' + Fmt.euros(res.coutAnnuel) + "</td>" +
        '<td class="actions">' +
          '<a class="bouton bouton-secondaire bouton-petit" href="simulateur.html?id=' + id + '">Ouvrir</a>' +
          '<button type="button" class="bouton bouton-secondaire bouton-petit" data-retirer="' + id + '">Retirer</button>' +
        "</td></tr>";
    });
    zone.innerHTML = html + "</tbody></table></div>";

    var boutons = zone.querySelectorAll("button[data-retirer]");
    for (var i2 = 0; i2 < boutons.length; i2++) {
      boutons[i2].addEventListener("click", function () {
        var id = parseInt(this.getAttribute("data-retirer"), 10);
        Etat.retirerDeploiement(id);
        if (id === captage.id) { brouillon.part = 0; }
        annoncer("Traitement retiré du captage " + Commun.captageParId(id).nom + ".");
        rafraichir();
      });
    }
  }

  /* ---------- Actions ---------- */

  var actions = {

    surTraitement: function (id) {
      brouillon.traitement = id;
      // Si rien n'était traité, on passe à 100 % pour voir tout de suite l'effet.
      if (brouillon.part === 0) { brouillon.part = 1; }
      rafraichir();
    },

    surPart: function (pourcentage) {
      brouillon.part = pourcentage / 100;
      rafraichir();
    },

    surDeployer: function () {
      if (brouillon.part <= 0) { return; }
      Etat.definirDeploiement(captage.id, brouillon.traitement, brouillon.part);
      annoncer(Commun.nomTraitement(brouillon.traitement) + " déployé sur " + captage.nom + " (" +
               Math.round(brouillon.part * 100) + " % du débit). Les indicateurs du territoire sont mis à jour.");
      rafraichir();
    },

    surRetirer: function () {
      Etat.retirerDeploiement(captage.id);
      brouillon.part = 0;
      annoncer("Traitement retiré du captage " + captage.nom + ".");
      rafraichir();
    },

    /* Bouclier PFAS à 100 % sur chaque captage dont la concentration brute dépasse la limite. */
    surTous: function () {
      var cibles = Commun.captagesNonConformesBruts();
      cibles.forEach(function (c) { Etat.definirDeploiement(c.id, "bouclier", 1); });
      if (cibles.some(function (c) { return c.id === captage.id; })) {
        brouillon = { traitement: "bouclier", part: 1 };
      }
      var t = Commun.territoire();
      annoncer("Bouclier PFAS appliqué à " + cibles.length + " captages non conformes. " +
               t.nbConformes + " / " + t.nbCaptages + " captages conformes.");
      rafraichir();
    }
  };

  /* ---------- Démarrage ---------- */

  function demarrer() {
    Commun.monter("simulateur");

    var select = el("choix-captage");
    CAPTAGES.slice().sort(function (a, b) { return a.nom.localeCompare(b.nom, "fr"); }).forEach(function (c) {
      var o = document.createElement("option");
      o.value = String(c.id);
      o.textContent = c.nom + " (" + c.commune + ")";
      select.appendChild(o);
    });
    select.addEventListener("change", function () { chargerCaptage(parseInt(this.value, 10)); });

    Simulateur.init(actions);

    var id = Commun.idDepuisUrl();
    if (id === null) { id = Etat.lire().dernierCaptage; }
    if (!Commun.captageParId(id)) { id = ID_CAPTAGE_PILOTE; }
    chargerCaptage(id);
  }

  document.addEventListener("DOMContentLoaded", demarrer);
})();
