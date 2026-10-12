/* ============================================================
   HYDRA — données des traitements (js/data-traitements.js)
   ------------------------------------------------------------
   Ce fichier décrit les quatre technologies de traitement que
   le simulateur peut déployer sur un captage : leurs taux
   d'abattement par molécule, leur coût, leur délai de mise en
   service et le type de déchet qu'elles génèrent.

   Toutes les valeurs sont des ordres de grandeur indicatifs
   fournis par le sujet du hackathon. Ce fichier ne contient que
   des données : aucune logique de calcul (voir js/calculs.js).
   ============================================================ */

/* Ordre officiel des 10 molécules quantifiées dans le sujet.
   Cet ordre est réutilisé partout dans l'application (tableaux,
   graphiques, abattements) pour rester cohérent. */
var ORDRE_MOLECULES = [
  "PFBA", "PFPeA", "PFHxA", "PFHpA", "PFOA",
  "PFBS", "PFPeS", "PFHxS", "PFHpS", "PFOS"
];

/* Les 4 molécules de la recommandation HCSP.
   PFNA n'est pas quantifiée dans le sujet : elle est toujours à 0. */
var MOLECULES_HCSP = ["PFOA", "PFOS", "PFNA", "PFHxS"];

/* Identifiants des quatre traitements disponibles dans le simulateur. */
var TRAITEMENTS = {

  charbon: {
    id: "charbon",
    nom: "Charbon actif seul",
    recommande: false,
    coutParM3: 0.175,
    delaiMois: 12,
    dechet: "Charbon usagé, régénéré à très haute température",
    // Taux d'abattement moyen par molécule (fraction retenue par le filtre)
    abattement: {
      PFBA: 0.20,
      PFPeA: 0.35,
      PFHxA: 0.55,
      PFHpA: 0.70,
      PFOA: 0.81,
      PFBS: 0.625,
      PFPeS: 0.74,
      PFHxS: 0.81,
      PFHpS: 0.91,
      PFOS: 0.93
    }
  },

  resine: {
    id: "resine",
    nom: "Résine seule",
    recommande: false,
    coutParM3: 0.30,
    delaiMois: 10,
    dechet: "Résine usagée, incinérée à haute température",
    abattement: {
      PFBA: 0.50,
      PFPeA: 0.75,
      PFHxA: 0.875,
      PFHpA: 0.93,
      PFOA: 0.96,
      PFBS: 0.945,
      PFPeS: 0.96,
      PFHxS: 0.9725,
      PFHpS: 0.9725,
      PFOS: 0.984
    }
  },

  /* Le Bouclier PFAS applique le charbon actif PUIS la résine, en série.
     Son abattement n'est donc pas une valeur unique par molécule : il est
     calculé dans calculs.js en appliquant successivement les deux
     tableaux ci-dessus (charbon puis résine). On garde ici uniquement
     ses paramètres propres (coût, délai, déchet). */
  bouclier: {
    id: "bouclier",
    nom: "Bouclier PFAS (charbon + résine)",
    recommande: true,
    coutParM3: 0.32,
    delaiMois: 11,
    dechet: "Charbon régénéré + résidus concentrés détruits par Elixir",
    etapes: ["charbon", "resine"] // appliqué en série, dans cet ordre
  },

  nanofiltration: {
    id: "nanofiltration",
    nom: "Nanofiltration",
    recommande: false,
    coutParM3: 0.45,
    delaiMois: 30,
    dechet: "Concentrat liquide = 15 % du débit traité",
    tauxConcentrat: 0.15, // part du débit traité qui finit en concentrat liquide
    abattement: {
      PFBA: 0.70,
      PFPeA: 0.885,
      PFHxA: 0.915,
      PFHpA: 0.935,
      PFOA: 0.945,
      PFBS: 0.945,
      PFPeS: 0.945,
      PFHxS: 0.9575,
      PFHpS: 0.9575,
      PFOS: 0.9625
    }
  }
};

/* Ordre d'affichage des traitements dans les boutons segmentés du simulateur. */
var ORDRE_TRAITEMENTS = ["charbon", "resine", "bouclier", "nanofiltration"];

/* Seuils réglementaires (en µg/L) */
var LIMITE_LEGALE_PFAS = 0.10;   // somme de 20 PFAS, obligatoire depuis le 01/01/2026
var RECOMMANDATION_HCSP = 0.02;  // somme de 4 PFAS (PFOA + PFOS + PFNA + PFHxS)
var SEUIL_CRITIQUE = 0.20;       // au-delà : niveau "critique" (rouge)

/* Volumes de référence du territoire (m³/an), donnés par le sujet. */
var VOLUME_MIS_EN_DISTRIBUTION = 18600000;
var VOLUME_VENDU = 16000000;
var CONSOMMATION_FOYER_M3 = 120;

/* Capacité de destruction par unité Elixir (oxydation hydrothermale
   supercritique), en m³ de concentrat par an. Utilisée pour montrer
   que la nanofiltration produit un concentrat trop volumineux pour
   une destruction sur site à l'échelle du territoire. */
var CAPACITE_ELIXIR_M3_PAR_AN = 1200;

/* Libellés et icônes des 5 niveaux de qualité (voir § 6 du brief).
   La couleur vient des variables CSS de :root (css/style.css) : la
   propriété "variable" donne le nom à lire. La couleur n'est jamais
   la seule information : un libellé et une icône accompagnent
   toujours chaque niveau. */
var NIVEAUX_QUALITE = {
  non_detecte:  { libelle: "Non détecté",                        court: "Non détecté",  variable: "--niv-vert",   icone: "✓" },
  sous_limites: { libelle: "Sous les limites",                   court: "Sous limites", variable: "--niv-jaune",  icone: "●" },
  depasse_hcsp: { libelle: "Au-dessus de la recommandation HCSP", court: "> HCSP",       variable: "--niv-ambre",  icone: "▲" },
  non_conforme: { libelle: "Non conforme",                       court: "Non conforme", variable: "--niv-orange", icone: "■" },
  critique:     { libelle: "Critique",                           court: "Critique",     variable: "--niv-rouge",  icone: "✖" }
};
