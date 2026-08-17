import { uid } from "./format.js";
import { ENTRAXES } from "./referentiel.js";


/* ---------------------- Nomenclatures ---------------------- */

export const P = (art, ratio, perte = 0, calc = "fixe") => ({ id: uid(), art, ratio, perte, calc });

export const RAIL = { 48: "os-r48", 70: "os-r70", 90: "os-r90", 100: "os-r100" };

export const MONT = { 48: "os-m48", 70: "os-m70", 90: "os-m90", 100: "os-m100" };

export const HSP_REF = 2.5;


/* Ratios d'ossature déduits de la HSP et de l'entraxe */
export const ratioRail = (hsp) => 2 / (hsp || HSP_REF);

export const ratioMontant = (entraxe) => 1 / (entraxe || 0.6);


export function lignesCloison(d) {
  const n = d.n || 1, k = d.dbl ? 2 : 1, e = d.entraxe || 0.6, h = d.hsp || HSP_REF;
  const l = [
    P(d.p, 2 * n, 8),
    P(RAIL[d.oss], ratioRail(h) * k, 10, "rail"),
    P(MONT[d.oss], ratioMontant(e) * k, 10, "montant"),
  ];
  if (d.isol) l.push(P(d.isol, 1.0 * k, 5));
  if (n > 1) l.push(P("ac-vis25", 32 * (n - 1)), P("ac-vis35", 50));
  else l.push(P("ac-vis25", 50));
  if (d.dbl) l.push(P("ac-vis-oss", 6));
  l.push(P("ac-bande", 2.4, 5), P("ac-enduit", 0.5 + 0.06 * n), P("ac-resil", ratioRail(h) * k),
    P("ac-chev", 3.3 * ratioRail(h) * k), P("ac-mastic", 0.12));
  return l;
}

export function lignesContreCloison(d) {
  const n = d.n || 1, e = d.entraxe || 0.6, h = d.hsp || HSP_REF;
  const l = [
    P(d.p, 1.0 * n, 8),
    P(RAIL[d.oss], ratioRail(h), 10, "rail"),
    P(MONT[d.oss], ratioMontant(e), 10, "montant"),
  ];
  if (d.optima) l.push(P("os-optima", 3.4));
  if (d.isol) l.push(P(d.isol, 1.0, 5));
  l.push(P("ac-vis25", 25 * n), P("ac-bande", 1.3, 5), P("ac-enduit", 0.32),
    P("ac-chev", 3.0), P("ac-resil", ratioRail(h)), P("ac-cornp", 0.12));
  return l;
}

export function lignesDoublageColle(d) {
  return [P(d.cx, 1.0, 6), P("ac-map", 5.5), P("ac-bande", 1.2, 5),
  P("ac-enduit", 0.3), P("ac-cornp", 0.15), P("ac-mastic", 0.1)];
}

export function lignesPlafond(d) {
  const n = d.n || 1, e = d.entraxe || 0.5;
  const l = [
    P(d.p, 1.05 * n, 10),
    P("os-f530", ratioMontant(e) + 1.1, 8, "montant"),
    P("ac-susp", d.isol ? 2.2 : 1.8),
    P("ac-ecl", 0.6), P("os-corn", 0.45, 10),
  ];
  if (d.isol) l.push(P(d.isol, 1.0, 5));
  l.push(P(n > 1 ? "ac-vis35" : "ac-vis25", 17 * n), P("ac-chev", d.isol ? 2.3 : 1.9),
    P("ac-bande", 1.9, 5), P("ac-enduit", 0.45));
  return l;
}

export function lignesPlafondDemontable(d) {
  const l = [P(d.p, 1.0, 4), P("os-t24", 4.0, 5), P("os-l24", 0.5, 10), P("ac-suspt", 0.75), P("ac-chev", 0.9)];
  if (d.isol) l.push(P(d.isol, 1.0, 5));
  return l;
}

export function lignesGaine(d) {
  const n = d.n || 1, e = d.entraxe || 0.6, h = d.hsp || HSP_REF;
  return [P(d.p, 1.0 * n, 10), P(RAIL[d.oss], 2 * ratioRail(h), 10, "rail"),
  P(MONT[d.oss], ratioMontant(e), 10, "montant"), P("ac-vis25", 25 * n),
  P("ac-bande", 1.7, 5), P("ac-enduit", 0.36), P("ac-chev", 3.2), P("ac-cornp", 0.6)];
}

export function lignesHabillage(d) {
  const n = d.n || 1;
  return [P(d.p, 1.0 * n, 12), P("os-corn", 1.2, 10), P(MONT[d.oss || 48], 1.7, 10, "montant"),
  P("ac-vis25", 25 * n), P("ac-bande", 2.0, 5), P("ac-enduit", 0.4),
  P("ac-chev", 3.4), P("ac-cornp", 1.2)];
}


/* Boîte dans la boîte : cloisons autoportantes, non fixées en tête, qui portent
   elles-mêmes le plafond. Pas de suspente, une course de tête libre ou guidée,
   et un calfeutrement périphérique majoré. */
export function lignesBoiteDansLaBoite(d) {
  const n = d.n || 1, e = d.entraxe || 0.6, h = d.hsp || HSP_REF, portee = d.portee || 4;
  const l = [
    P(d.p, 2 * n, null),
    P(RAIL[d.oss], ratioRail(h) / 2 + 1 / portee, null, "rail"),
    P(MONT[d.oss], ratioMontant(e), null, "montant"),
  ];
  if (d.isol) l.push(P(d.isol, 1.0, null));
  /* plafond autoportant porté par les cloisons */
  l.push(P(d.p, 1.05 * n, null), P("os-corn", 0.9, null), P("os-f530", ratioMontant(0.5), null, "montant"));
  l.push(P(n > 1 ? "ac-vis35" : "ac-vis25", 50 + 17 * n, null),
    P("ac-bande", 3.4, null), P("ac-enduit", 0.72 + 0.06 * n),
    P("ac-resil", ratioRail(h)), P("ac-chev", 3.3 * ratioRail(h) / 2),
    P("ac-mastic", 0.34));
  return l;
}

