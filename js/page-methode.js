/* ============================================================
   HYDRO — page « Méthode » (js/page-methode.js)
   Les tableaux sont générés à partir des fichiers de données
   (data-traitements.js, data-captages.js) : la page ne peut donc
   pas se contredire avec le code de calcul.
   ============================================================ */

(function () {

  function el(id) { return document.getElementById(id); }

  /* 0.9725 -> "97,25 %" ; 0.2 -> "20 %" ; 0.885 -> "88,5 %". */
  function pourcent(fraction) {
    var texte = Fmt.nombre(fraction * 100, 2);
    texte = texte.replace(/,00$/, "").replace(/(,\d)0$/, "$1");
    return texte + " %";
  }

  function dateFr(iso) {
    var m = iso.split("-");
    return m[2] + "/" + m[1] + "/" + m[0];
  }

  /* Mesures réelles : une colonne par date, plus la somme. */
  function tableauMesures() {
    var html = "<thead><tr><th>Molécule</th>";
    MESURES_REELLES_PILOTE.forEach(function (m) { html += '<th class="num">' + dateFr(m.date) + "</th>"; });
    html += "</tr></thead><tbody>";

    ORDRE_MOLECULES.forEach(function (cle) {
      html += "<tr><td><strong>" + cle + "</strong></td>";
      MESURES_REELLES_PILOTE.forEach(function (m) { html += '<td class="num">' + Fmt.concentration(m.molecules[cle] || 0) + "</td>"; });
      html += "</tr>";
    });

    html += '<tr class="mis-en-avant"><td><strong>Somme 20 PFAS</strong></td>';
    MESURES_REELLES_PILOTE.forEach(function (m) {
      html += '<td class="num"><strong>' + Fmt.concentration(sommerMolecules(m.molecules)) + "</strong></td>";
    });
    el("table-mesures").innerHTML = html + "</tr></tbody>";
  }

  /* Abattements : le Bouclier est calculé par la même fonction que l'application. */
  function tableauAbattements() {
    var html = '<thead><tr><th>Molécule</th><th class="num">Charbon actif</th><th class="num">Résine</th>' +
               '<th class="num">Bouclier PFAS (calculé)</th><th class="num">Nanofiltration</th></tr></thead><tbody>';

    ORDRE_MOLECULES.forEach(function (cle) {
      // On traite 1 µg/L d'une seule molécule : ce qui reste donne l'abattement en série.
      var unite = {};
      unite[cle] = 1;
      var apresBouclier = appliquerTraitementComplet(unite, "bouclier")[cle];
      html += "<tr><td><strong>" + cle + "</strong></td>" +
              '<td class="num">' + pourcent(TRAITEMENTS.charbon.abattement[cle]) + "</td>" +
              '<td class="num">' + pourcent(TRAITEMENTS.resine.abattement[cle]) + "</td>" +
              '<td class="num">' + pourcent(1 - apresBouclier) + "</td>" +
              '<td class="num">' + pourcent(TRAITEMENTS.nanofiltration.abattement[cle]) + "</td></tr>";
    });
    el("table-abattements").innerHTML = html + "</tbody>";
  }

  function tableauCouts() {
    var html = '<thead><tr><th>Traitement</th><th class="num">Coût (€/m³ traité)</th>' +
               '<th class="num">Mise en service</th><th>Déchets</th></tr></thead><tbody>';
    ORDRE_TRAITEMENTS.forEach(function (id) {
      var t = TRAITEMENTS[id];
      html += "<tr><td><strong>" + Commun.nomTraitement(id) + "</strong>" +
              (t.recommande ? ' <span class="badge badge-action">Recommandé</span>' : "") + "</td>" +
              '<td class="num">' + Fmt.nombre(t.coutParM3, 3) + "</td>" +
              '<td class="num">' + t.delaiMois + " mois</td>" +
              "<td>" + t.dechet + "</td></tr>";
    });
    el("table-couts").innerHTML = html + "</tbody>";
  }

  function tableauNiveaux() {
    var conditions = {
      non_detecte: "Somme des 20 PFAS = 0",
      sous_limites: "0 < somme ≤ 0,10 µg/L et somme des 4 PFAS ≤ 0,02 µg/L",
      depasse_hcsp: "Somme des 4 PFAS > 0,02 µg/L et somme des 20 PFAS ≤ 0,10 µg/L",
      non_conforme: "Somme des 20 PFAS > 0,10 µg/L",
      critique: "Somme des 20 PFAS > 0,20 µg/L"
    };
    var html = "<thead><tr><th>Niveau</th><th>Condition</th></tr></thead><tbody>";
    ["non_detecte", "sous_limites", "depasse_hcsp", "non_conforme", "critique"].forEach(function (cle) {
      html += "<tr><td>" + Commun.badgeNiveau(cle, false) + "</td><td>" + conditions[cle] + "</td></tr>";
    });
    el("table-niveaux").innerHTML = html + "</tbody>";
  }

  function demarrer() {
    Commun.monter("methode");
    el("ctx-distribue").textContent = Fmt.entier(VOLUME_MIS_EN_DISTRIBUTION);
    el("ctx-vendu").textContent = Fmt.entier(VOLUME_VENDU);
    el("regle-elixir").textContent = Fmt.entier(CAPACITE_ELIXIR_M3_PAR_AN);
    tableauMesures();
    tableauAbattements();
    tableauCouts();
    tableauNiveaux();
  }

  document.addEventListener("DOMContentLoaded", demarrer);
})();
