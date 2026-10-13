/* ============================================================
   HYDRA — éléments communs à toutes les pages (js/commun.js)
   ------------------------------------------------------------
   - icônes SVG (trait fin, dessinées à la main, sans librairie) ;
   - en-tête, navigation (avec menu burger) et pied de page, injectés
     dans <div id="entete-site"> et <div id="pied-site"> ;
   - petits utilitaires : badges de niveau, compteur animé,
     recherche d'un captage, calcul du territoire.
   ============================================================ */

var Commun = (function () {

  /* ---------- Icônes : contenu SVG sur une grille de 24 x 24 ---------- */

  var CHEMIN_OCTOGONE = "M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9z";

  var ICONES = {
    goutte: '<path d="M12 2.7s6 6.1 6 10.6a6 6 0 0 1-12 0C6 8.8 12 2.7 12 2.7z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    fermer: '<path d="M6 6l12 12M18 6 6 18"/>',
    fleche: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    repere: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    reglages: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    reinit: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    usine: '<path d="M3 21V10l6 3.5V10l6 3.5V4h4v17z"/>',
    bouclier: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    baisse: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    // Un pictogramme par niveau de qualité : la couleur n'est jamais seule.
    non_detecte: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
    sous_limites: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>',
    depasse_hcsp: '<path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 17h.01"/>',
    non_conforme: '<path d="' + CHEMIN_OCTOGONE + '"/><path d="M12 7.5v5.5M12 16.5h.01"/>',
    critique: '<path d="' + CHEMIN_OCTOGONE + '"/><path d="m15 9-6 6M9 9l6 6"/>'
  };

  /* Renvoie le code HTML d'une icône. classeSup est facultatif. */
  function icone(nom, classeSup) {
    return '<svg class="icone' + (classeSup ? " " + classeSup : "") +
           '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONES[nom] || "") + '</svg>';
  }

  /* ---------- Mouvement ---------- */

  var reduireMouvement = !!(window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ---------- Badges ---------- */

  /* Badge d'un niveau de qualité : icône + libellé. */
  function badgeNiveau(cleNiveau, court) {
    var n = NIVEAUX_QUALITE[cleNiveau];
    return '<span class="badge niveau-' + cleNiveau + '">' + icone(cleNiveau, "icone-petite") +
           (court ? n.court : n.libelle) + '</span>';
  }

  /* Badge « Conforme » / « Non conforme » à partir d'un résultat de simulation. */
  function badgeConformite(res) {
    if (res.conforme) {
      return '<span class="badge niveau-non_detecte">' + icone("non_detecte", "icone-petite") + 'Conforme</span>';
    }
    return '<span class="badge niveau-' + res.niveauSortie + '">' + icone(res.niveauSortie, "icone-petite") + 'Non conforme</span>';
  }

  /* ---------- Accès aux données ---------- */

  function captageParId(id) {
    for (var i = 0; i < CAPTAGES.length; i++) {
      if (CAPTAGES[i].id === id) { return CAPTAGES[i]; }
    }
    return null;
  }

  /* Lit ?id=XX dans l'URL ; renvoie un identifiant valide ou null. */
  function idDepuisUrl() {
    try {
      var valeur = new URLSearchParams(window.location.search).get("id");
      var id = parseInt(valeur, 10);
      return captageParId(id) ? id : null;
    } catch (e) {
      return null;
    }
  }

  /* Calcule l'état du territoire avec les déploiements enregistrés. */
  function territoire() {
    return calculerEtatTerritoire(CAPTAGES, Etat.lire().deploiements);
  }

  /* Captages dont la concentration BRUTE dépasse la limite légale. */
  function captagesNonConformesBruts() {
    return CAPTAGES.filter(function (c) { return !estConforme(sommerMolecules(c.molecules)); });
  }

  /* Libellé d'un traitement avec sa part : « Bouclier PFAS à 100 % ». */
  function nomTraitement(id) {
    var noms = { charbon: "Charbon actif seul", resine: "Résine seule", bouclier: "Bouclier PFAS", nanofiltration: "Nanofiltration" };
    return noms[id] || id;
  }

  /* ---------- Compteur animé ---------- */

  /* Affiche une valeur avec un compteur qui défile et un bref repère
     visuel sur le conteneur (carte KPI ou tuile). */
  function animerValeur(element, valeur, formater, conteneur) {
    var ancienne = element._valeur;
    element._valeur = valeur;

    if (ancienne === undefined || reduireMouvement || Math.abs(ancienne - valeur) < 1e-12) {
      element.textContent = formater(valeur);
      return;
    }

    if (conteneur) {
      conteneur.classList.add("change");
      setTimeout(function () { conteneur.classList.remove("change"); }, 150);
    }

    var duree = 450;
    var debut = null;
    if (element._anim) { cancelAnimationFrame(element._anim); }
    if (element._fin) { clearTimeout(element._fin); }
    // Filet de sécurité : la valeur finale est toujours affichée.
    element._fin = setTimeout(function () {
      if (element._anim) { cancelAnimationFrame(element._anim); }
      element.textContent = formater(valeur);
    }, duree + 60);

    function pas(horodatage) {
      if (debut === null) { debut = horodatage; }
      var t = Math.min(1, (horodatage - debut) / duree);
      var doux = 1 - Math.pow(1 - t, 3);
      element.textContent = formater(ancienne + (valeur - ancienne) * doux);
      if (t < 1) { element._anim = requestAnimationFrame(pas); }
    }
    element._anim = requestAnimationFrame(pas);
  }

  /* ---------- En-tête, navigation, pied de page ---------- */

  /* Renvoie le lien d'une page « captage » ou « simulateur ». */
  function lienCaptage(page, id) { return page + ".html?id=" + id; }

  function construireEntete(pageActive) {
    var dernier = Etat.lire().dernierCaptage;
    var pages = [
      { id: "accueil",    href: "index.html",                       libelle: "Vue d'ensemble" },
      { id: "carte",      href: "carte.html",                       libelle: "Carte" },
      { id: "captage",    href: lienCaptage("captage", dernier),    libelle: "Fiche captage" },
      { id: "simulateur", href: lienCaptage("simulateur", dernier), libelle: "Simulateur" },
      { id: "methode",    href: "methode.html",                     libelle: "Méthode" },
      { id: "co2",        href: "co2.html",                         libelle: "CO₂ évité" }
    ];

    var liens = pages.map(function (p) {
      return '<a href="' + p.href + '" data-lien="' + p.id + '"' + (p.id === pageActive ? ' aria-current="page"' : '') + '>' + p.libelle + '</a>';
    }).join("");

    return '<header class="entete" id="entete">' +
      '<div class="conteneur entete-interieur">' +
        '<a class="logo" href="index.html" aria-label="Hydra, retour à la vue d\'ensemble">' +
          icone("goutte", "logo-icone") +
          '<span class="logo-texte"><span class="logo-nom">Hydra</span>' +
          '<span class="logo-sous">Pilotage PFAS<span class="logo-sep"> — </span>' +
          '<span class="logo-lieu">Orléans Métropole</span></span></span>' +
        '</a>' +
        '<button type="button" class="burger" id="burger" aria-expanded="false" aria-controls="navigation" aria-label="Ouvrir le menu">' +
          icone("menu") +
        '</button>' +
        '<nav class="nav" id="navigation" aria-label="Navigation principale">' + liens + '</nav>' +
      '</div>' +
    '</header>' +
    '<div class="bandeau-proto" role="note">Prototype de hackathon — mesures PFAS officielles (ARS, Hub\'Eau) · volumes et positions approximatifs</div>';
  }

  function construirePied() {
    return '<footer class="pied"><div class="conteneur pied-interieur">' +
      '<p><strong>Hydra</strong> — Prototype d\'hypervision réalisé lors du Hackathon Hussar Academy, Orléans, octobre 2026. ' +
      'Limite réglementaire : 0,10 µg/L (somme de 20 PFAS). Recommandation HCSP : 0,02 µg/L (somme de 4 PFAS). ' +
      'Taux d\'abattement et coûts : ordres de grandeur indicatifs.</p>' +
      '<button type="button" class="bouton bouton-secondaire bouton-petit" id="btn-reinitialiser">' +
        icone("reinit", "icone-petite") + 'Réinitialiser la démo</button>' +
    '</div></footer>';
  }

  /* Met à jour les liens « Fiche captage » et « Simulateur » avec le dernier
     captage consulté (utile quand on change de captage sans recharger). */
  function majLiensNavigation() {
    var dernier = Etat.lire().dernierCaptage;
    var liens = document.querySelectorAll("[data-lien]");
    for (var i = 0; i < liens.length; i++) {
      var page = liens[i].getAttribute("data-lien");
      if (page === "captage" || page === "simulateur") { liens[i].href = lienCaptage(page, dernier); }
    }
  }

  /* À appeler au début de chaque page : installe l'en-tête et le pied. */
  function monter(pageActive) {
    var lien = document.createElement("a");
    lien.className = "lien-evitement";
    lien.href = "#contenu";
    lien.textContent = "Aller au contenu";
    document.body.insertBefore(lien, document.body.firstChild);

    var zoneEntete = document.getElementById("entete-site");
    if (zoneEntete) { zoneEntete.innerHTML = construireEntete(pageActive); }
    var zonePied = document.getElementById("pied-site");
    if (zonePied) { zonePied.innerHTML = construirePied(); }

    var burger = document.getElementById("burger");
    var entete = document.getElementById("entete");
    if (burger) {
      burger.addEventListener("click", function () {
        var ouvert = entete.classList.toggle("nav-ouverte");
        burger.setAttribute("aria-expanded", ouvert ? "true" : "false");
        burger.setAttribute("aria-label", ouvert ? "Fermer le menu" : "Ouvrir le menu");
        burger.innerHTML = icone(ouvert ? "fermer" : "menu");
      });
    }

    var reset = document.getElementById("btn-reinitialiser");
    if (reset) {
      reset.addEventListener("click", function () {
        Etat.reinitialiser();
        window.location.href = "index.html";
      });
    }
  }

  return {
    icone: icone,
    reduireMouvement: reduireMouvement,
    badgeNiveau: badgeNiveau,
    badgeConformite: badgeConformite,
    captageParId: captageParId,
    idDepuisUrl: idDepuisUrl,
    territoire: territoire,
    captagesNonConformesBruts: captagesNonConformesBruts,
    nomTraitement: nomTraitement,
    animerValeur: animerValeur,
    majLiensNavigation: majLiensNavigation,
    monter: monter
  };
})();

/* ============================================================
   Tableaux lisibles sur téléphone
   Sur petit écran, chaque ligne d'un tableau .tableau est affichée
   comme une carte (voir « Mobile » à la fin de css/pages.css).
   Pour cela, chaque cellule reçoit l'intitulé de sa colonne dans
   un attribut data-label. Les tableaux étant générés en JS (et
   régénérés à chaque simulation), on surveille le DOM.
   ============================================================ */
(function () {
  "use strict";

  function etiqueterTableaux() {
    var tableaux = document.querySelectorAll("table.tableau");
    for (var t = 0; t < tableaux.length; t++) {
      var entetes = tableaux[t].querySelectorAll("thead th");
      if (entetes.length === 0) { continue; }
      var libelles = [];
      for (var i = 0; i < entetes.length; i++) {
        // Une colonne dont l'intitulé est réservé aux lecteurs d'écran
        // (ex. « Actions ») n'affiche pas d'étiquette visible.
        libelles.push(entetes[i].querySelector(".sr-only") ? "" : entetes[i].textContent.trim());
      }
      var lignes = tableaux[t].querySelectorAll("tbody tr");
      for (var l = 0; l < lignes.length; l++) {
        var cellules = lignes[l].children;
        for (var c = 0; c < cellules.length; c++) {
          var libelle = libelles[c] || "";
          if (cellules[c].getAttribute("data-label") !== libelle) {
            cellules[c].setAttribute("data-label", libelle);
          }
        }
      }
      tableaux[t].classList.add("tableau-cartes");
    }
  }

  /* Les intitulés en MAJUSCULES (text-transform: uppercase) transforment
     « µg/L » en « ΜG/L », qui se lit « MG/L » (milligrammes : erreur x1000).
     On isole chaque « µ » de ces intitulés dans un span qui garde la minuscule. */
  function proteger_micro() {
    var marcheur = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) { return n.nodeValue.indexOf("µ") !== -1 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP; }
    });
    var aTraiter = [];
    while (marcheur.nextNode()) {
      var parent = marcheur.currentNode.parentNode;
      if (parent && !parent.classList.contains("micro") &&
          window.getComputedStyle(parent).textTransform === "uppercase") {
        aTraiter.push(marcheur.currentNode);
      }
    }
    aTraiter.forEach(function (noeud) {
      var morceaux = noeud.nodeValue.split("µ");
      var fragment = document.createDocumentFragment();
      morceaux.forEach(function (texte, i) {
        if (i > 0) {
          var span = document.createElement("span");
          span.className = "micro";
          span.textContent = "µ";
          fragment.appendChild(span);
        }
        if (texte) { fragment.appendChild(document.createTextNode(texte)); }
      });
      noeud.parentNode.replaceChild(fragment, noeud);
    });
  }

  function toutTraiter() { etiqueterTableaux(); proteger_micro(); }

  var enAttente = false;
  function planifier() {
    if (enAttente) { return; }
    enAttente = true;
    window.requestAnimationFrame(function () { enAttente = false; toutTraiter(); });
  }

  toutTraiter();
  if ("MutationObserver" in window) {
    new MutationObserver(planifier).observe(document.body, { childList: true, subtree: true });
  }
  document.addEventListener("DOMContentLoaded", toutTraiter);
})();