export const BUILDERS = {
  cloison: lignesCloison, contre: lignesContreCloison, colle: lignesDoublageColle, bib: lignesBoiteDansLaBoite,
  plafond: lignesPlafond, demont: lignesPlafondDemontable, gaine: lignesGaine, habillage: lignesHabillage,
};


export const MATERIEL_DEF = { cloison: 0.35, contre: 0.30, colle: 0.25, plafond: 0.85, demont: 0.55, gaine: 0.40, habillage: 0.60, bib: 0.55 };


/* Taux de perte par défaut du système, hérité par toutes les lignes de sa nomenclature */
export const PERTE_DEF = { cloison: 8, contre: 8, colle: 6, plafond: 10, demont: 4, gaine: 10, habillage: 12, bib: 10 };

/* Articles comptés à la pièce : pas de chute, taux forcé à 0 */
/* Taux propres à certains articles, indépendants du système : un isolant se coupe
   au format de la trame, sa chute ne suit pas celle des plaques. */
export const PERTE_ART = {
  "is-lm45": 5, "is-lm70": 5, "is-lm100": 5, "is-lm120": 5, "is-lm200": 5,
};
export const SANS_PERTE = new Set(["ac-vis25", "ac-vis35", "ac-vis45", "ac-vis-oss", "ac-chev",
  "ac-mastic", "ac-susp", "ac-suspt", "ac-ecl", "os-optima"]);


/* Caractéristiques renseignées système par système.
   eau : classes d'exposition admises · sup : supports de suspente admis
   r : résistance thermique · alpha : absorption acoustique
   Ces valeurs restent marquées « à vérifier » tant qu'elles n'ont pas été
   confrontées à la fiche technique du fabricant. */
export const EAU_STD = ["ea"];

export const EAU_HYDRO = ["ea", "ebp", "ebc"];

export const EAU_THRE = ["ea", "ebp", "ebc", "ecp", "ect"];

export const SUP_STD = ["Dalle béton", "Poutrelles et hourdis"];

export const SUP_LARGE = ["Dalle béton", "Poutrelles et hourdis", "Charpente bois", "Bac acier"];


