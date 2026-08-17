import { CLASSES_EAU, CLASSE_EAU_MAP, ENTRAXES, FAMILLE_MAP } from "./referentiel.js";
import { hauteurMax } from "./systemes.js";
import { coutSysteme, feuEnNombre } from "./moteur.js";
import { nf, eur } from "./format.js";

/* ------------------------------------------------------------------ */
/*  Facettes et colonnes de la bibliothèque                            */
/*  Une facette sait extraire sa valeur d'un système et dire si ce     */
/*  système satisfait une sélection. Les compteurs en découlent.       */
/* ------------------------------------------------------------------ */

export const NIVEAUX_FEU = ["—", "EI 15", "EI 30", "EI 45", "EI 60", "EI 90", "EI 120"];
export const PALIERS_DB = [
  { id: "d0", lab: "< 35", min: 0, max: 34.99 },
  { id: "d1", lab: "35 – 39", min: 35, max: 39.99 },
  { id: "d2", lab: "40 – 44", min: 40, max: 44.99 },
  { id: "d3", lab: "45 – 49", min: 45, max: 49.99 },
  { id: "d4", lab: "50 – 54", min: 50, max: 54.99 },
  { id: "d5", lab: "55 – 59", min: 55, max: 59.99 },
  { id: "d6", lab: "≥ 60", min: 60, max: 999 },
];

/* Facettes transversales, présentes dans toutes les familles */
const transversales = [
  { id: "cat", lab: "Sous-catégorie", type: "liste", val: (s) => s.cat },
  { id: "marque", lab: "Marque", type: "multi", val: (s) => s.marque },
  { id: "feu", lab: "Résistance au feu", type: "multi", val: (s) => (s.feu && s.feu !== "—" ? s.feu : "—"), ordre: NIVEAUX_FEU },
  { id: "typePlaque", lab: "Type de plaque", type: "multi", val: (s) => s.carac?.typePlaque || null },
  { id: "eau", lab: "Exposition à l'eau", type: "multi", tableau: true, val: (s) => s.carac?.eau || null,
    fmt: (v) => CLASSE_EAU_MAP[v]?.lab || v, aide: (v) => CLASSE_EAU_MAP[v]?.desc || "",
    ordre: CLASSES_EAU.map((c) => c.id) },
  { id: "verif", lab: "Statut", type: "multi", val: (s) => (s.verif ? "à vérifier" : "validé") },
];

