/* ============================================================
   HYDRA — graphiques de la fiche captage (js/graphiques.js)
   ------------------------------------------------------------
   Dessine deux graphiques avec Chart.js :
     1. l'évolution de la somme des 20 PFAS (courbe) ;
     2. la composition par molécule, avant / après (barres).
   Les données sont préparées par calculs.js
   (construireSerieEvolution, calculerComposition) : ici on ne fait
   que les dessiner.

   Si Chart.js n'est pas chargé (pas de réseau), les graphiques sont
   remplacés par des tableaux de valeurs.
   ============================================================ */

var Graphiques = (function () {

  var CHART_OK = (typeof Chart !== "undefined");

  var grapheEvolution = null;
  var grapheComposition = null;

  /* Lit une variable CSS de :root (un canvas ne comprend pas var()). */
  function couleur(nomVariable) {
    return getComputedStyle(document.documentElement).getPropertyValue(nomVariable).trim();
  }

  function policeTexte(taille) { return { family: "IBM Plex Sans, system-ui, sans-serif", size: taille }; }
  function policeNombres(taille) { return { family: "IBM Plex Mono, Consolas, monospace", size: taille }; }

  function axeTemps() {
    return {
      grid: { display: false },
      border: { color: couleur("--bordure") },
      ticks: { color: couleur("--texte-doux"), font: policeTexte(12), maxTicksLimit: 8, maxRotation: 0 }
    };
  }

  function axeValeurs(options) {
    return Object.assign({
      grid: { color: couleur("--bordure") },
      border: { display: false },
      ticks: {
        color: couleur("--texte-doux"), font: policeNombres(12),
        callback: function (v) { return Fmt.nombre(v, 2); }
      }
    }, options || {});
  }

  function legende(pastilles) {
    return {
      position: "bottom",
      labels: {
        color: couleur("--texte"), usePointStyle: !!pastilles,
        boxWidth: pastilles ? 10 : 28, boxHeight: 8, padding: 16, font: policeTexte(13)
      }
    };
  }

  function infobulle(formateur) {
    return {
      backgroundColor: couleur("--bleu-nuit"), titleColor: "#FFFFFF", bodyColor: "#FFFFFF",
      titleFont: policeTexte(13), bodyFont: policeNombres(12), padding: 12, cornerRadius: 8,
      callbacks: { label: formateur }
    };
  }

  /* Petit plugin : écrit « Mesures réelles (sujet) » au-dessus des
     4 vrais points du captage pilote. */
  var pluginAnnotation = {
    id: "annotationMesuresReelles",
    afterDatasetsDraw: function (chart) {
      var indexJeu = -1;
      chart.data.datasets.forEach(function (d, i) { if (d.estMesuresReelles) { indexJeu = i; } });
      if (indexJeu < 0) { return; }
      var valeurs = chart.data.datasets[indexJeu].data;
      var points = chart.getDatasetMeta(indexJeu).data.filter(function (p, i) { return valeurs[i] !== null; });
      if (!points.length) { return; }
      var xMin = points[0].x, yMin = points[0].y;
      points.forEach(function (p) { xMin = Math.min(xMin, p.x); yMin = Math.min(yMin, p.y); });
      var ctx = chart.ctx;
      ctx.save();
      ctx.font = "600 12px IBM Plex Sans, system-ui, sans-serif";
      ctx.fillStyle = couleur("--bleu-nuit");
      ctx.textAlign = "right";
      ctx.fillText("Mesures réelles (sujet)", xMin + 12, Math.max(chart.chartArea.top + 14, yMin - 16));
      ctx.restore();
    }
  };

  /* ---------- Graphique 1 : évolution ---------- */

  function majEvolution(serie, avecTraitement, nbReels) {
    var n = serie.labels.length;
    var constante = function (v) { var t = []; for (var i = 0; i < n; i++) { t.push(v); } return t; };
    var fin = serie.nbHistorique - 1;

    var jeux = [
      {
        label: "Somme des 20 PFAS",
        data: serie.brut,
        borderColor: couleur("--bleu"), backgroundColor: couleur("--bleu"),
        borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 5, tension: 0.25,
        // Les mois à venir (projection sans traitement) sont en pointillés fins
        segment: { borderDash: function (ctx) { return ctx.p0DataIndex >= fin ? [2, 4] : undefined; } }
      },
      {
        label: "Limite légale 0,10 µg/L",
        data: constante(LIMITE_LEGALE_PFAS),
        borderColor: couleur("--niv-rouge"), borderWidth: 1.5, borderDash: [6, 4], pointRadius: 0, pointHitRadius: 0
      },
      {
        label: "Recommandation HCSP (4 PFAS) 0,02 µg/L",
        data: constante(RECOMMANDATION_HCSP),
        borderColor: couleur("--niv-ambre"), borderWidth: 1.5, borderDash: [6, 4], pointRadius: 0, pointHitRadius: 0
      }
    ];

    if (avecTraitement) {
      jeux.push({
        label: "Après traitement (mise en service " + serie.moisMiseEnService + ")",
        data: serie.apres,
        borderColor: couleur("--action"), backgroundColor: couleur("--action"),
        borderWidth: 3, pointRadius: 0, pointHoverRadius: 5, tension: 0, spanGaps: false
      });
    }

    if (nbReels > 0) {
      jeux.push({
        label: "Mesures réelles (sujet)",
        estMesuresReelles: true,
        data: serie.reels,
        showLine: false,
        pointStyle: "rectRot", pointRadius: 7, pointHoverRadius: 9,
        pointBackgroundColor: couleur("--bleu-nuit"), pointBorderColor: couleur("--blanc"), pointBorderWidth: 2
      });
    }

    if (!grapheEvolution) {
      grapheEvolution = new Chart(document.getElementById("graph-evolution"), {
        type: "line",
        data: { labels: serie.labels, datasets: jeux },
        plugins: [pluginAnnotation],
        options: {
          responsive: true, maintainAspectRatio: false,
          animation: Commun.reduireMouvement ? false : { duration: 500 },
          interaction: { mode: "index", intersect: false },
          scales: { x: axeTemps(), y: axeValeurs({ beginAtZero: true, suggestedMax: 0.12 }) },
          plugins: {
            legend: legende(),
            tooltip: infobulle(function (c) {
              return c.dataset.label.split(" (")[0] + " : " + Fmt.concentration(c.parsed.y) + " µg/L";
            })
          }
        }
      });
    } else {
      grapheEvolution.data.labels = serie.labels;
      grapheEvolution.data.datasets = jeux;
      grapheEvolution.update();
    }
  }

  /* ---------- Graphique 2 : composition ---------- */

  function majComposition(compo, avecTraitement) {
    var jeux = [
      { label: "Avant traitement", data: compo.avant, backgroundColor: couleur("--bleu-clair"), borderRadius: 4 }
    ];
    if (avecTraitement) {
      jeux.push({ label: "Après traitement", data: compo.apres, backgroundColor: couleur("--action"), borderRadius: 4 });
    }

    if (!grapheComposition) {
      grapheComposition = new Chart(document.getElementById("graph-composition"), {
        type: "bar",
        data: { labels: compo.labels, datasets: jeux },
        options: {
          indexAxis: "y",
          responsive: true, maintainAspectRatio: false,
          animation: Commun.reduireMouvement ? false : { duration: 500 },
          scales: {
            x: axeValeurs({ beginAtZero: true }),
            y: { grid: { display: false }, border: { color: couleur("--bordure") },
                 ticks: { color: couleur("--texte"), font: policeTexte(13), autoSkip: false } }
          },
          plugins: {
            legend: legende(true),
            tooltip: infobulle(function (c) { return c.dataset.label + " : " + Fmt.concentration(c.parsed.x) + " µg/L"; })
          }
        }
      });
    } else {
      grapheComposition.data.labels = compo.labels;
      grapheComposition.data.datasets = jeux;
      grapheComposition.update();
    }
  }

  /* ---------- Repli sans Chart.js : tableaux de valeurs ---------- */

  function tableauSerie(serie, avecTraitement) {
    var html = '<div class="tableau-conteneur"><table class="tableau"><caption>Évolution de la somme des 20 PFAS (µg/L), 12 derniers mois et mois à venir</caption>' +
               '<thead><tr><th>Date</th><th class="num">Somme des 20 PFAS</th>' +
               (avecTraitement ? '<th class="num">Après traitement</th>' : '') + '</tr></thead><tbody>';
    var debut = Math.max(0, serie.nbHistorique - 12);
    for (var i = debut; i < serie.labels.length; i++) {
      html += '<tr><td>' + serie.labels[i] + '</td><td class="num">' + Fmt.concentration(serie.brut[i]) + '</td>' +
              (avecTraitement ? '<td class="num">' + (serie.apres[i] === null ? '–' : Fmt.concentration(serie.apres[i])) + '</td>' : '') + '</tr>';
    }
    return html + '</tbody></table></div>';
  }

  function tableauComposition(compo) {
    var html = '<div class="tableau-conteneur"><table class="tableau"><caption>Composition par molécule (µg/L)</caption>' +
               '<thead><tr><th>Molécule</th><th class="num">Avant</th><th class="num">Après</th></tr></thead><tbody>';
    for (var i = 0; i < compo.labels.length; i++) {
      html += '<tr><td>' + compo.labels[i] + '</td><td class="num">' + Fmt.concentration(compo.avant[i]) +
              '</td><td class="num">' + Fmt.concentration(compo.apres[i]) + '</td></tr>';
    }
    return html + '</tbody></table></div>';
  }

  /* Phrase d'explication sous le graphique de composition. */
  function noteComposition(idTraitement, part) {
    if (!idTraitement || part <= 0) { return "Sans traitement : concentrations brutes du captage."; }
    var notes = {
      charbon: "Le charbon seul laisse passer les petites molécules (PFBA, PFPeA, PFHxA).",
      resine: "Résine seule : un seul étage, sans la première barrière de charbon.",
      bouclier: "Double barrière : la résine retient ce que le charbon laisse passer.",
      nanofiltration: "Très efficace, mais génère un concentrat liquide à détruire."
    };
    return notes[idTraitement] || "";
  }

  /* ---------- Point d'entrée ---------- */

  /* captage : l'objet captage ; res : résultat de calculerResultatSimulation ;
     idTraitement / part : le traitement simulé (ou null / 0). */
  function maj(captage, res, idTraitement, part) {
    var avecTraitement = !!(idTraitement && part > 0);
    var serie = construireSerieEvolution(captage, idTraitement, part, res.sommeSortie);
    var compo = calculerComposition(captage.molecules, res.moleculesSortie);
    var nbReels = serie.reels.filter(function (v) { return v !== null; }).length;

    if (CHART_OK) {
      majEvolution(serie, avecTraitement, nbReels);
      majComposition(compo, avecTraitement);
    } else {
      document.getElementById("zone-evolution").innerHTML = tableauSerie(serie, avecTraitement);
      document.getElementById("zone-composition").innerHTML = tableauComposition(compo);
    }

    var note = document.getElementById("note-composition");
    if (note) { note.textContent = noteComposition(idTraitement, part); }
  }

  return { disponible: CHART_OK, maj: maj };
})();