export const CARAC_SYS = {
  /* cloisons — exposition à l'eau et nature du parement */
  "s-p7248": { eau: EAU_STD, typePlaque: "BA13 standard", typeSysteme: "Parement simple" },
  "s-p9848": { eau: EAU_STD, typePlaque: "BA13 standard", typeSysteme: "Parement simple" },
  "s-p9848ph": { eau: EAU_STD, typePlaque: "Placo Phonique", typeSysteme: "Parement phonique" },
  "s-p9670": { eau: EAU_STD, typePlaque: "BA13 standard", typeSysteme: "Montant simple 70" },
  "s-w111-72": { eau: EAU_STD, typePlaque: "Knauf KS 13", typeSysteme: "Parement simple" },
  "s-w111-98": { eau: EAU_STD, typePlaque: "Knauf KS 13", typeSysteme: "Parement simple" },
  "s-pm7248": { eau: EAU_STD, typePlaque: "Prégyplac BA13", typeSysteme: "Parement simple" },
  "s-pm9848": { eau: EAU_STD, typePlaque: "Prégyplac BA13", typeSysteme: "Parement simple" },
  "s-pm9670": { eau: EAU_STD, typePlaque: "Prégyplac BA13", typeSysteme: "Montant simple 70" },
  "s-p10048d": { dnt: 44, separe: "Locaux d'activité", typePlaque: "BA13 standard", typeSysteme: "Double parement" },
  "s-p12270d": { dnt: 49, separe: "Sur circulation commune", typePlaque: "BA13 standard", typeSysteme: "Double parement" },
  "s-p14890d": { dnt: 54, separe: "Entre logements", typePlaque: "BA13 standard", typeSysteme: "Double parement" },
  "s-p-saa": { dnt: 60, separe: "Entre logements", typePlaque: "BA13 standard", typeSysteme: "Double ossature" },
  "s-w112-100": { dnt: 50, separe: "Locaux d'activité", typePlaque: "Knauf KS 13", typeSysteme: "Double parement" },
  "s-w112-125": { dnt: 53, separe: "Entre logements", typePlaque: "Knauf KS 13", typeSysteme: "Double parement" },
  "s-w115": { dnt: 62, separe: "Entre logements", typePlaque: "Knauf KS 13", typeSysteme: "Double ossature" },
  "s-pm12070d": { dnt: 52, separe: "Entre logements", typePlaque: "Prégyplac BA13", typeSysteme: "Double parement" },
  "s-marine98": { eau: EAU_HYDRO, typePlaque: "Placomarine hydrofuge", hygro: "Forte", choc: "Standard" },
  "s-flam122": { eau: EAU_STD, typePlaque: "Placoflam coupe-feu", hygro: "Moyenne", choc: "Standard" },
  "s-habito98": { eau: EAU_STD, typePlaque: "Habito haute dureté", hygro: "Moyenne", choc: "Fixations lourdes jusqu'à 60 kg" },
  "s-duo98": { eau: EAU_STD, typePlaque: "Placo Duo'Tech 25", hygro: "Moyenne", choc: "Standard" },
  "s-diam": { eau: EAU_STD, typePlaque: "Knauf Diamant", hygro: "Moyenne", choc: "Haute dureté superficielle" },
  "s-knhydro": { eau: EAU_HYDRO, typePlaque: "Knauf Hydro KH", hygro: "Forte", choc: "Standard" },
  "s-pregflam": { eau: EAU_STD, typePlaque: "Prégyflam coupe-feu", hygro: "Moyenne", choc: "Standard" },
  "s-pregwab": { eau: EAU_THRE, typePlaque: "Prégywab très haute résistance à l'eau", hygro: "Très forte", choc: "Standard" },
  "s-gh14890": { typeSysteme: "Double parement, entraxe resserré", typePlaque: "BA13 standard" },
  "s-gh160100": { typeSysteme: "Double parement, montants 100", typePlaque: "BA13 standard" },
  "s-gh-w115": { typeSysteme: "Double ossature 2 × 70", typePlaque: "Knauf KS 13" },
  "s-gh-pm": { typeSysteme: "Double parement, montants 90", typePlaque: "Prégyplac BA13" },
  /* contre-cloisons */
  "s-optima48": { r: 1.25, hygro: "Moyenne", reseaux: "Oui" },
  "s-cc48": { r: 1.25, hygro: "Moyenne", reseaux: "Oui" },
  "s-cc70": { r: 1.85, hygro: "Moyenne", reseaux: "Oui" },
  "s-cc-hydro": { r: 1.25, hygro: "Forte", reseaux: "Oui" },
  "s-w623": { r: 1.25, hygro: "Moyenne", reseaux: "Oui" },
  "s-cc-pm": { r: 1.25, hygro: "Moyenne", reseaux: "Oui" },
  "s-cc-dp": { r: 1.85, hygro: "Moyenne", reseaux: "Oui" },
  /* doublages collés */
  "s-pm40": { r: 1.25, epIsolant: 40, isolant: "PSE", hygro: "Moyenne", support: "Maçonnerie enduite, béton banché" },
  "s-pm80": { r: 2.55, epIsolant: 80, isolant: "PSE", hygro: "Moyenne", support: "Maçonnerie enduite, béton banché" },
  "s-pm100": { r: 3.20, epIsolant: 100, isolant: "PSE", hygro: "Moyenne", support: "Maçonnerie enduite, béton banché" },
  "s-doub80": { r: 2.90, epIsolant: 80, isolant: "PSE graphité", hygro: "Moyenne", support: "Maçonnerie enduite, béton banché" },
  "s-cal80": { r: 2.25, epIsolant: 80, isolant: "Laine minérale", hygro: "Forte", support: "Maçonnerie enduite, béton banché" },
  "s-poly80": { r: 2.55, epIsolant: 80, isolant: "PSE", hygro: "Moyenne", support: "Maçonnerie enduite, béton banché" },
  "s-pmax80": { r: 2.90, epIsolant: 80, isolant: "PSE graphité", hygro: "Moyenne", support: "Maçonnerie enduite, béton banché" },
  "s-pth100": { r: 3.20, epIsolant: 100, isolant: "PSE", hygro: "Moyenne", support: "Maçonnerie enduite, béton banché" },
  /* plafonds */
  "s-f530": { plenum: 150, portee: 1.2, support: SUP_LARGE, profiles: "Fourrure F530 sur suspente", typePlaque: "BA13 standard" },
  "s-f530dp": { plenum: 180, portee: 1.2, support: SUP_LARGE, profiles: "Fourrure F530 sur suspente", typePlaque: "BA13 double" },
  "s-f530iso": { plenum: 300, portee: 1.1, support: SUP_LARGE, profiles: "Fourrure F530 sur suspente", typePlaque: "BA13 standard", isolation: "Laine 200 mm" },
  "s-f530ei30": { plenum: 300, portee: 1.0, support: SUP_STD, profiles: "Fourrure F530 sur suspente", typePlaque: "Placoflam" },
  "s-f530ei60": { plenum: 320, portee: 0.9, support: SUP_STD, profiles: "Fourrure F530 sur suspente", typePlaque: "Placoflam double" },
  "s-d112": { plenum: 150, portee: 1.2, support: SUP_LARGE, profiles: "Fourrure Knauf CD 60", typePlaque: "Knauf KS 13" },
  "s-d112dp": { plenum: 180, portee: 1.2, support: SUP_LARGE, profiles: "Fourrure Knauf CD 60", typePlaque: "Knauf KS 13 double" },
  "s-pmplaf": { plenum: 150, portee: 1.2, support: SUP_LARGE, profiles: "Fourrure Prégymétal F530", typePlaque: "Prégyplac BA13" },
  "s-gyptone": { plenum: 200, alpha: 0.60, perfo: "Base 31 — perforations carrées 12 × 12", dimPanneau: "1200 × 2000", bords: "Amincis 4 bords", portee: 1.0 },
  "s-rigitone": { plenum: 200, alpha: 0.75, perfo: "Activ'Air 12/25 — perforations rondes", dimPanneau: "1200 × 2000", bords: "Amincis 4 bords", portee: 1.0 },
  "s-cleaneo": { plenum: 200, alpha: 0.70, perfo: "Cleaneo 8/18 — perforations rondes", dimPanneau: "1200 × 2000", bords: "Amincis 4 bords", portee: 1.0 },
  "s-pregylys": { plenum: 200, alpha: 0.65, perfo: "Prégylys 12/25 — perforations rondes", dimPanneau: "1200 × 2000", bords: "Amincis 4 bords", portee: 1.0 },
  "s-caso": { plenum: 150, alpha: 0.15, dimPanneau: "600 × 600", bords: "Bord droit sur T24", demontable: "Totale", hygro: "Moyenne" },
  "s-gyptdal": { plenum: 200, alpha: 0.60, dimPanneau: "600 × 600", bords: "Bord droit sur T24", demontable: "Totale", hygro: "Moyenne" },
  "s-danol": { plenum: 200, alpha: 0.65, dimPanneau: "600 × 600", bords: "Bord droit sur T24", demontable: "Totale", hygro: "Moyenne" },
  /* gaines et habillages */
  "s-gt9848": { eau: EAU_STD, typePlaque: "BA13 standard", feuOI: "—", feuIO: "—" },
  "s-gt-ei30": { eau: EAU_STD, typePlaque: "Placoflam", feuOI: "EI 30", feuIO: "EI 15" },
  "s-gt-ei60": { eau: EAU_STD, typePlaque: "Placoflam double", feuOI: "EI 60", feuIO: "EI 30" },
  "s-gt-kn": { eau: EAU_STD, typePlaque: "Knauf KS 13", feuOI: "—", feuIO: "—" },
  "s-gt-si": { eau: EAU_STD, typePlaque: "Prégyplac BA13", feuOI: "—", feuIO: "—" },
  /* protection de structures */
  "s-hab-pot": { classement: "R 15", support: "Poteau", faces: "4 faces", massivete: 210, tCritique: 500, typePlaque: "BA13 standard" },
  "s-hab-ei60": { classement: "R 60", support: "Profilé I / H", faces: "3 faces", massivete: 180, tCritique: 500, typePlaque: "Placoflam double" },
  /* bardage */
  "s-aqua": { support: "Ossature métallique de façade", finition: "Enduit mince", lameAir: 20, typePlaque: "Aquapanel Outdoor" },
  /* boîte dans la boîte */
  "s-bib100": { feuOI: "EI 60", feuIO: "EI 60", portee: 4.0, tete: "Libre", demontable: "Non", typePlaque: "BA13 double" },
  "s-bib125": { feuOI: "EI 60", feuIO: "EI 90", portee: 4.8, tete: "Guidée", demontable: "Non", typePlaque: "BA13 double" },
  "s-bib150": { feuOI: "EI 90", feuIO: "EI 90", portee: 5.4, tete: "Jeu sismique", demontable: "Non", typePlaque: "BA13 triple" },
};