/* Facettes propres à chaque famille, dans l'ordre de priorité du métier */
const parFamille = {
  cloisons: [
    { id: "db", lab: "Affaiblissement", type: "paliers", paliers: PALIERS_DB, val: (s) => s.carac?.dnt || s.dB || 0 },
    { id: "hauteur", lab: "Hauteur nécessaire", type: "seuil", unite: "m", pas: 0.05,
      val: (s, ctx) => hauteurMax(s, ctx?.entraxe) },
    { id: "oss", lab: "Largeur de montant", type: "multi", val: (s) => s.coupe?.oss || null, fmt: (v) => `${v} mm`,
      tri: (a, b) => Number(a) - Number(b) },
    { id: "parements", lab: "Parements par face", type: "multi", val: (s) => s.coupe?.pA || 1,
      fmt: (v) => ({ 1: "Simple", 2: "Double", 3: "Triple" }[v] || v) },
    { id: "dbl", lab: "Ossature", type: "multi", val: (s) => (s.coupe?.dbl ? "Double" : "Simple") },
    { id: "isol", lab: "Isolant", type: "multi", val: (s) => (s.coupe?.isol ? "Avec isolant" : "Sans isolant") },
    { id: "separe", lab: "Nature du séparatif", type: "multi", val: (s) => s.carac?.separe || null },
    { id: "choc", lab: "Résistance aux chocs", type: "multi", val: (s) => s.carac?.choc || null },
    { id: "hygro", lab: "Classe d'hygrométrie", type: "multi", val: (s) => s.carac?.hygro || null },
  ],
  contre: [
    { id: "r", lab: "Résistance thermique mini", type: "seuil", unite: "m²·K/W", pas: 0.05, val: (s) => s.carac?.r || 0 },
    { id: "liaison", lab: "Mode de liaison", type: "multi",
      val: (s) => (s.type === "colle" ? "Collé au MAP" : s.carac?.optima ? "Appuis Optima" : "Sur ossature") },
    { id: "isolant", lab: "Nature de l'isolant", type: "multi", val: (s) => s.carac?.isolant || null },
    { id: "epIsolant", lab: "Épaisseur d'isolant", type: "multi", val: (s) => s.carac?.epIsolant || null, fmt: (v) => `${v} mm`,
      tri: (a, b) => Number(a) - Number(b) },
    { id: "hauteur", lab: "Hauteur nécessaire", type: "seuil", unite: "m", pas: 0.05, val: (s, ctx) => hauteurMax(s, ctx?.entraxe) },
    { id: "reseaux", lab: "Passage de réseaux", type: "multi", val: (s) => s.carac?.reseaux || null },
    { id: "hygro", lab: "Classe d'hygrométrie", type: "multi", val: (s) => s.carac?.hygro || null },
  ],
  plafonds: [
    { id: "portee", lab: "Portée nécessaire", type: "seuil", unite: "m", pas: 0.05, val: (s) => s.carac?.portee || 0 },
    { id: "alpha", lab: "Absorption αw mini", type: "seuil", unite: "", pas: 0.05, val: (s) => s.carac?.alpha || 0 },
    { id: "plenum", lab: "Plénum disponible", type: "seuil", unite: "mm", pas: 10, val: (s) => s.carac?.plenum || 0 },
    { id: "support", lab: "Support de fixation", type: "multi", tableau: true, val: (s) => s.carac?.support || null },
    { id: "demont", lab: "Démontabilité", type: "multi",
      val: (s) => (s.cat === "pd" ? "Démontable" : s.carac?.demontable === "Partielle" ? "Partielle" : "Non démontable") },
    { id: "bords", lab: "Type de bords", type: "multi", val: (s) => s.carac?.bords || null },
  ],
  protection: [
    { id: "classement", lab: "Classement de protection", type: "multi", val: (s) => s.carac?.classement || null },
    { id: "support", lab: "Élément protégé", type: "multi", val: (s) => s.carac?.support || null },
    { id: "faces", lab: "Faces protégées", type: "multi", val: (s) => s.carac?.faces || null },
  ],
  gaines: [
    { id: "feuOI", lab: "Feu extérieur → intérieur", type: "multi", val: (s) => s.carac?.feuOI || null, ordre: NIVEAUX_FEU },
    { id: "feuIO", lab: "Feu intérieur → extérieur", type: "multi", val: (s) => s.carac?.feuIO || null, ordre: NIVEAUX_FEU },
    { id: "hauteur", lab: "Hauteur nécessaire", type: "seuil", unite: "m", pas: 0.05, val: (s, ctx) => hauteurMax(s, ctx?.entraxe) },
  ],
  bib: [
    { id: "feuOI", lab: "Feu extérieur → intérieur", type: "multi", val: (s) => s.carac?.feuOI || null, ordre: NIVEAUX_FEU },
    { id: "feuIO", lab: "Feu intérieur → extérieur", type: "multi", val: (s) => s.carac?.feuIO || null, ordre: NIVEAUX_FEU },
    { id: "hauteur", lab: "Hauteur nécessaire", type: "seuil", unite: "m", pas: 0.05, val: (s, ctx) => hauteurMax(s, ctx?.entraxe) },
    { id: "portee", lab: "Portée de plafond nécessaire", type: "seuil", unite: "m", pas: 0.1, val: (s) => s.carac?.portee || 0 },
    { id: "tete", lab: "Liaison en tête", type: "multi", val: (s) => s.carac?.tete || null },
  ],
  bardages: [
    { id: "finition", lab: "Finition", type: "multi", val: (s) => s.carac?.finition || null },
    { id: "lameAir", lab: "Lame d'air mini", type: "seuil", unite: "mm", pas: 5, val: (s) => s.carac?.lameAir || 0 },
  ],
};

/* Facettes numériques communes, placées en fin de panneau */
const finales = [
  { id: "ep", lab: "Épaisseur totale", type: "plage", unite: "mm", pas: 5, val: (s) => s.ep || 0 },
  { id: "ds", lab: "Déboursé sec", type: "plage", unite: "€", pas: 1, val: (s, ctx) => coutSysteme(s, ctx.artMap, ctx.params).ds },
];

export const facettesDe = (famille) => [...transversales, ...(parFamille[famille] || []), ...finales];

/* Colonnes du tableau de résultats, par famille.
   Le déboursé et le prix de vente closent toutes les familles : c'est ce qui
   distingue cet outil d'un catalogue fabricant. */
