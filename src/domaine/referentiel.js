import { uid } from "./format.js";


/* ================================================================== */
/*  1. Référentiel                                                     */
/* ================================================================== */

export const STORE_KEY = "chiffrage-platrerie-v3";

export const OLD_KEYS = ["chiffrage-platrerie-v2", "chiffrage-platrerie-v1"];


/* Niveau 1 de la taxonomie : les tuiles d'accueil de la bibliothèque.
   Le niveau 2 reste `cat`, qui devient un filtre à l'intérieur de la famille. */
export const FAMILLES = [
  { id: "cloisons", nom: "Cloisons", cats: ["cd", "cs", "csp", "cgh"], desc: "Distributives, séparatives, spéciales et grande hauteur" },
  { id: "contre", nom: "Contre-cloisons & doublages", cats: ["cc", "dc"], desc: "Doublages sur ossature et complexes collés" },
  { id: "plafonds", nom: "Plafonds", cats: ["pnd", "pand", "pd"], desc: "Non démontables, acoustiques et démontables" },
  { id: "protection", nom: "Protection de structures", cats: ["ps"], desc: "Poteaux, poutres et profilés à protéger" },
  { id: "gaines", nom: "Gaines techniques", cats: ["gt"], desc: "Habillage de colonnes et de réseaux" },
  { id: "bib", nom: "Boîte dans la boîte", cats: ["bib"], desc: "Ouvrage autoportant, cloisons et plafond solidaires" },
  { id: "bardages", nom: "Bardages", cats: ["bar"], desc: "Parements extérieurs sur ossature" },
];
export const FAMILLE_MAP = Object.fromEntries(FAMILLES.map((f) => [f.id, f]));
export const familleDe = (cat) => FAMILLES.find((f) => f.cats.includes(cat))?.id || "cloisons";

export const CATEGORIES = [
  { id: "cd", nom: "Cloisons distributives", desc: "Séparation de locaux d'un même logement" },
  { id: "cs", nom: "Cloisons séparatives", desc: "Entre logements ou locaux, exigence acoustique" },
  { id: "csp", nom: "Cloisons spéciales", desc: "Locaux humides, chocs, coupe-feu renforcé" },
  { id: "cgh", nom: "Cloisons grande hauteur", desc: "Au-delà de 4 m, ossature renforcée ou double" },
  { id: "cc", nom: "Contre-cloisons", desc: "Doublage sur ossature, réseaux intégrables" },
  { id: "dc", nom: "Doublages collés", desc: "Complexes isolants collés au MAP" },
  { id: "pnd", nom: "Plafonds non démontables", desc: "Sur fourrures et suspentes" },
  { id: "pand", nom: "Plafonds acoustiques", desc: "Plaques perforées, correction acoustique" },
  { id: "pd", nom: "Plafonds démontables", desc: "Dalles sur ossature apparente T24" },
  { id: "gt", nom: "Gaines techniques", desc: "Habillage de colonnes et réseaux" },
  { id: "ps", nom: "Protection de structures", desc: "Poteaux, poutres et profilés porteurs" },
  { id: "bib", nom: "Boîte dans la boîte", desc: "Cloisons autoportantes support de plafond" },
  { id: "bar", nom: "Bardages", desc: "Parements extérieurs sur ossature" },
];

export const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));


export const FAMILLES_ART = ["Plaque", "Dalle", "Complexe", "Ossature", "Isolant", "Accessoire"];

export const UNITES = ["m²", "ml", "u", "kg", "l"];

export const STATUTS = ["Étude", "Remis", "Obtenu", "Perdu", "En cours", "Soldé"];

export const STATUTS_CDE = ["À passer", "Commandée", "Partielle", "Livrée", "Facturée"];


export const MARQUES_SEED = ["Placo", "Knauf", "Siniat", "Isover", "Multi-marques", "Interne"]
  .map((nom) => ({ id: uid(), nom }));


export const FOURNISSEURS_SEED = ["Point P", "Cedeo", "Chausson Matériaux", "Gedimat"]
  .map((nom) => ({ id: uid(), nom }));



/* Dimensions unitaires et mode de débit.
   long : longueur ou hauteur de l'élément en m — larg : largeur en m
   coupe : "surface" (plaque, dalle), "hauteur" (montant, fourrure débités à la HSP),
           "longueur" (rail, cornière débités au linéaire), "aucune" (vrac, rouleau, pièce) */
export const MODE_COUPE = ["surface", "hauteur", "longueur", "aucune"];

export const MODE_COUPE_LIB = { surface: "Surface", hauteur: "À la hauteur", longueur: "Au linéaire", aucune: "Aucune" };