export const DEFS = [
  /* Cloisons distributives */
  { id: "s-p7248", code: "72/48", nom: "Cloison Placostil 72/48 — BA13", m: "Placo", cat: "cd", ep: 72, dB: 35, feu: "EI 30", h: 2.6, mo: 0.48, t: "cloison", p: "pl-ba13", oss: 48, isol: "is-lm45" },
  { id: "s-p9848", code: "98/48", nom: "Cloison Placostil 98/48 — BA13", m: "Placo", cat: "cd", ep: 98, dB: 38, feu: "EI 30", h: 2.65, mo: 0.5, t: "cloison", p: "pl-ba13", oss: 48, isol: "is-lm45" },
  { id: "s-p9848ph", code: "98/48 PH", nom: "Cloison Placostil 98/48 — Placo Phonique", m: "Placo", cat: "cd", ep: 98, dB: 44, feu: "EI 30", h: 2.65, mo: 0.52, t: "cloison", p: "pl-phon", oss: 48, isol: "is-lm45" },
  { id: "s-p9670", code: "96/70", nom: "Cloison Placostil 96/70 — BA13", m: "Placo", cat: "cd", ep: 96, dB: 40, feu: "EI 30", h: 3.3, mo: 0.52, t: "cloison", p: "pl-ba13", oss: 70, isol: "is-lm70", hsp: 3.0 },
  { id: "s-w111-72", code: "W111", nom: "Knauf W111 72/48 — parement simple", m: "Knauf", cat: "cd", ep: 72, dB: 35, feu: "EI 30", h: 2.6, mo: 0.48, t: "cloison", p: "kn-ks13", oss: 48, isol: "is-lm45" },
  { id: "s-w111-98", code: "W111", nom: "Knauf W111 98/48 — parement simple", m: "Knauf", cat: "cd", ep: 98, dB: 38, feu: "EI 30", h: 2.65, mo: 0.5, t: "cloison", p: "kn-ks13", oss: 48, isol: "is-lm45" },
  { id: "s-pm7248", code: "PM 72/48", nom: "Cloison Prégymétal 72/48 — Prégyplac BA13", m: "Siniat", cat: "cd", ep: 72, dB: 35, feu: "EI 30", h: 2.6, mo: 0.48, t: "cloison", p: "si-preg13", oss: 48, isol: "is-lm45" },
  { id: "s-pm9848", code: "PM 98/48", nom: "Cloison Prégymétal 98/48 — Prégyplac BA13", m: "Siniat", cat: "cd", ep: 98, dB: 41, feu: "EI 30", h: 2.65, mo: 0.5, t: "cloison", p: "si-preg13", oss: 48, isol: "is-lm45" },
  { id: "s-pm9670", code: "PM 96/70", nom: "Cloison Prégymétal 96/70 — Prégyplac BA13", m: "Siniat", cat: "cd", ep: 96, dB: 40, feu: "EI 30", h: 3.3, mo: 0.52, t: "cloison", p: "si-preg13", oss: 70, isol: "is-lm70", hsp: 3.0 },
  /* Cloisons séparatives */
  { id: "s-p10048d", code: "100/48 DP", nom: "Cloison Placostil 100/48 — double parement BA13", m: "Placo", cat: "cs", ep: 100, dB: 47, feu: "EI 60", h: 3.05, mo: 0.78, t: "cloison", p: "pl-ba13", n: 2, oss: 48, isol: "is-lm45" },
  { id: "s-p12270d", code: "122/70 DP", nom: "Cloison Placostil 122/70 — double parement BA13", m: "Placo", cat: "cs", ep: 122, dB: 52, feu: "EI 60", h: 4.2, mo: 0.85, t: "cloison", p: "pl-ba13", n: 2, oss: 70, isol: "is-lm70", hsp: 3.0 },
  { id: "s-p14890d", code: "148/90 DP", nom: "Cloison Placostil 148/90 — double parement BA13", m: "Placo", cat: "cs", ep: 148, dB: 57, feu: "EI 60", h: 5.1, mo: 0.9, t: "cloison", p: "pl-ba13", n: 2, oss: 90, isol: "is-lm100", hsp: 3.5 },
  { id: "s-p-saa", code: "SAA 2×98", nom: "Séparatif logements — 2 × Placostil 98/48 désolidarisés", m: "Placo", cat: "cs", ep: 200, dB: 63, feu: "EI 60", h: 2.65, mo: 1.05, t: "cloison", p: "pl-ba13", n: 2, oss: 48, dbl: true, isol: "is-lm45" },
  { id: "s-w112-100", code: "W112", nom: "Knauf W112 100/50 — double parement", m: "Knauf", cat: "cs", ep: 100, dB: 53, feu: "EI 60", h: 4.0, mo: 0.8, t: "cloison", p: "kn-ks13", n: 2, oss: 48, isol: "is-lm45" },
  { id: "s-w112-125", code: "W112", nom: "Knauf W112 125/75 — double parement", m: "Knauf", cat: "cs", ep: 125, dB: 56, feu: "EI 60", h: 4.5, mo: 0.85, t: "cloison", p: "kn-ks13", n: 2, oss: 70, isol: "is-lm70", hsp: 3.0 },
  { id: "s-w115", code: "W115", nom: "Knauf W115 155/2×50 — double ossature", m: "Knauf", cat: "cs", ep: 155, dB: 65, feu: "EI 90", h: 5.0, mo: 1.1, t: "cloison", p: "kn-ks13", n: 2, oss: 48, dbl: true, isol: "is-lm45", hsp: 3.5 },
  { id: "s-pm12070d", code: "PM 120/70", nom: "Cloison Prégymétal 120/70 — double parement", m: "Siniat", cat: "cs", ep: 120, dB: 55, feu: "EI 60", h: 4.2, mo: 0.85, t: "cloison", p: "si-preg13", n: 2, oss: 70, isol: "is-lm70", hsp: 3.0 },
  /* Cloisons spéciales */
  { id: "s-marine98", code: "98/48 H", nom: "Cloison locaux humides — Placomarine 98/48", m: "Placo", cat: "csp", ep: 98, dB: 38, feu: "EI 30", h: 2.65, mo: 0.55, t: "cloison", p: "pl-hydro", oss: 48, isol: "is-lm45", entraxe: 0.4 },
  { id: "s-flam122", code: "122/70 EI90", nom: "Cloison coupe-feu EI 90 — Placoflam double parement", m: "Placo", cat: "csp", ep: 122, dB: 52, feu: "EI 90", h: 4.2, mo: 0.9, t: "cloison", p: "pl-feu", n: 2, oss: 70, isol: "is-lm70", hsp: 3.0 },
  { id: "s-habito98", code: "98/48 HAB", nom: "Cloison résistance aux chocs — Habito 98/48", m: "Placo", cat: "csp", ep: 98, dB: 42, feu: "EI 30", h: 3.0, mo: 0.55, t: "cloison", p: "pl-habito", oss: 48, isol: "is-lm45" },
  { id: "s-duo98", code: "98/48 DUO", nom: "Cloison acoustique renforcée — Placo Duo'Tech 25", m: "Placo", cat: "csp", ep: 120, dB: 51, feu: "EI 60", h: 3.0, mo: 0.65, t: "cloison", p: "pl-duo", oss: 48, isol: "is-lm45" },
  { id: "s-diam", code: "W112 D", nom: "Knauf Diamant W112 100/50 — haute dureté", m: "Knauf", cat: "csp", ep: 100, dB: 57, feu: "EI 60", h: 4.0, mo: 0.85, t: "cloison", p: "kn-diam", n: 2, oss: 48, isol: "is-lm45" },
  { id: "s-knhydro", code: "W111 H", nom: "Knauf Hydro W111 98/48 — locaux humides", m: "Knauf", cat: "csp", ep: 98, dB: 38, feu: "EI 30", h: 2.65, mo: 0.55, t: "cloison", p: "kn-hydro", oss: 48, isol: "is-lm45", entraxe: 0.4 },
  { id: "s-pregflam", code: "PM 98 EI60", nom: "Cloison coupe-feu EI 60 — Prégyflam 98/48", m: "Siniat", cat: "csp", ep: 98, dB: 40, feu: "EI 60", h: 2.65, mo: 0.58, t: "cloison", p: "si-flam", oss: 48, isol: "is-lm45" },
  { id: "s-pregwab", code: "PM 98 THRE", nom: "Cloison douches collectives — Prégywab 98/48", m: "Siniat", cat: "csp", ep: 98, dB: 38, feu: "EI 30", h: 2.65, mo: 0.62, t: "cloison", p: "si-wab", oss: 48, isol: "is-lm45", entraxe: 0.4 },
  /* Grande hauteur */
  { id: "s-gh14890", code: "GH 148/90", nom: "Cloison grande hauteur Placostil 148/90 — double parement", m: "Placo", cat: "cgh", ep: 148, dB: 57, feu: "EI 60", h: 6.0, mo: 1.0, t: "cloison", p: "pl-ba13", n: 2, oss: 90, isol: "is-lm100", entraxe: 0.4, hsp: 5.0 },
  { id: "s-gh160100", code: "GH 160/100", nom: "Cloison grande hauteur Placostil 160/100 — double parement", m: "Placo", cat: "cgh", ep: 160, dB: 58, feu: "EI 90", h: 7.0, mo: 1.15, t: "cloison", p: "pl-ba13", n: 2, oss: 100, isol: "is-lm120", entraxe: 0.4, hsp: 6.0 },
  { id: "s-gh-w115", code: "W115 GH", nom: "Knauf W115 200/2×70 — double ossature grande hauteur", m: "Knauf", cat: "cgh", ep: 200, dB: 67, feu: "EI 90", h: 8.0, mo: 1.3, t: "cloison", p: "kn-ks13", n: 2, oss: 70, dbl: true, isol: "is-lm70", entraxe: 0.4, hsp: 6.0 },
  { id: "s-gh-pm", code: "PM GH 160/90", nom: "Cloison grande hauteur Prégymétal 160/90", m: "Siniat", cat: "cgh", ep: 160, dB: 57, feu: "EI 60", h: 6.5, mo: 1.05, t: "cloison", p: "si-preg13", n: 2, oss: 90, isol: "is-lm100", entraxe: 0.4, hsp: 5.0 },
  /* Contre-cloisons */
  { id: "s-optima48", code: "OPT 48", nom: "Contre-cloison Optima Murs 48 + laine 45", m: "Placo", cat: "cc", ep: 63, dB: 0, feu: "—", h: 2.7, mo: 0.55, t: "contre", p: "pl-ba13", oss: 48, isol: "is-lm45", optima: true },
  { id: "s-cc48", code: "CC 48", nom: "Contre-cloison Placostil 48 + laine 45", m: "Placo", cat: "cc", ep: 63, dB: 0, feu: "—", h: 2.7, mo: 0.55, t: "contre", p: "pl-ba13", oss: 48, isol: "is-lm45" },
  { id: "s-cc70", code: "CC 70", nom: "Contre-cloison Placostil 70 + laine 70", m: "Placo", cat: "cc", ep: 85, dB: 0, feu: "—", h: 3.3, mo: 0.58, t: "contre", p: "pl-ba13", oss: 70, isol: "is-lm70", hsp: 3.0 },
  { id: "s-cc-hydro", code: "CC 48 H", nom: "Contre-cloison locaux humides — Placomarine 48", m: "Placo", cat: "cc", ep: 63, dB: 0, feu: "—", h: 2.7, mo: 0.6, t: "contre", p: "pl-hydro", oss: 48, isol: "is-lm45", entraxe: 0.4 },
  { id: "s-w623", code: "W623", nom: "Knauf W623 contre-cloison 48 + laine 45", m: "Knauf", cat: "cc", ep: 63, dB: 0, feu: "—", h: 2.7, mo: 0.55, t: "contre", p: "kn-ks13", oss: 48, isol: "is-lm45" },
  { id: "s-cc-pm", code: "PM CC 48", nom: "Contre-cloison Prégymétal 48 + laine 45", m: "Siniat", cat: "cc", ep: 63, dB: 0, feu: "—", h: 2.7, mo: 0.55, t: "contre", p: "si-preg13", oss: 48, isol: "is-lm45" },
  { id: "s-cc-dp", code: "CC 70 DP", nom: "Contre-cloison 70 double parement + laine 70", m: "Placo", cat: "cc", ep: 98, dB: 0, feu: "EI 60", h: 3.3, mo: 0.8, t: "contre", p: "pl-ba13", n: 2, oss: 70, isol: "is-lm70", hsp: 3.0 },
  /* Doublages collés */
  { id: "s-pm40", code: "PMur 13+40", nom: "Doublage collé Placomur 13 + 40", m: "Placo", cat: "dc", ep: 53, dB: 0, feu: "—", h: 2.7, mo: 0.33, t: "colle", cx: "cx-pm40" },
  { id: "s-pm80", code: "PMur 13+80", nom: "Doublage collé Placomur 13 + 80", m: "Placo", cat: "dc", ep: 93, dB: 0, feu: "—", h: 2.7, mo: 0.35, t: "colle", cx: "cx-pm80" },
  { id: "s-pm100", code: "PMur 13+100", nom: "Doublage collé Placomur 13 + 100", m: "Placo", cat: "dc", ep: 113, dB: 0, feu: "—", h: 2.7, mo: 0.37, t: "colle", cx: "cx-pm100" },
  { id: "s-doub80", code: "DBS 13+80", nom: "Doublage collé Doublissimo 13 + 80", m: "Placo", cat: "dc", ep: 93, dB: 0, feu: "—", h: 2.7, mo: 0.35, t: "colle", cx: "cx-doub80" },
  { id: "s-cal80", code: "CAL 13+80", nom: "Doublage collé Calibel 13 + 80 (laine)", m: "Placo", cat: "dc", ep: 93, dB: 0, feu: "—", h: 2.7, mo: 0.38, t: "colle", cx: "cx-cal80" },
  { id: "s-poly80", code: "PLP 13+80", nom: "Doublage collé Polyplac E 13 + 80", m: "Knauf", cat: "dc", ep: 93, dB: 0, feu: "—", h: 2.7, mo: 0.35, t: "colle", cx: "cx-poly80" },
  { id: "s-pmax80", code: "PMAX 13+80", nom: "Doublage collé Prégymax 13 + 80", m: "Siniat", cat: "dc", ep: 93, dB: 0, feu: "—", h: 2.7, mo: 0.35, t: "colle", cx: "cx-pmax80" },
  { id: "s-pth100", code: "PTH 13+100", nom: "Doublage collé Prégytherm 13 + 100", m: "Siniat", cat: "dc", ep: 113, dB: 0, feu: "—", h: 2.7, mo: 0.37, t: "colle", cx: "cx-pth100" },
  /* Plafonds */
  { id: "s-f530", code: "F530", nom: "Plafond Placostil F530 — BA13 sur suspentes", m: "Placo", cat: "pnd", ep: 0, dB: 0, feu: "—", h: 0, mo: 0.75, t: "plafond", p: "pl-ba13" },
  { id: "s-f530dp", code: "F530 DP", nom: "Plafond Placostil F530 — double parement BA13", m: "Placo", cat: "pnd", ep: 0, dB: 0, feu: "EI 30", h: 0, mo: 1.05, t: "plafond", p: "pl-ba13", n: 2 },
  { id: "s-f530iso", code: "F530 ISO", nom: "Plafond Placostil F530 — BA13 + laine 200", m: "Placo", cat: "pnd", ep: 0, dB: 0, feu: "—", h: 0, mo: 0.85, t: "plafond", p: "pl-ba13", isol: "is-lm200" },
  { id: "s-f530ei30", code: "F530 EI30", nom: "Plafond coupe-feu EI 30 — Placoflam BA13", m: "Placo", cat: "pnd", ep: 0, dB: 0, feu: "EI 30", h: 0, mo: 0.85, t: "plafond", p: "pl-feu", isol: "is-lm200" },
  { id: "s-f530ei60", code: "F530 EI60", nom: "Plafond coupe-feu EI 60 — 2 × Placoflam BA13", m: "Placo", cat: "pnd", ep: 0, dB: 0, feu: "EI 60", h: 0, mo: 1.15, t: "plafond", p: "pl-feu", n: 2, isol: "is-lm200" },
  { id: "s-d112", code: "D112", nom: "Knauf D112 — plafond sur fourrures, plaque KS 13", m: "Knauf", cat: "pnd", ep: 0, dB: 0, feu: "—", h: 0, mo: 0.75, t: "plafond", p: "kn-ks13" },
  { id: "s-d112dp", code: "D112 DP", nom: "Knauf D112 — double parement KS 13", m: "Knauf", cat: "pnd", ep: 0, dB: 0, feu: "EI 30", h: 0, mo: 1.05, t: "plafond", p: "kn-ks13", n: 2 },
  { id: "s-pmplaf", code: "PM F530", nom: "Plafond Prégymétal F530 — Prégyplac BA13", m: "Siniat", cat: "pnd", ep: 0, dB: 0, feu: "—", h: 0, mo: 0.75, t: "plafond", p: "si-preg13" },
  { id: "s-gyptone", code: "GYP B31", nom: "Plafond acoustique Gyptone Base 31 sur fourrures", m: "Placo", cat: "pand", ep: 0, dB: 0, feu: "—", h: 0, mo: 1.1, t: "plafond", p: "pl-gyptone", isol: "is-lm45" },
  { id: "s-rigitone", code: "RIG 12/25", nom: "Plafond acoustique Rigitone Activ'Air 12/25", m: "Placo", cat: "pand", ep: 0, dB: 0, feu: "—", h: 0, mo: 1.25, t: "plafond", p: "pl-rigitone", isol: "is-lm45" },
  { id: "s-cleaneo", code: "CLEANEO", nom: "Plafond acoustique Knauf Cleaneo Akustik", m: "Knauf", cat: "pand", ep: 0, dB: 0, feu: "—", h: 0, mo: 1.2, t: "plafond", p: "kn-cleaneo", isol: "is-lm45" },
  { id: "s-pregylys", code: "PRÉGYLYS", nom: "Plafond acoustique Prégylys perforé", m: "Siniat", cat: "pand", ep: 0, dB: 0, feu: "—", h: 0, mo: 1.15, t: "plafond", p: "si-lys", isol: "is-lm45" },
  { id: "s-caso", code: "CASO 600", nom: "Plafond démontable Casoprano Casostar 600 × 600 — T24", m: "Siniat", cat: "pd", ep: 0, dB: 0, feu: "—", h: 0, mo: 0.55, t: "demont", p: "dl-caso" },
  { id: "s-gyptdal", code: "GYP 600", nom: "Plafond démontable Gyptone Base 600 × 600 — T24", m: "Placo", cat: "pd", ep: 0, dB: 0, feu: "—", h: 0, mo: 0.6, t: "demont", p: "dl-gypt", isol: "is-lm45" },
  { id: "s-danol", code: "DANO 600", nom: "Plafond démontable Knauf Danoline 600 × 600 — T24", m: "Knauf", cat: "pd", ep: 0, dB: 0, feu: "—", h: 0, mo: 0.6, t: "demont", p: "dl-danol", isol: "is-lm45" },
  /* Gaines et habillages */
  { id: "s-gt9848", code: "GT 98/48", nom: "Gaine technique 98/48 — BA13 une face", m: "Placo", cat: "gt", ep: 61, dB: 30, feu: "—", h: 2.6, mo: 0.45, t: "gaine", p: "pl-ba13", oss: 48 },
  { id: "s-gt-ei30", code: "GT EI30", nom: "Gaine technique EI 30 — Placoflam une face", m: "Placo", cat: "gt", ep: 61, dB: 30, feu: "EI 30", h: 2.6, mo: 0.5, t: "gaine", p: "pl-feu", oss: 48 },
  { id: "s-gt-ei60", code: "GT EI60", nom: "Gaine technique EI 60 — 2 × Placoflam une face", m: "Placo", cat: "gt", ep: 74, dB: 33, feu: "EI 60", h: 2.6, mo: 0.75, t: "gaine", p: "pl-feu", n: 2, oss: 48 },
  { id: "s-gt-kn", code: "GT W111", nom: "Gaine technique Knauf 98/48 — KS 13 une face", m: "Knauf", cat: "gt", ep: 61, dB: 30, feu: "—", h: 2.6, mo: 0.45, t: "gaine", p: "kn-ks13", oss: 48 },
  { id: "s-gt-si", code: "GT PM 98", nom: "Gaine technique Prégymétal 98/48 — une face", m: "Siniat", cat: "gt", ep: 61, dB: 30, feu: "—", h: 2.6, mo: 0.45, t: "gaine", p: "si-preg13", oss: 48 },
  { id: "s-hab-pot", code: "HAB POT", nom: "Habillage de poteau / poutre — BA13", m: "Placo", cat: "ps", ep: 0, dB: 0, feu: "—", h: 0, mo: 0.95, t: "habillage", p: "pl-ba13", oss: 48 },
  { id: "s-hab-ei60", code: "HAB EI60", nom: "Habillage structure EI 60 — 2 × Placoflam", m: "Placo", cat: "ps", ep: 0, dB: 0, feu: "EI 60", h: 0, mo: 1.35, t: "habillage", p: "pl-feu", n: 2, oss: 48 },
  /* Boîte dans la boîte */
  { id: "s-bib100", code: "BIB 100", nom: "Boîte dans la boîte — montants 100, parement double", m: "Placo", cat: "bib", ep: 150, dB: 55, feu: "EI 60", h: 4.4, mo: 1.45, t: "bib", p: "pl-ba13", n: 2, oss: 100, isol: "is-lm100", portee: 4.0 },
  { id: "s-bib125", code: "BIB 125", nom: "Boîte dans la boîte — montants 125, parement double", m: "Placo", cat: "bib", ep: 175, dB: 58, feu: "EI 60", h: 5.1, mo: 1.55, t: "bib", p: "pl-ba13", n: 2, oss: 125, isol: "is-lm120", portee: 4.8 },
  { id: "s-bib150", code: "BIB 150", nom: "Boîte dans la boîte — montants 150, parement triple", m: "Placo", cat: "bib", ep: 225, dB: 62, feu: "EI 90", h: 5.7, mo: 1.75, t: "bib", p: "pl-ba13", n: 3, oss: 150, isol: "is-lm120", portee: 5.4 },
  { id: "s-aqua", code: "AQUA OUT", nom: "Bardage Aquapanel Outdoor sur ossature", m: "Knauf", cat: "bar", ep: 0, dB: 0, feu: "—", h: 0, mo: 1.1, t: "habillage", p: "kn-aqua", oss: 70 },
];


