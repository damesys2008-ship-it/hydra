/* ============================================================
   HYDRA — carte des captages (js/carte.js)
   ------------------------------------------------------------
   Module réutilisable : la page d'accueil l'utilise pour une
   mini-carte non interactive, la page Carte pour la carte
   complète. Il ne fait AUCUN calcul : il dessine l'état du
   territoire déjà calculé (calculerEtatTerritoire).

   Usage :
     var carte = Carte.creer("carte", { interactif: true, surClic: fn });
     carte.maj(territoire, idSelection);

   Si Leaflet n'est pas chargé (pas de réseau), un message remplace
   la carte ; les listes des pages restent utilisables.
   ============================================================ */

var Carte = (function () {

  var LEAFLET_OK = (typeof L !== "undefined");

  /* Les 4 usines de traitement (positions approximatives). */
  var USINES = [
    { nom: "Usine du Val",                        lat: 47.8790, lng: 1.9120 },
    { nom: "Station d'Ingré",                     lat: 47.9215, lng: 1.8240 },
    { nom: "Station d'Ormes",                     lat: 47.9535, lng: 1.8520 },
    { nom: "Station de La Chapelle-Saint-Mesmin", lat: 47.9040, lng: 1.8510 }
  ];

  /* Taille du point en pixels, proportionnelle au volume produit
     (200 000 m³ -> 18 px ; 1 200 000 m³ -> 34 px). */
  function tailleDepuisVolume(volume) {
    var t = Math.max(0, Math.min(1, (volume - 200000) / 1000000));
    return Math.round(18 + t * 16);
  }

  /* HTML interne d'un marqueur : anneau (alerte) + point + pictogramme. */
  function htmlMarqueur(captage) {
    var taille = tailleDepuisVolume(captage.volumeAnnuel);
    return '<div class="marqueur">' +
             '<span class="marqueur-anneau"></span>' +
             '<span class="marqueur-point" style="width:' + taille + 'px;height:' + taille + 'px"></span>' +
           '</div>';
  }

  function htmlInfobulle(captage, res) {
    var n = NIVEAUX_QUALITE[res.niveauSortie];
    return '<strong>' + captage.nom + '</strong><br>' +
           '<span class="num">' + Fmt.concentration(res.sommeSortie) + ' µg/L</span> · ' + n.libelle +
           (res.traite ? '<br>Traitement simulé actif' : '');
  }

  /* ---------- Création d'une carte ---------- */

  function creer(idElement, options) {
    options = options || {};
    var interactif = options.interactif !== false;
    var zone = document.getElementById(idElement);

    var instance = {
      disponible: LEAFLET_OK,
      maj: function () {}, filtrer: function () {}, centrerSur: function () {},
      ajuster: function () {}, afficherUsines: function () {}, redimensionner: function () {}
    };

    if (!LEAFLET_OK || !zone) {
      if (zone) {
        zone.innerHTML = '<div class="repli-carte"><p>La carte n\'a pas pu être chargée (connexion indisponible). ' +
                         'Les captages restent consultables dans la liste.</p></div>';
      }
      return instance;
    }

    var carte = L.map(zone, {
      zoomSnap: 0.25,          // zooms intermédiaires : cadrage serré même sur téléphone
      zoomControl: interactif,
      dragging: interactif,
      scrollWheelZoom: interactif,
      doubleClickZoom: interactif,
      boxZoom: interactif,
      keyboard: interactif,
      touchZoom: interactif
    });

    // Cadrage initial sur les 30 captages : sur un écran étroit (téléphone),
    // un zoom fixe coupait les captages situés en bord de carte.
    var limitesCaptages = L.latLngBounds(CAPTAGES.map(function (c) { return [c.lat, c.lng]; }));
    carte.fitBounds(limitesCaptages, { padding: [28, 28], maxZoom: options.zoom || 12, animate: false });

    // Fond de carte clair. Les tuiles CARTO « Positron » exigent désormais une
    // clé d'API : on utilise OpenStreetMap, éclairci et désaturé en CSS
    // (classe "tuiles-claires") pour obtenir un rendu équivalent.
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      className: "tuiles-claires",
      maxZoom: 19
    }).addTo(carte);

    var marqueurs = {};
    var visibles = {};      // idCaptage -> booléen (filtres)
    var dernierEtat = null;
    var idSelectionCourant = null;

    CAPTAGES.forEach(function (c) {
      visibles[c.id] = true;
      var m = L.marker([c.lat, c.lng], {
        icon: L.divIcon({ className: "marqueur-icone", html: htmlMarqueur(c), iconSize: [48, 48], iconAnchor: [24, 24] }),
        alt: "Captage " + c.nom,
        interactive: interactif,
        keyboard: interactif,
        riseOnHover: interactif
      }).addTo(carte);
      if (interactif) {
        m.bindTooltip("", { direction: "top", offset: [0, -14], className: "infobulle-hydra" });
        m.on("click", function () { if (options.surClic) { options.surClic(c.id); } });
      }
      marqueurs[c.id] = m;
    });

    // Calque optionnel des usines de traitement
    var calqueUsines = L.layerGroup();
    USINES.forEach(function (u) {
      var m = L.marker([u.lat, u.lng], {
        icon: L.divIcon({
          className: "usine-icone",
          html: '<div class="usine">' + Commun.icone("usine", "icone-petite") + '</div>',
          iconSize: [30, 30], iconAnchor: [15, 15]
        }),
        title: u.nom, alt: u.nom, interactive: interactif, keyboard: false
      });
      if (interactif) {
        m.bindTooltip("<strong>" + u.nom + "</strong><br>Usine de traitement",
                      { direction: "top", offset: [0, -12], className: "infobulle-hydra" });
      }
      m.addTo(calqueUsines);
    });

    /* Applique l'état courant (niveau, anneau, traitement, sélection). */
    function appliquer() {
      if (!dernierEtat) { return; }
      CAPTAGES.forEach(function (c) {
        var m = marqueurs[c.id];
        var racine = m.getElement();
        if (!racine) { return; }
        var res = dernierEtat.parCaptage[c.id];
        var marq = racine.querySelector(".marqueur");
        var point = racine.querySelector(".marqueur-point");

        marq.style.setProperty("--niveau", "var(" + NIVEAUX_QUALITE[res.niveauSortie].variable + ")");
        if (point.getAttribute("data-niveau") !== res.niveauSortie) {
          point.setAttribute("data-niveau", res.niveauSortie);
          point.innerHTML = Commun.icone(res.niveauSortie);
        }
        marq.classList.toggle("alerte", !res.conforme);
        marq.classList.toggle("traite", res.traite);
        marq.classList.toggle("selection", c.id === idSelectionCourant);
        racine.style.display = visibles[c.id] ? "" : "none";
        racine.style.zIndex = (c.id === idSelectionCourant) ? 1000 : "";
        if (interactif) { m.setTooltipContent(htmlInfobulle(c, res)); }
      });
    }

    instance.maj = function (territoire, idSelection) {
      dernierEtat = territoire;
      idSelectionCourant = (idSelection === undefined) ? null : idSelection;
      appliquer();
    };

    /* Masque les captages dont l'id n'est pas dans la liste. */
    instance.filtrer = function (idsVisibles) {
      CAPTAGES.forEach(function (c) { visibles[c.id] = idsVisibles.indexOf(c.id) !== -1; });
      appliquer();
    };

    instance.centrerSur = function (id) {
      var c = Commun.captageParId(id);
      if (!c) { return; }
      carte.setView([c.lat, c.lng], Math.max(carte.getZoom(), 13), { animate: !Commun.reduireMouvement });
    };

    /* Cadre la vue sur un ensemble de captages. */
    instance.ajuster = function (ids) {
      var points = [];
      ids.forEach(function (id) {
        var c = Commun.captageParId(id);
        if (c) { points.push([c.lat, c.lng]); }
      });
      if (points.length === 0) { return; }
      carte.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 13, animate: !Commun.reduireMouvement });
    };

    instance.afficherUsines = function (visible) {
      if (visible) { calqueUsines.addTo(carte); } else { carte.removeLayer(calqueUsines); }
    };

    instance.redimensionner = function () { carte.invalidateSize(); };

    return instance;
  }

  return { disponible: LEAFLET_OK, creer: creer };
})();
