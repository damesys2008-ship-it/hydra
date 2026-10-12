/* ============================================================
   HYDRA — état partagé entre les pages (js/etat.js)
   ------------------------------------------------------------
   Chaque page HTML est un document séparé : pour que les
   déploiements simulés survivent à un changement de page, on les
   range dans sessionStorage (propre à l'onglet).

   Plan B si sessionStorage est indisponible (navigation privée,
   ouverture en double-clic sur certains navigateurs) :
     1. window.name, qui est conservé d'une page à l'autre
        dans un même onglet ;
     2. une simple variable en mémoire (valable pour la page).
   Tous les accès sont entourés de try/catch.

   Forme de l'état :
     { deploiements: { idCaptage: { traitement: "bouclier", part: 1 } },
       dernierCaptage: 8 }
   ============================================================ */

var Etat = (function () {

  var CLE = "hydra-etat";
  var PREFIXE_NOM = "hydra:";
  var enMemoire = null;

  /* État vide : aucun déploiement, captage pilote. */
  function parDefaut() {
    return { deploiements: {}, dernierCaptage: ID_CAPTAGE_PILOTE };
  }

  /* Vérifie qu'un objet lu dans le storage a la bonne forme. */
  function valider(brut) {
    var etat = parDefaut();
    if (!brut || typeof brut !== "object") { return etat; }
    if (typeof brut.dernierCaptage === "number") { etat.dernierCaptage = brut.dernierCaptage; }
    if (brut.deploiements && typeof brut.deploiements === "object") {
      for (var id in brut.deploiements) {
        var d = brut.deploiements[id];
        if (d && TRAITEMENTS[d.traitement] && typeof d.part === "number" && d.part > 0) {
          etat.deploiements[id] = { traitement: d.traitement, part: Math.min(1, d.part) };
        }
      }
    }
    return etat;
  }

  /* Lit l'état : sessionStorage, sinon window.name, sinon mémoire. */
  function lire() {
    var texte = null;
    try { texte = window.sessionStorage.getItem(CLE); } catch (e) { texte = null; }

    if (!texte) {
      try {
        if (window.name && window.name.indexOf(PREFIXE_NOM) === 0) {
          texte = window.name.slice(PREFIXE_NOM.length);
        }
      } catch (e2) { texte = null; }
    }

    if (texte) {
      try { return valider(JSON.parse(texte)); } catch (e3) { /* texte corrompu : on ignore */ }
    }
    return valider(enMemoire);
  }

  /* Écrit l'état partout où c'est possible. */
  function ecrire(etat) {
    var propre = valider(etat);
    enMemoire = propre;
    var texte = JSON.stringify(propre);
    try { window.sessionStorage.setItem(CLE, texte); } catch (e) { /* storage indisponible */ }
    try {
      // On n'écrase pas un window.name qui appartiendrait à autre chose.
      if (!window.name || window.name.indexOf(PREFIXE_NOM) === 0) {
        window.name = PREFIXE_NOM + texte;
      }
    } catch (e2) { /* ignoré */ }
  }

  /* Remet tout à zéro : aucun déploiement, captage pilote. */
  function reinitialiser() {
    ecrire(parDefaut());
  }

  /* --- Petites aides pour ne pas répéter lire() / ecrire() --- */

  function definirDeploiement(idCaptage, traitement, part) {
    var etat = lire();
    if (part > 0) { etat.deploiements[idCaptage] = { traitement: traitement, part: part }; }
    else { delete etat.deploiements[idCaptage]; }
    ecrire(etat);
  }

  function retirerDeploiement(idCaptage) {
    var etat = lire();
    delete etat.deploiements[idCaptage];
    ecrire(etat);
  }

  function definirDernierCaptage(idCaptage) {
    var etat = lire();
    etat.dernierCaptage = idCaptage;
    ecrire(etat);
  }

  return {
    lire: lire,
    ecrire: ecrire,
    reinitialiser: reinitialiser,
    definirDeploiement: definirDeploiement,
    retirerDeploiement: retirerDeploiement,
    definirDernierCaptage: definirDernierCaptage
  };
})();