/* ------------------------------------------------------------------ */
/*  Hauteurs limites                                                    */
/* ------------------------------------------------------------------ */

/* Hauteurs limites en m, indexées profil × nombre de parements par face × entraxe.
   Cloisons distributives, plaques 12,5 mm, flèche admissible 1/240 sous 20 daN/m².
   VALEURS D'AMORÇAGE : chaque ligne doit être recalée sur le mémento du fabricant
   avant usage en chiffrage. Tant qu'elle ne l'est pas, le système reste verif: true. */
export const HAUTEURS_LIMITES = {
  48:  { 1: { 0.6: 2.50, 0.4: 2.85 }, 2: { 0.6: 2.85, 0.4: 3.25 }, 3: { 0.6: 3.05, 0.4: 3.45 } },
  70:  { 1: { 0.6: 3.30, 0.4: 3.75 }, 2: { 0.6: 3.85, 0.4: 4.40 }, 3: { 0.6: 4.10, 0.4: 4.65 } },
  90:  { 1: { 0.6: 4.05, 0.4: 4.60 }, 2: { 0.6: 4.70, 0.4: 5.35 }, 3: { 0.6: 5.00, 0.4: 5.65 } },
  100: { 1: { 0.6: 4.40, 0.4: 5.00 }, 2: { 0.6: 5.05, 0.4: 5.75 }, 3: { 0.6: 5.35, 0.4: 6.10 } },
  125: { 1: { 0.6: 5.10, 0.4: 5.80 }, 2: { 0.6: 5.90, 0.4: 6.70 }, 3: { 0.6: 6.25, 0.4: 7.10 } },
  150: { 1: { 0.6: 5.75, 0.4: 6.55 }, 2: { 0.6: 6.65, 0.4: 7.55 }, 3: { 0.6: 7.05, 0.4: 8.00 } },
};