/* Identité de l'entreprise — reprise sur tous les documents émis */
export const ENTREPRISE_DEF = {
  nom: "", forme: "", capital: "",
  adresse: "", cp: "", ville: "",
  tel: "", email: "", site: "",
  siret: "", rcs: "", tvaIntra: "", ape: "4331Z",
  qualibat: "", assureur: "", police: "",
  banque: "", iban: "", bic: "",
  cgv: "Les prix s'entendent hors taxes, valables pour la durée de validité indiquée. Toute modification du programme ou des quantités fera l'objet d'un avenant chiffré avant exécution. Les travaux ne débutent qu'après réception de l'acompte et du devis signé.",
  paiement: "Acompte de 30 % à la commande, situations mensuelles à 30 jours fin de mois, solde à la levée des réserves.",
  penalites: "Pénalités de retard : trois fois le taux d'intérêt légal. Indemnité forfaitaire de recouvrement : 40 €.",
  mediateur: "",
};

export const LOGO_ID = "entreprise-logo";      /* rangé dans la photothèque, comme un visuel */

export const DEVIS_DEF = { num: "", date: "", validite: 45, objet: "", adresseChantier: "", remise: 0, acompte: 30 };


/* Conditions du marché — valeurs usuelles du second œuvre, à recaler par affaire */
export const MARCHE_DEF = {
  retenue: 5,        /* retenue de garantie, % du cumulé */
  cautionRG: false,  /* caution bancaire en remplacement de la retenue */
  prorata: 0.5,      /* compte prorata, % du cumulé */
  avance: 0,         /* avance forfaitaire, % du marché */
  seuilRemb: 65,     /* avancement à partir duquel l'avance se rembourse, % */
  tva: 10,           /* 10 % en rénovation de logement, 20 % sinon */
  revision: false,
  indexBase: 100, indexActuel: 100,  /* BT09 ou index du marché */
};

export const STATUTS_TS = ["À chiffrer", "Chiffré", "Transmis", "OS reçu", "Refusé", "Facturé"];


export const DEFAULT_PARAMS = {
  entreprise: { ...ENTREPRISE_DEF },
  modeCoef: "ca",          /* 'ca' = % du prix de vente, 'deb' = majoration du déboursé */
  cumul: "cumule",         /* 'cumule' = 1/(1-FG-B), 'cascade' = 1/(1-FG)/(1-B) */
  fg: 12, benef: 8,
  margeSource: "globale",  /* 'globale' = coefficient d'entreprise, 'article' = taux par article */
  margeArtDefaut: { mode: "marque", taux: 20 },
  margeMO: { mode: "marque", taux: 25 },
  qualifs: [
    { id: "q1", nom: "Chef d'équipe", taux: 46 },
    { id: "q2", nom: "Compagnon", taux: 38 },
    { id: "q3", nom: "Aide / manœuvre", taux: 29 },
  ],
  repartDefaut: { q1: 15, q2: 70, q3: 15 },
  prixBenne: 195,          /* € la tonne de déchets plâtre triés */
  seuilAlerte: 5,          /* % d'écart déclenchant une alerte sur les achats */
};



/* ------------------------------------------------------------------ */
/*  Caractéristiques normalisées par famille d'ouvrage                 */
/*  Reprises de la grille de critères des configurateurs fabricants.   */
/* ------------------------------------------------------------------ */

/* Classement d'exposition à l'eau des locaux — norme NF DTU 25.41 / cahier CSTB 3567 */
export const CLASSES_EAU = [
  { id: "ea", lab: "EA — EB", desc: "Locaux secs ou moyennement humides : chambres, séjours, bureaux." },
  { id: "ebp", lab: "EB+ privatif", desc: "Locaux humides à usage privatif : salles de bains de logement." },
  { id: "ebc", lab: "EB+ collectif", desc: "Locaux humides à usage collectif : sanitaires d'ERP, vestiaires." },
  { id: "ecp", lab: "EC partiel", desc: "Locaux très humides sans production de graisse." },
  { id: "ect", lab: "EC total", desc: "Très humides avec production de graisse : piscines, cuisines collectives." },
];

export const CLASSE_EAU_MAP = Object.fromEntries(CLASSES_EAU.map((c) => [c.id, c]));


/* Classe d'hygrométrie du local — sert au calcul de condensation des doublages */
export const HYGRO = ["Faible", "Moyenne", "Forte", "Très forte"];