const COLONNES = {
  cloisons: [
    { id: "ep", lab: "Épaisseur", num: true, val: (s) => s.ep, aff: (s) => (s.ep ? `${s.ep} mm` : "—") },
    { id: "feu", lab: "Feu", val: (s) => feuEnNombre(s.feu), aff: (s) => s.feu || "—", badge: true },
    { id: "db", lab: "Rw + C", num: true, val: (s) => s.carac?.dnt || s.dB || 0, aff: (s) => ((s.carac?.dnt || s.dB) ? `${nf(s.carac?.dnt || s.dB, 0)} dB` : "—") },
    { id: "h", lab: "Hauteur max", num: true, val: (s, c) => hauteurMax(s, c?.entraxe), aff: (s, c) => (hauteurMax(s, c?.entraxe) ? `${nf(hauteurMax(s, c?.entraxe), 2)} m` : "—") },
  ],
  contre: [
    { id: "ep", lab: "Épaisseur", num: true, val: (s) => s.ep, aff: (s) => (s.ep ? `${s.ep} mm` : "—") },
    { id: "r", lab: "R thermique", num: true, val: (s) => s.carac?.r || 0, aff: (s) => (s.carac?.r ? `${nf(s.carac.r, 2)} m²·K/W` : "—") },
    { id: "feu", lab: "Feu", val: (s) => feuEnNombre(s.feu), aff: (s) => s.feu || "—", badge: true },
    { id: "h", lab: "Hauteur max", num: true, val: (s, c) => hauteurMax(s, c?.entraxe), aff: (s, c) => (hauteurMax(s, c?.entraxe) ? `${nf(hauteurMax(s, c?.entraxe), 2)} m` : "—") },
  ],
  plafonds: [
    { id: "feu", lab: "Feu", val: (s) => feuEnNombre(s.feu), aff: (s) => s.feu || "—", badge: true },
    { id: "portee", lab: "Portée max", num: true, val: (s) => s.carac?.portee || 0, aff: (s) => (s.carac?.portee ? `${nf(s.carac.portee, 2)} m` : "—") },
    { id: "alpha", lab: "αw", num: true, val: (s) => s.carac?.alpha || 0, aff: (s) => (s.carac?.alpha ? nf(s.carac.alpha, 2) : "—") },
    { id: "plenum", lab: "Plénum", num: true, val: (s) => s.carac?.plenum || 0, aff: (s) => (s.carac?.plenum ? `${nf(s.carac.plenum, 0)} mm` : "—") },
  ],
  protection: [
    { id: "classement", lab: "Classement", val: (s) => s.carac?.classement || "", aff: (s) => s.carac?.classement || "—" },
    { id: "feu", lab: "Feu", val: (s) => feuEnNombre(s.feu), aff: (s) => s.feu || "—", badge: true },
    { id: "support", lab: "Élément protégé", val: (s) => s.carac?.support || "", aff: (s) => s.carac?.support || "—" },
  ],
  gaines: [
    { id: "h", lab: "Hauteur max", num: true, val: (s, c) => hauteurMax(s, c?.entraxe), aff: (s, c) => (hauteurMax(s, c?.entraxe) ? `${nf(hauteurMax(s, c?.entraxe), 2)} m` : "—") },
    { id: "ep", lab: "Épaisseur", num: true, val: (s) => s.ep, aff: (s) => (s.ep ? `${s.ep} mm` : "—") },
    { id: "feuOI", lab: "Feu o→i", val: (s) => feuEnNombre(s.carac?.feuOI), aff: (s) => s.carac?.feuOI || "—" },
    { id: "feuIO", lab: "Feu i→o", val: (s) => feuEnNombre(s.carac?.feuIO), aff: (s) => s.carac?.feuIO || "—" },
  ],
  bib: [
    { id: "feuOI", lab: "Feu o→i", val: (s) => feuEnNombre(s.carac?.feuOI), aff: (s) => s.carac?.feuOI || "—" },
    { id: "feuIO", lab: "Feu i→o", val: (s) => feuEnNombre(s.carac?.feuIO), aff: (s) => s.carac?.feuIO || "—" },
    { id: "h", lab: "Hauteur max", num: true, val: (s, c) => hauteurMax(s, c?.entraxe), aff: (s, c) => (hauteurMax(s, c?.entraxe) ? `${nf(hauteurMax(s, c?.entraxe), 2)} m` : "—") },
    { id: "portee", lab: "Portée plafond", num: true, val: (s) => s.carac?.portee || 0, aff: (s) => (s.carac?.portee ? `${nf(s.carac.portee, 2)} m` : "—") },
  ],
  bardages: [
    { id: "finition", lab: "Finition", val: (s) => s.carac?.finition || "", aff: (s) => s.carac?.finition || "—" },
    { id: "lameAir", lab: "Lame d'air", num: true, val: (s) => s.carac?.lameAir || 0, aff: (s) => (s.carac?.lameAir ? `${nf(s.carac.lameAir, 0)} mm` : "—") },
    { id: "feu", lab: "Feu", val: (s) => feuEnNombre(s.feu), aff: (s) => s.feu || "—", badge: true },
  ],
};

