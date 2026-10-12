/* ============================================================
   HYDRA — page « Carte » (js/page-carte.js)
   Carte complète + filtres (niveau, commune, usines) + liste
   synchronisée + petit panneau de résumé du captage choisi.
   ============================================================ */

(function () {

  var NIVEAUX = ["non_detecte", "sous_limites", "depasse_hcsp", "non_conforme", "critique"];

  var carte = null;
  var territoire = null;
  var idSelection = null;
  var niveauxActifs = {};   // cleNiveau -> booléen
  var communeFiltre = "";

  function el(id) { return document.getElementById(id); }

  /* ---------- Filtres ---------- */

  function construireFiltres() {
    var html = "";
    NIVEAUX.forEach(function (cle) {
      niveauxActifs[cle] = true;
      html += '<label class="case"><input type="checkbox" data-niveau="' + cle + '" checked>' +
              Commun.badgeNiveau(cle, false) + '</label>';
    });
    el("filtres-niveaux").innerHTML = html;

    var inputs = el("filtres-niveaux").querySelectorAll("input");
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].addEventListener("change", function () {
        niveauxActifs[this.getAttribute("data-niveau")] = this.checked;
        appliquerFiltres(false);
      });
    }

    // Liste des communes, triée
    var communes = [];
    CAPTAGES.forEach(function (c) { if (communes.indexOf(c.commune) === -1) { communes.push(c.commune); } });
    communes.sort(function (a, b) { return a.localeCompare(b, "fr"); });
    var select = el("filtre-commune");
    communes.forEach(function (nom) {
      var o = document.createElement("option");
      o.value = nom; o.textContent = nom;
      select.appendChild(o);
    });
    select.addEventListener("change", function () {
      communeFiltre = this.value;
      appliquerFiltres(true);
    });

    el("chk-usines").addEventListener("change", function () { carte.afficherUsines(this.checked); });
  }

  /* Captages qui passent les filtres actuels. */
  function captagesVisibles() {
    return CAPTAGES.filter(function (c) {
      var res = territoire.parCaptage[c.id];
      return niveauxActifs[res.niveauSortie] && (communeFiltre === "" || c.commune === communeFiltre);
    });
  }

  function appliquerFiltres(recadrer) {
    var visibles = captagesVisibles();
    var ids = visibles.map(function (c) { return c.id; });
    carte.filtrer(ids);
    if (recadrer && communeFiltre !== "") { carte.ajuster(ids); }
    if (idSelection !== null && ids.indexOf(idSelection) === -1) { fermerResume(); }
    afficherListe(visibles);
  }

  /* ---------- Liste ---------- */

  function afficherListe(visibles) {
    var tries = visibles.slice().sort(function (a, b) {
      return territoire.parCaptage[b.id].sommeSortie - territoire.parCaptage[a.id].sommeSortie;
    });

    el("nb-captages").textContent = tries.length + " sur " + CAPTAGES.length;

    if (tries.length === 0) {
      el("liste-captages").innerHTML = '<li class="message-vide">Aucun captage ne correspond à ces filtres.</li>';
      return;
    }

    el("liste-captages").innerHTML = tries.map(function (c) {
      var res = territoire.parCaptage[c.id];
      var n = NIVEAUX_QUALITE[res.niveauSortie];
      return '<li><button type="button" class="ligne-captage" data-id="' + c.id + '"' +
        ' aria-pressed="' + (c.id === idSelection ? "true" : "false") + '">' +
        '<span class="ligne-icone niveau-' + res.niveauSortie + '">' + Commun.icone(res.niveauSortie) + '</span>' +
        '<span class="ligne-texte"><strong>' + c.nom + '</strong>' +
        '<span class="petit texte-doux">' + c.commune + ' · ' + n.court + '</span></span>' +
        '<span class="num ligne-valeur">' + Fmt.concentration(res.sommeSortie) + '</span>' +
        '</button></li>';
    }).join("");

    var boutons = el("liste-captages").querySelectorAll(".ligne-captage");
    for (var i = 0; i < boutons.length; i++) {
      boutons[i].addEventListener("click", function () {
        var id = parseInt(this.getAttribute("data-id"), 10);
        selectionner(id, true);
      });
    }
  }

  /* ---------- Sélection et résumé ---------- */

  function selectionner(id, centrer) {
    idSelection = id;
    Etat.definirDernierCaptage(id);
    Commun.majLiensNavigation();
    carte.maj(territoire, id);
    if (centrer) { carte.centrerSur(id); }

    // Met à jour la surbrillance dans la liste
    var boutons = el("liste-captages").querySelectorAll(".ligne-captage");
    for (var i = 0; i < boutons.length; i++) {
      var actif = parseInt(boutons[i].getAttribute("data-id"), 10) === id;
      boutons[i].setAttribute("aria-pressed", actif ? "true" : "false");
      if (actif && !centrer) { boutons[i].scrollIntoView({ block: "nearest" }); }
    }
    afficherResume(id);
  }

  function afficherResume(id) {
    var c = Commun.captageParId(id);
    var res = territoire.parCaptage[id];
    el("resume-nom").textContent = c.nom;
    el("resume-commune").textContent = c.commune + " · " + c.usine;
    el("resume-badge").innerHTML = Commun.badgeNiveau(res.niveauSortie, false);
    el("resume-conc").textContent = Fmt.concentration(res.sommeSortie) + " µg/L";
    el("resume-pop").textContent = Fmt.entier(c.populationDesservie) + " hab.";
    el("resume-vol").textContent = Fmt.entier(c.volumeAnnuel) + " m³";
    el("resume-fiche").href = "captage.html?id=" + id;
    el("resume-simuler").href = "simulateur.html?id=" + id;
    el("resume").hidden = false;
  }

  function fermerResume() {
    idSelection = null;
    el("resume").hidden = true;
    carte.maj(territoire, null);
    var boutons = el("liste-captages").querySelectorAll(".ligne-captage");
    for (var i = 0; i < boutons.length; i++) { boutons[i].setAttribute("aria-pressed", "false"); }
  }

  /* ---------- Démarrage ---------- */

  function demarrer() {
    Commun.monter("carte");
    territoire = Commun.territoire();

    carte = Carte.creer("carte", { interactif: true, surClic: function (id) { selectionner(id, false); } });
    construireFiltres();
    carte.maj(territoire, null);
    appliquerFiltres(false);

    el("resume-fermer").addEventListener("click", fermerResume);

    var idUrl = Commun.idDepuisUrl();
    if (idUrl !== null) { selectionner(idUrl, true); }

    setTimeout(function () { carte.redimensionner(); carte.maj(territoire, idSelection); }, 150);
  }

  document.addEventListener("DOMContentLoaded", demarrer);
})();