/* Types de champ : n = nombre, t = texte, l = liste, m = multi-liste */
export const CARAC = {
  cd: [
    { id: "eau", lab: "Exposition à l'eau", type: "m", opts: CLASSES_EAU.map((c) => c.id), fmt: (v) => CLASSE_EAU_MAP[v]?.lab || v },
    { id: "hauteurs", lab: "Hauteur max par entraxe", type: "h" },
    { id: "hygro", lab: "Classe d'hygrométrie", type: "l", opts: HYGRO },
    { id: "typePlaque", lab: "Type de plaque", type: "t" },
    { id: "typeSysteme", lab: "Type de système", type: "t" },
    { id: "isolation", lab: "Isolation", type: "t" },
  ],
  cs: [
    { id: "dnt", lab: "Affaiblissement in situ DnT,A", type: "n", unite: "dB" },
    { id: "separe", lab: "Nature du séparatif", type: "l", opts: ["Entre logements", "Sur circulation commune", "Locaux d'activité"] },
    { id: "hauteurs", lab: "Hauteur max par entraxe", type: "h" },
    { id: "typePlaque", lab: "Type de plaque", type: "t" },
    { id: "typeSysteme", lab: "Type de système", type: "t" },
  ],
  csp: [
    { id: "eau", lab: "Exposition à l'eau", type: "m", opts: CLASSES_EAU.map((c) => c.id), fmt: (v) => CLASSE_EAU_MAP[v]?.lab || v },
    { id: "choc", lab: "Résistance aux chocs", type: "t" },
    { id: "hauteurs", lab: "Hauteur max par entraxe", type: "h" },
    { id: "hygro", lab: "Classe d'hygrométrie", type: "l", opts: HYGRO },
    { id: "typePlaque", lab: "Type de plaque", type: "t" },
  ],
  cgh: [
    { id: "hauteurs", lab: "Hauteur max par entraxe", type: "h" },
    { id: "typeSysteme", lab: "Type de système", type: "t" },
    { id: "typePlaque", lab: "Type de plaque", type: "t" },
  ],
  cc: [
    { id: "r", lab: "Résistance thermique R", type: "n", unite: "m²·K/W" },
    { id: "hauteurs", lab: "Hauteur max par entraxe", type: "h" },
    { id: "hygro", lab: "Classe d'hygrométrie", type: "l", opts: HYGRO },
    { id: "reseaux", lab: "Passage de réseaux", type: "l", opts: ["Oui", "Non"] },
  ],
  dc: [
    { id: "r", lab: "Résistance thermique R", type: "n", unite: "m²·K/W" },
    { id: "epIsolant", lab: "Épaisseur de l'isolant", type: "n", unite: "mm" },
    { id: "isolant", lab: "Nature de l'isolant", type: "l", opts: ["PSE", "PSE graphité", "Polyuréthane", "Laine minérale"] },
    { id: "permeance", lab: "Perméance", type: "t" },
    { id: "hygro", lab: "Classe d'hygrométrie", type: "l", opts: HYGRO },
    { id: "support", lab: "Support admis", type: "t" },
  ],
  pnd: [
    { id: "portee", lab: "Portée entre suspentes", type: "n", unite: "m" },
    { id: "support", lab: "Support de fixation", type: "m", opts: ["Dalle béton", "Poutrelles et hourdis", "Charpente bois", "Bac acier"] },
    { id: "profiles", lab: "Type de profilés", type: "t" },
    { id: "typePlaque", lab: "Type de plaque", type: "t" },
    { id: "isolation", lab: "Isolation", type: "t" },
  ],
  pand: [
    { id: "alpha", lab: "Absorption acoustique αw", type: "n", unite: "" },
    { id: "perfo", lab: "Modèle de perforations", type: "t" },
    { id: "dimPanneau", lab: "Dimensions du panneau", type: "t" },
    { id: "bords", lab: "Type de bords", type: "t" },
    { id: "portee", lab: "Portée entre suspentes", type: "n", unite: "m" },
  ],
  pd: [
    { id: "alpha", lab: "Absorption acoustique αw", type: "n", unite: "" },
    { id: "dimPanneau", lab: "Dimensions du panneau", type: "t" },
    { id: "bords", lab: "Type de bords", type: "t" },
    { id: "demontable", lab: "Démontabilité", type: "l", opts: ["Totale", "Partielle"] },
    { id: "hygro", lab: "Classe d'hygrométrie", type: "l", opts: HYGRO },
  ],
  gt: [
    { id: "eau", lab: "Exposition à l'eau", type: "m", opts: CLASSES_EAU.map((c) => c.id), fmt: (v) => CLASSE_EAU_MAP[v]?.lab || v },
    { id: "feuOI", lab: "Feu extérieur → intérieur", type: "l", opts: ["—", "EI 30", "EI 60", "EI 90", "EI 120"] },
    { id: "feuIO", lab: "Feu intérieur → extérieur", type: "l", opts: ["—", "EI 30", "EI 60", "EI 90", "EI 120"] },
    { id: "hauteurs", lab: "Hauteur max par entraxe", type: "h" },
    { id: "typePlaque", lab: "Type de plaque", type: "t" },
  ],
  ps: [
    { id: "classement", lab: "Classement de protection incendie", type: "l", opts: ["R 15", "R 30", "R 60", "R 90", "R 120"] },
    { id: "support", lab: "Élément protégé", type: "l", opts: ["Poteau", "Poutre", "Profilé I / H", "Profilé tubulaire", "Treillis"] },
    { id: "faces", lab: "Nombre de faces protégées", type: "l", opts: ["3 faces", "4 faces"] },
    { id: "massivete", lab: "Facteur de massiveté A/V", type: "n", unite: "m⁻¹" },
    { id: "tCritique", lab: "Température critique retenue", type: "n", unite: "°C" },
    { id: "typePlaque", lab: "Type de plaque", type: "t" },
  ],
  bib: [
    { id: "feuOI", lab: "Feu extérieur → intérieur", type: "l", opts: ["—", "EI 30", "EI 60", "EI 90", "EI 120"] },
    { id: "feuIO", lab: "Feu intérieur → extérieur", type: "l", opts: ["—", "EI 30", "EI 60", "EI 90", "EI 120"] },
    { id: "hauteurs", lab: "Hauteur max par entraxe", type: "h" },
    { id: "portee", lab: "Portée maximale du plafond", type: "n", unite: "m" },
    { id: "tete", lab: "Liaison en tête", type: "l", opts: ["Libre", "Guidée", "Jeu sismique"] },
    { id: "demontable", lab: "Ouvrage démontable", type: "l", opts: ["Oui", "Non"] },
  ],
  bar: [
    { id: "support", lab: "Ossature support", type: "t" },
    { id: "finition", lab: "Finition", type: "l", opts: ["Enduit mince", "Enduit épais", "Peinture", "Parement rapporté"] },
    { id: "lameAir", lab: "Lame d'air ventilée", type: "n", unite: "mm" },
    { id: "typePlaque", lab: "Type de plaque", type: "t" },
  ],
};



