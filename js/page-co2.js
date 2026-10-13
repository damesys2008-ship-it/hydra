/* ============================================================
   HYDRO — page « CO₂ évité » (js/page-co2.js)
   Lit les hypothèses (data-co2.js), calcule avec calculs-co2.js,
   puis affiche le compteur, les équivalences et le graphique.
   Les trois curseurs sont mémorisés dans sessionStorage, sous une
   clé à part (« hydro-co2 ») : l'état des autres pages n'est
   jamais touché.
   ============================================================ */

(function () {

  var CLE_STOCKAGE = "hydro-co2";
  var CHART_OK = (typeof Chart !== "undefined");

  var valeurs = null;      // toutes les hypothèses, en valeurs utilisées
  var graphe = null;
  var enMemoire = null;    // repli si sessionStorage est indisponible

  var MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
              "août", "septembre", "octobre", "novembre", "décembre"];

  function el(id) { return document.getElementById(id); }

  /* ---------- Stockage (toujours en try/catch) ---------- */

  function lireStockage() {
    try {
      var texte = window.sessionStorage.getItem(CLE_STOCKAGE);
      if (texte) { return JSON.parse(texte); }
    } catch (e) { /* storage indisponible ou texte corrompu */ }
    return enMemoire;
  }

  function ecrireStockage(objet) {
    enMemoire = objet;
    try { window.sessionStorage.setItem(CLE_STOCKAGE, JSON.stringify(objet)); } catch (e) { /* ignoré */ }
  }

  function effacerStockage() {
    enMemoire = null;
    try { window.sessionStorage.removeItem(CLE_STOCKAGE); } catch (e) { /* ignoré */ }
  }

  /* Ne garde que les trois paramètres réglables, bornés et arrondis au pas du curseur. */
  function nettoyerSurcharges(brut) {
    var propre = {};
    if (!brut || typeof brut !== "object") { return propre; }
    for (var cle in LIMITES_CURSEURS_CO2) {
      var v = Number(brut[cle]);
      if (brut[cle] === undefined || !isFinite(v)) { continue; }
      var lim = LIMITES_CURSEURS_CO2[cle];
      v = Math.min(lim.max, Math.max(lim.min, v));
      propre[cle] = Math.round(v * 100) / 100;
    }
    return propre;
  }

  /* ---------- Formatage ---------- */

  function tonnes(v) { return Fmt.nombre(v, 1); }

  function dateLongue(iso) {
    var m = iso.split("-");
    var jour = parseInt(m[2], 10);
    return (jour === 1 ? "1er" : String(jour)) + " " + MOIS[parseInt(m[1], 10) - 1] + " " + m[0];
  }

  /* ---------- Compteur animé (count-up) ---------- */

  var reduireMouvement = Commun.reduireMouvement;

  /* Fait défiler la valeur affichée de sa valeur actuelle jusqu'à "cible".
     Au premier appel, on part de 0. Avec prefers-reduced-motion, la valeur
     finale s'affiche directement. */
  function compter(element, cible, duree, formater) {
    var depart = (typeof element._val === "number") ? element._val : 0;
    element._val = cible;

    if (element._anim) { cancelAnimationFrame(element._anim); }
    if (element._fin) { clearTimeout(element._fin); }

    if (reduireMouvement || duree <= 0 || Math.abs(depart - cible) < 1e-9) {
      element.textContent = formater(cible);
      return;
    }

    var debut = null;
    // Filet de sécurité : la valeur finale est toujours affichée.
    element._fin = setTimeout(function () {
      if (element._anim) { cancelAnimationFrame(element._anim); }
      element.textContent = formater(cible);
    }, duree + 80);

    function pas(horodatage) {
      if (debut === null) { debut = horodatage; }
      var t = Math.min(1, (horodatage - debut) / duree);
      var doux = 1 - Math.pow(1 - t, 3); // ralentit doucement à l'arrivée
      element.textContent = formater(depart + (cible - depart) * doux);
      if (t < 1) { element._anim = requestAnimationFrame(pas); }
    }
    element._anim = requestAnimationFrame(pas);
  }

  /* ---------- Graphique ---------- */

  function couleur(nom) {
    return getComputedStyle(document.documentElement).getPropertyValue(nom).trim();
  }

  /* Écran étroit : étiquettes courtes et totaux sans unité (l axe donne déjà l unité). */
  function ecranEtroit() { return window.innerWidth < 600; }

  /* Écrit le total de chaque barre à son extrémité. */
  var pluginTotaux = {
    id: "totauxCO2",
    afterDatasetsDraw: function (chart) {
      var ctx = chart.ctx;
      var xAxe = chart.scales.x;
      var meta = chart.getDatasetMeta(0);
      ctx.save();
      ctx.font = "600 14px IBM Plex Mono, Consolas, monospace";
      ctx.fillStyle = couleur("--bleu-nuit");
      ctx.textBaseline = "middle";
      for (var i = 0; i < chart.data.labels.length; i++) {
        var total = 0;
        chart.data.datasets.forEach(function (d) { total += d.data[i] || 0; });
        var barre = meta.data[i];
        if (!barre) { continue; }
        ctx.fillText(tonnes(total) + (ecranEtroit() ? "" : " tCO₂e"), xAxe.getPixelForValue(total) + 10, barre.y);
      }
      ctx.restore();
    }
  };

  function jeuxDeDonnees(r) {
    return [
      { label: "Transport (camion-citerne)", data: [r.classiqueTransport, 0], backgroundColor: couleur("--bleu") },
      { label: "Incinération", data: [r.classiqueDestruction, 0], backgroundColor: couleur("--bleu-clair") },
      { label: "Électricité (Elixir)", data: [0, r.elixirElectricite], backgroundColor: couleur("--action") },
      { label: "Déplacements de l'unité", data: [0, r.elixirDeplacements], backgroundColor: couleur("--action-actif") }
    ];
  }

  function majGraphique(r) {
    if (!CHART_OK) { tableauRepli(r); return; }

    var jeux = jeuxDeDonnees(r);
    var etiquettes = ecranEtroit() ? ["Classique", "Elixir"] : ["Filière classique", "Elixir sur site"];
    var margeDroite = ecranEtroit() ? 56 : 110;
    if (!graphe) {
      graphe = new Chart(el("graph-co2"), {
        type: "bar",
        data: { labels: etiquettes, datasets: jeux },
        plugins: [pluginTotaux],
        options: {
          indexAxis: "y",
          responsive: true, maintainAspectRatio: false,
          animation: reduireMouvement ? false : { duration: 400 },
          layout: { padding: { right: margeDroite } },
          scales: {
            x: {
              stacked: true, beginAtZero: true,
              title: { display: true, text: "tCO₂e par an", color: couleur("--texte-doux"), font: { family: "IBM Plex Sans, sans-serif", size: 13 } },
              grid: { color: couleur("--bordure") }, border: { display: false },
              ticks: { color: couleur("--texte-doux"), font: { family: "IBM Plex Mono, monospace", size: 12 } }
            },
            y: {
              stacked: true, grid: { display: false }, border: { color: couleur("--bordure") },
              ticks: { color: couleur("--texte"), font: { family: "IBM Plex Sans, sans-serif", size: 14, weight: "600" } }
            }
          },
          plugins: {
            legend: {
              position: "bottom", align: "start",
              labels: { color: couleur("--texte"), usePointStyle: true, boxWidth: 10, padding: 12, font: { family: "IBM Plex Sans, sans-serif", size: 13 } }
            },
            tooltip: {
              backgroundColor: couleur("--bleu-nuit"), padding: 12, cornerRadius: 8,
              titleFont: { family: "IBM Plex Sans, sans-serif", size: 13 },
              bodyFont: { family: "IBM Plex Mono, monospace", size: 12 },
              filter: function (item) { return item.parsed.x > 0; },
              callbacks: {
                label: function (c) { return c.dataset.label + " : " + tonnes(c.parsed.x) + " tCO₂e"; }
              }
            }
          }
        }
      });
    } else {
      graphe.data.labels = etiquettes;
      graphe.data.datasets = jeux;
      graphe.options.layout.padding.right = margeDroite;
      graphe.update();
    }
  }

  /* Repli sans Chart.js : un tableau de valeurs. */
  function tableauRepli(r) {
    el("zone-co2").innerHTML =
      '<div class="tableau-conteneur"><table class="tableau"><caption>Émissions annuelles par filière (tCO₂e)</caption>' +
      '<thead><tr><th>Filière</th><th>Poste</th><th class="num">tCO₂e par an</th></tr></thead><tbody>' +
      '<tr><td>Filière classique</td><td>Transport (camion-citerne)</td><td class="num">' + tonnes(r.classiqueTransport) + '</td></tr>' +
      '<tr><td>Filière classique</td><td>Incinération</td><td class="num">' + tonnes(r.classiqueDestruction) + '</td></tr>' +
      '<tr class="mis-en-avant"><td><strong>Total classique</strong></td><td></td><td class="num"><strong>' + tonnes(r.classiqueTotal) + '</strong></td></tr>' +
      '<tr><td>Elixir sur site</td><td>Électricité</td><td class="num">' + tonnes(r.elixirElectricite) + '</td></tr>' +
      '<tr><td>Elixir sur site</td><td>Déplacements de l\'unité</td><td class="num">' + tonnes(r.elixirDeplacements) + '</td></tr>' +
      '<tr class="mis-en-avant"><td><strong>Total Elixir</strong></td><td></td><td class="num"><strong>' + tonnes(r.elixirTotal) + '</strong></td></tr>' +
      '</tbody></table></div>';
  }

  /* ---------- Affichage ---------- */

  /* premiereFois : le compteur part de 0 en 1,5 s ; ensuite, mises à jour courtes. */
  function afficher(premiereFois) {
    var r = calculerCO2(valeurs);
    var duree = premiereFois ? 1500 : 350;

    compter(el("co2-evite-an"), r.evitePArAn, duree, tonnes);
    compter(el("co2-cumul"), r.eviteCumule, duree, Fmt.entier);
    el("co2-periode").textContent = "Du " + dateLongue(valeurs.dateDebut) + " au " + dateLongue(valeurs.dateFin) +
      " (" + Fmt.nombre(r.dureeAnnees, 2) + " ans)";

    // Équivalences
    compter(el("co2-camions"), r.camionsEvitesParAn, duree, Fmt.entier);
    el("co2-camions-detail").textContent = "Camions-citernes de " + Fmt.entier(valeurs.capaciteCiterneM3) +
      " m³ qui n'ont plus à rouler jusqu'à l'incinérateur.";

    var enMillions = r.kmVoitureEquivalents >= 1000000;
    el("co2-km-unite").textContent = enMillions ? "millions de km par an" : "km par an";
    compter(el("co2-km"), r.kmVoitureEquivalents, duree, function (v) {
      return enMillions ? Fmt.nombre(v / 1000000, 2) : Fmt.entier(v);
    });
    el("co2-km-detail").textContent = "Soit environ " + Fmt.entier(r.kmVoitureEquivalents / 40075) +
      " tours de la Terre en voiture thermique.";

    compter(el("co2-pourcent"), r.evitePourcent, duree, function (v) { return Fmt.nombre(v, 1); });
    el("co2-pourcent-detail").textContent = "De " + tonnes(r.classiqueTotal) + " à " + tonnes(r.elixirTotal) +
      " tCO₂e par an.";

    el("co2-resume").textContent = "CO₂ évité : " + tonnes(r.evitePArAn) + " tonnes par an, " +
      Fmt.entier(r.eviteCumule) + " tonnes cumulées, soit " + Fmt.nombre(r.evitePourcent, 1) + " % de réduction.";

    majGraphique(r);
  }

  /* Met à jour les curseurs et leur valeur affichée. */
  function majCurseurs() {
    el("cur-volume").value = valeurs.volumeDechetsM3An;
    el("cur-distance").value = valeurs.distanceIncinerateurKm;
    el("cur-incineration").value = valeurs.incinerationTCO2ParM3;

    el("val-volume").textContent = Fmt.entier(valeurs.volumeDechetsM3An) + " m³/an";
    el("val-distance").textContent = Fmt.entier(valeurs.distanceIncinerateurKm) + " km";
    el("val-incineration").textContent = Fmt.nombre(valeurs.incinerationTCO2ParM3, 2) + " tCO₂e/m³";

    el("cur-volume").setAttribute("aria-valuetext", Fmt.entier(valeurs.volumeDechetsM3An) + " mètres cubes par an");
    el("cur-distance").setAttribute("aria-valuetext", valeurs.distanceIncinerateurKm + " kilomètres");
    el("cur-incineration").setAttribute("aria-valuetext", Fmt.nombre(valeurs.incinerationTCO2ParM3, 2) + " tonnes de CO₂ équivalent par mètre cube");
  }

  /* Tableau repliable des hypothèses : valeur par défaut, valeur utilisée, justification. */
  function afficherTableauHypotheses() {
    var html = "<thead><tr><th>Paramètre</th><th class=\"num\">Valeur par défaut</th>" +
               "<th class=\"num\">Valeur utilisée</th><th>Unité</th><th>Justification</th></tr></thead><tbody>";
    ORDRE_HYPOTHESES_CO2.forEach(function (cle) {
      var h = HYPOTHESES_CO2[cle];
      var estDate = h.unite === "date";
      var defaut = estDate ? dateLongue(h.valeur) : Fmt.nombre(h.valeur, h.valeur % 1 === 0 ? 0 : 2);
      var utilisee = estDate ? dateLongue(valeurs[cle]) : Fmt.nombre(valeurs[cle], valeurs[cle] % 1 === 0 ? 0 : 2);
      var modifie = valeurs[cle] !== h.valeur;
      html += "<tr><td><strong>" + h.libelle + "</strong></td>" +
              '<td class="num">' + defaut + "</td>" +
              '<td class="num">' + (modifie ? "<strong>" + utilisee + "</strong>" : utilisee) + "</td>" +
              "<td>" + (estDate ? "" : h.unite) + "</td>" +
              "<td>" + h.source + "</td></tr>";
    });
    el("table-hypotheses-co2").innerHTML = html + "</tbody>";
  }

  function rafraichir(premiereFois) {
    majCurseurs();
    afficher(!!premiereFois);
    afficherTableauHypotheses();
  }

  /* ---------- Événements ---------- */

  function surCurseur(cle, element) {
    element.addEventListener("input", function () {
      valeurs[cle] = Math.round(parseFloat(this.value) * 100) / 100;
      ecrireStockage(nettoyerSurcharges(valeurs));
      rafraichir(false);
    });
  }

  function demarrer() {
    Commun.monter("co2");

    valeurs = fusionnerValeursCO2(valeursParDefautCO2(), nettoyerSurcharges(lireStockage()));

    surCurseur("volumeDechetsM3An", el("cur-volume"));
    surCurseur("distanceIncinerateurKm", el("cur-distance"));
    surCurseur("incinerationTCO2ParM3", el("cur-incineration"));

    el("btn-defaut").addEventListener("click", function () {
      effacerStockage();
      valeurs = valeursParDefautCO2();
      rafraichir(false);
    });

    // Les étiquettes du graphique dépendent de la largeur de l écran.
    var minuteur = null;
    window.addEventListener("resize", function () {
      clearTimeout(minuteur);
      minuteur = setTimeout(function () { majGraphique(calculerCO2(valeurs)); }, 150);
    });

    rafraichir(true);
  }

  document.addEventListener("DOMContentLoaded", demarrer);
})();