/* Deux ossatures reprennent la charge en parallèle. À confirmer au cas par cas. */
export const MAJORATION_DOUBLE_OSSATURE = 1.15;

/* Moment quadratique des montants en mm⁴, pour l'interpolation par la flèche */
export const INERTIE_MONTANT = { 48: 3.9e4, 70: 9.6e4, 90: 1.72e5, 100: 2.25e5, 125: 3.75e5, 150: 5.70e5 };
export const E_ACIER = 210000;          /* MPa */
export const CHARGE_COURANTE = 0.0002;  /* N/mm², soit 20 daN/m² */
export const FLECHE_ADMISSIBLE = 240;   /* h / 240 */

/* Interpolation par le modèle de flèche qui fonde les tables : montant assimilé
   à une poutre sur deux appuis sous charge horizontale répartie.
   Ne remplace jamais une valeur publiée, sert seulement entre deux entraxes tabulés. */
export function hauteurParFleche(profil, entraxe, charge = CHARGE_COURANTE, nFleche = FLECHE_ADMISSIBLE) {
  const I = INERTIE_MONTANT[profil];
  if (!I || !entraxe) return 0;
  const h = Math.cbrt((384 * E_ACIER * I) / (5 * nFleche * charge * entraxe * 1000));
  return Math.round((h / 1000) * 100) / 100;
}