/* Hauteur maximale admissible : elle dépend de l'entraxe des montants.
   0,60 m est l'entraxe courant, 0,40 m l'entraxe resserré des locaux humides
   et des grandes hauteurs. Les deux valeurs sont publiées par les fabricants. */
export const ENTRAXES = [0.6, 0.4];




/* Textes de lecture, repris de la maquette */
export const TX_CAUSE = {
  coupe: "Chutes de coupe", condit: "Arrondi au colis", casse: "Casse et rebut",
  reprise: "Reprises et modifications", residu: "Écart non expliqué",
};

export const TX_LECTURE = {
  coupe: "La cause dominante est la chute de coupe : {v} % de la quantité nette, contre une provision de {p} % au devis. C'est de la géométrie, pas du gaspillage — la provision est sous-évaluée pour cette hauteur.",
  condit: "La cause dominante est l'arrondi au colis : {v} % de la quantité nette. On ne peut pas acheter une fraction de {c}. Sur des petites quantités, cet arrondi pèse plus que la mise en œuvre.",
  casse: "La cause dominante est la casse : {v} % de la quantité nette. C'est le seul poste sur lequel la manutention et le stockage agissent directement.",
  reprise: "La cause dominante est la reprise : {v} % de la quantité nette. À rapprocher des ordres de service et des modifications de plan.",
  residu: "Aucune cause mécanique ne domine : l'essentiel de l'écart reste non expliqué ({v} % de la quantité nette). À vérifier — inventaire, sorties non pointées, ou relevé incomplet.",
};

export const TX_GAIN = "La consommation est inférieure au chiffrage : la provision de perte était généreuse pour cette ligne.";

export const TX_GEO_SURFACE = "Élément de {l} × {w} m pour {h} m à couvrir. Il en faut {k} par hauteur, et la chute de {c} m est trop courte pour être réemployée ailleurs.";

export const TX_GEO_HAUTEUR = "Barre de {l} m débitée à {h} m. La chute de {c} m est perdue : trop courte pour un second montant.";

export const TX_GEO_LONGUEUR = "Barre de {l} m débitée au linéaire. La chute dépend de la longueur de chaque tronçon.";

export const TX_GEO_NONE = "Article en vrac, en rouleau ou compté à la pièce : pas de chute de débit.";


/* ------------------------------------------------------------------ */
/*  Dépôt : mouvements de stock et valorisation au prix moyen pondéré  */
/* ------------------------------------------------------------------ */

export const SENS = { entree: "Entrée", sortie: "Sortie", inventaire: "Inventaire" };
