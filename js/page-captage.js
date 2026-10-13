/* ============================================================
   HYDRA — page « Fiche captage » (js/page-captage.js)
   Le captage vient de l'URL (captage.html?id=8). Sans identifiant
   valide, on affiche le captage pilote. Si un traitement a été
   déployé sur ce captage, les graphiques montrent l'avant / après.
   ============================================================ */

(function () {

  function el(id) { return document.getElementById(id); }

  /* Sélecteur pour passer d'un captage à l'autre. */
  function construireSelecteur(idCourant) {
    var tries = CAPTAGES.slice().sort(function (a, b) { return a.nom.localeCompare(b.nom, "fr"); });
    var select = el("choix-captage");
    tries.forEach(function (c) {
      var o = document.createElement("option");
      o.value = String(c.id);
      o.textContent = c.nom + " (" + c.commune + ")";
      if (c.id === idCourant) { o.selected = true; }
      select.appendChild(o);
    });
    select.addEventListener("change", function () {
      window.location.href = "captage.html?id=" + this.value;
    });
  }

  /* Tableau des 10 molécules (avant, et après si déploiement). */
  function afficherTableau(captage, res, avecTraitement) {
    var html = "<thead><tr><th>Molécule</th><th>Recommandation HCSP</th>" +
               '<th class="num">Concentration (µg/L)</th>' +
               (avecTraitement ? '<th class="num">Après traitement (µg/L)</th><th class="num">Abattement</th>' : "") +
               "</tr></thead><tbody>";

    ORDRE_MOLECULES.forEach(function (cle) {
      var avant = captage.molecules[cle] || 0;
      var apres = res.moleculesSortie[cle] || 0;
      var abat = avant > 0 ? (1 - apres / avant) * 100 : 0;
      html += "<tr><td><strong>" + cle + "</strong></td>" +
              "<td>" + (MOLECULES_HCSP.indexOf(cle) !== -1 ? "Comptée dans les 4 PFAS" : "–") + "</td>" +
              '<td class="num">' + Fmt.concentration(avant) + "</td>" +
              (avecTraitement
                ? '<td class="num">' + Fmt.concentration(apres) + '</td><td class="num">' + Fmt.nombre(abat, 1) + " %</td>"
                : "") +
              "</tr>";
    });

    html += '<tr class="mis-en-avant"><td><strong>Somme des 20 PFAS</strong></td><td>Limite légale : 0,10</td>' +
            '<td class="num"><strong>' + Fmt.concentration(res.sommeBrute) + "</strong></td>" +
            (avecTraitement
              ? '<td class="num"><strong>' + Fmt.concentration(res.sommeSortie) + '</strong></td><td class="num">' +
                Fmt.nombre(res.pourcentageAbattement, 1) + " %</td>"
              : "") +
            "</tr></tbody>";
    el("table-molecules").innerHTML = html;
  }

  function demarrer() {
    Commun.monter("captage");

    var id = Commun.idDepuisUrl();
    if (id === null) { id = ID_CAPTAGE_PILOTE; }
    Etat.definirDernierCaptage(id);
    Commun.majLiensNavigation();

    var captage = Commun.captageParId(id);
    var deploiement = Etat.lire().deploiements[id];
    var idTraitement = deploiement ? deploiement.traitement : null;
    var part = deploiement ? deploiement.part : 0;
    var res = calculerResultatSimulation(captage, idTraitement, part);
    var avecTraitement = !!deploiement;

    document.title = captage.nom + " — Fiche captage — Hydra";
    el("fiche-nom").textContent = captage.nom;
    el("fiche-commune").textContent = captage.commune +
      (captage.ferme ? " · captage fermé depuis décembre 2023" : "") +
      (captage.vigilance ? " · zone de vigilance" : "");
    var src = document.getElementById("fiche-source");
    if (!src) {
      src = document.createElement("p");
      src.id = "fiche-source";
      src.className = "petit texte-doux";
      el("fiche-commune").parentNode.insertAdjacentElement("afterend", src);
    }
    src.textContent = "Source : " + captage.source + "." +
      (captage.typeMesure === "distribuee" ? " Aucune mesure publiée sur le forage lui-même : valeur du réseau qu'il alimente." : "") +
      (captage.moleculesEstimees ? " Répartition par molécule estimée (seule la somme des 20 PFAS est publiée)." : "");
    el("fiche-badge").innerHTML = Commun.badgeNiveau(res.niveauSortie, false);
    el("fiche-somme").textContent = Fmt.concentration(res.sommeSortie) + " µg/L";
    el("fiche-population").textContent = Fmt.entier(captage.populationDesservie) + " hab.";
    el("fiche-volume").textContent = Fmt.entier(captage.volumeAnnuel) + " m³";
    el("fiche-usine").textContent = captage.usine;
    el("btn-simuler").href = "simulateur.html?id=" + id;

    if (avecTraitement) {
      var bloc = el("fiche-traitement");
      bloc.hidden = false;
      bloc.innerHTML = Commun.icone("info") + "<span>Traitement simulé actif : <strong>" +
        Commun.nomTraitement(idTraitement) + "</strong> sur " + Math.round(part * 100) +
        " % du débit. Concentration brute : " + Fmt.concentration(res.sommeBrute) +
        " µg/L, après traitement : " + Fmt.concentration(res.sommeSortie) + " µg/L.</span>";
    }

    construireSelecteur(id);
    Graphiques.maj(captage, res, idTraitement, part);
    afficherTableau(captage, res, avecTraitement);
  }

  document.addEventListener("DOMContentLoaded", demarrer);
})();