/* Hauteurs limites d'un système : { "0.6": h, "0.4": h, source }.
   Une valeur publiée par le fabricant ancre la famille : les autres entraxes en
   sont déduits par le rapport de la table, jamais par une valeur absolue qui la
   contredirait. Un resserrement d'entraxe ne peut pas réduire la hauteur admise. */
export function hauteursSysteme(sys) {
  const saisie = (sys.carac && sys.carac.hauteurs) || {};
  const profil = (sys.coupe && sys.coupe.oss) || 48;
  const parements = Math.min(3, Math.max(1, (sys.coupe && sys.coupe.pA) || 1));
  const table = HAUTEURS_LIMITES[profil]?.[parements];
  const maj = sys.coupe && sys.coupe.dbl ? MAJORATION_DOUBLE_OSSATURE : 1;

  /* ancrage sur la valeur publiée, s'il y en a une qui corresponde à un entraxe tabulé */
  let ancre = 1;
  const eAncre = ENTRAXES.find((e) => saisie[String(e)] > 0 && table && table[e]);
  if (eAncre) ancre = saisie[String(eAncre)] / (table[eAncre] * maj);

  const out = {};
  let source = eAncre ? "catalogue" : "table";
  ENTRAXES.forEach((e) => {
    const k = String(e);
    if (saisie[k] > 0) { out[k] = saisie[k]; return; }
    if (table && table[e]) { out[k] = Math.round(table[e] * maj * ancre * 100) / 100; return; }
    const calc = hauteurParFleche(profil, e);
    if (calc > 0) { out[k] = Math.round(calc * maj * 100) / 100; source = "calcul"; }
  });
  if (ENTRAXES.every((e) => saisie[String(e)] > 0)) source = "saisie";
  return { ...out, source };
}