const COLONNES_PRIX = [
  { id: "ds", lab: "Déboursé sec", num: true, prix: true, val: (s, c) => coutSysteme(s, c.artMap, c.params).ds, aff: (s, c) => eur(coutSysteme(s, c.artMap, c.params).ds) },
  { id: "pv", lab: "P.V. / unité", num: true, prix: true, val: (s, c) => coutSysteme(s, c.artMap, c.params).pv, aff: (s, c) => eur(coutSysteme(s, c.artMap, c.params).pv) },
];

export const colonnesDe = (famille) => [...(COLONNES[famille] || COLONNES.cloisons), ...COLONNES_PRIX];
export const triParDefaut = (famille) => (famille === "cloisons" ? "db" : "feu");

/* Un système satisfait-il la sélection d'une facette ? */
export function satisfait(sys, facette, sel, ctx) {
  if (sel === undefined || sel === null || (Array.isArray(sel) && !sel.length)) return true;
  const v = facette.val(sys, ctx);
  switch (facette.type) {
    case "liste": return v === sel;
    case "multi":
      if (facette.tableau) return Array.isArray(v) && sel.some((x) => v.includes(x));
      return sel.includes(v === null || v === undefined ? "—" : String(v));
    case "paliers": {
      const p = facette.paliers.filter((x) => sel.includes(x.id));
      return p.some((x) => v >= x.min && v <= x.max);
    }
    case "seuil": return (v || 0) >= sel - 1e-9;
    case "plage": return (v || 0) >= (sel[0] ?? -Infinity) - 1e-9 && (v || 0) <= (sel[1] ?? Infinity) + 1e-9;
    default: return true;
  }
}

/* Résultats et compteurs. Le compteur d'une facette s'évalue en appliquant
   toutes les autres facettes : c'est ce qui rend les nombres cohérents. */
export function filtrer(systemes, famille, sels, ctx) {
  const facettes = facettesDe(famille);
  const cats = FAMILLE_MAP[famille]?.cats || [];
  const base = systemes.filter((s) => cats.includes(s.cat));
  const passe = (s, sauf) => facettes.every((f) => (f.id === sauf ? true : satisfait(s, f, sels[f.id], ctx)));
  const resultats = base.filter((s) => passe(s, null));

  const compteurs = {};
  facettes.forEach((f) => {
    const restants = base.filter((s) => passe(s, f.id));
    const c = {};
    restants.forEach((s) => {
      const v = f.val(s, ctx);
      const cles = f.tableau ? (Array.isArray(v) ? v : []) : [v === null || v === undefined ? "—" : String(v)];
      if (f.type === "paliers") {
        const p = f.paliers.find((x) => v >= x.min && v <= x.max);
        if (p) c[p.id] = (c[p.id] || 0) + 1;
      } else if (f.type === "multi" || f.type === "liste") {
        cles.forEach((k) => { c[k] = (c[k] || 0) + 1; });
      }
    });
    compteurs[f.id] = c;
  });

  /* état vide : quelle contrainte relâcher en premier */
  let suggestion = null;
  if (!resultats.length) {
    let mieux = 0;
    facettes.forEach((f) => {
      if (sels[f.id] === undefined || sels[f.id] === null) return;
      const n = base.filter((s) => passe(s, f.id)).length;
      if (n > mieux) { mieux = n; suggestion = { facette: f, regagnes: n }; }
    });
  }
  return { base, resultats, compteurs, suggestion, facettes };
}

/* Valeurs distinctes d'une facette, pour bâtir la liste des cases */
export function valeursDe(facette, base, ctx) {
  if (facette.type === "paliers") return facette.paliers.map((p) => ({ id: p.id, lab: p.lab }));
  const vues = new Set();
  base.forEach((s) => {
    const v = facette.val(s, ctx);
    if (facette.tableau) (Array.isArray(v) ? v : []).forEach((x) => vues.add(String(x)));
    else vues.add(v === null || v === undefined ? "—" : String(v));
  });
  let liste = [...vues];
  if (facette.ordre) liste.sort((a, b) => facette.ordre.indexOf(a) - facette.ordre.indexOf(b));
  else if (facette.tri) liste.sort(facette.tri);
  else liste.sort((a, b) => a.localeCompare(b, "fr"));
  return liste.map((id) => ({ id, lab: facette.fmt ? facette.fmt(id) : id }));
}

export const bornesDe = (facette, base, ctx) => {
  const vals = base.map((s) => facette.val(s, ctx) || 0).filter((v) => v > 0);
  if (!vals.length) return [0, 0];
  return [Math.floor(Math.min(...vals)), Math.ceil(Math.max(...vals))];
};

export const ENTRAXES_FILTRE = ENTRAXES;