/* Priorité : valeur saisie, puis table fabricant, puis calcul de flèche */
export const hauteurMax = (sys, entraxe) => {
  const h = hauteursSysteme(sys);
  const cle = String(entraxe ?? sys.entraxe ?? 0.6);
  return h[cle] ?? h[String(sys.entraxe ?? 0.6)] ?? sys.hmax ?? 0;
};

export function buildSysteme(d) {
  const unFace = ["contre", "colle", "gaine", "habillage", "plafond", "demont"].includes(d.t);
  return {
    id: d.id, code: d.code, nom: d.nom, marque: d.m, cat: d.cat, type: d.t,
    unite: d.u || "m²", ep: d.ep || 0, dB: d.dB || 0, feu: d.feu || "—",
    hmax: d.h || 0, mo: d.mo, repart: null, notes: d.note || "", verif: true,
    carac: { hauteurs: d.h ? { [String(d.entraxe || 0.6)]: d.h } : {}, ...(CARAC_SYS[d.id] || {}), ...(d.carac || {}) },
    entraxe: d.entraxe || (["plafond"].includes(d.t) ? 0.5 : 0.6),
    hsp: d.hsp || HSP_REF,
    materiel: MATERIEL_DEF[d.t] || 0.3,
    dechetsSup: 0.15,
    perteDef: PERTE_DEF[d.t] ?? 8,
    coupe: {
      pA: d.n || 1, pB: unFace ? 0 : (d.n || 1),
      oss: d.t === "colle" ? Math.max(40, (d.ep || 93) - 13) : (d.oss || 60),
      isol: !!d.isol || d.t === "colle", dbl: !!d.dbl,
    },
    lignes: BUILDERS[d.t](d).map((l) => ({
      ...l,
      perte: null,   /* hérité : PERTE_ART s'il existe, sinon sys.perteDef */
    })),
  };
}


export const SEED_SYSTEMES = DEFS.map(buildSysteme);
