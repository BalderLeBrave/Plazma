import { today, uid } from "./format.js";


/* Poids et palettisation par défaut, surchargés article par article si besoin */
export const POIDS_DEF = { Plaque: 9.0, Dalle: 5.5, Complexe: 4.6, Ossature: 0.55, Isolant: 1.1, Accessoire: 0.35 };

export const PALETTE_DEF = { Plaque: 16, Dalle: 20, Complexe: 12, Ossature: 40, Isolant: 12, Accessoire: 24 };

export const POIDS_ART = {
  "pl-ba13": 8.4, "pl-ba15": 10.2, "pl-ba18": 12.5, "pl-hydro": 9.2, "pl-feu": 9.6, "pl-phon": 11.8,
  "pl-habito": 11.5, "pl-duo": 17.5, "kn-ks13": 8.4, "kn-ks15": 10.2, "kn-diam": 11.9, "kn-feu": 9.6,
  "kn-hydro": 9.2, "kn-aqua": 16.0, "si-preg13": 8.4, "si-preg15": 10.2, "si-flam": 9.6, "si-dro": 9.2,
  "si-wab": 11.0, "os-r48": 0.42, "os-m48": 0.48, "os-r70": 0.55, "os-m70": 0.62, "os-r90": 0.66,
  "os-m90": 0.74, "os-r100": 0.72, "os-m100": 0.80, "os-r125": 0.86, "os-m125": 0.95, "os-r150": 0.99, "os-m150": 1.09, "os-f530": 0.44, "os-corn": 0.22, "os-t24": 0.35,
  "os-l24": 0.28, "is-lm45": 0.65, "is-lm70": 0.95, "is-lm100": 1.35, "is-lm120": 1.6, "is-lm200": 2.7,
  "ac-enduit": 1, "ac-map": 1, "ac-bande": 0.02, "ac-vis25": 0.004, "ac-vis35": 0.006, "ac-vis45": 0.008,
  "ac-vis-oss": 0.005, "ac-chev": 0.012, "ac-susp": 0.05, "ac-suspt": 0.07, "ac-ecl": 0.03,
  "ac-resil": 0.03, "ac-mastic": 0.42, "ac-cornp": 0.18,
  "cx-pm40": 3.2, "cx-pm80": 3.6, "cx-pm100": 3.9, "cx-doub80": 3.7, "cx-cal80": 5.4,
  "cx-poly80": 3.6, "cx-pmax80": 3.7, "cx-pth100": 3.9,
  "dl-caso": 5.0, "dl-gypt": 6.4, "dl-danol": 6.6, "pl-gyptone": 9.8, "pl-rigitone": 10.4, "kn-cleaneo": 10.6, "si-lys": 9.9,
};

export const DIM_ART = {
  "pl-ba13": [2.5, 1.2, "surface"], "pl-ba15": [2.5, 1.2, "surface"], "pl-ba18": [2.5, 1.2, "surface"],
  "pl-hydro": [2.5, 1.2, "surface"], "pl-feu": [2.5, 1.2, "surface"], "pl-phon": [2.5, 1.2, "surface"],
  "pl-habito": [2.5, 1.2, "surface"], "pl-duo": [2.5, 1.2, "surface"],
  "pl-gyptone": [2.0, 1.2, "surface"], "pl-rigitone": [2.0, 1.2, "surface"],
  "kn-ks13": [2.5, 1.2, "surface"], "kn-ks15": [2.5, 1.2, "surface"], "kn-diam": [2.5, 1.2, "surface"],
  "kn-feu": [2.5, 1.2, "surface"], "kn-hydro": [2.5, 1.2, "surface"], "kn-cleaneo": [2.0, 1.2, "surface"],
  "kn-aqua": [2.0, 1.2, "surface"],
  "si-preg13": [2.5, 1.2, "surface"], "si-preg15": [2.5, 1.2, "surface"], "si-flam": [2.5, 1.2, "surface"],
  "si-dro": [2.5, 1.2, "surface"], "si-wab": [2.5, 1.2, "surface"], "si-lys": [2.0, 1.2, "surface"],
  "dl-caso": [0.6, 0.6, "surface"], "dl-gypt": [0.6, 0.6, "surface"], "dl-danol": [0.6, 0.6, "surface"],
  "cx-pm40": [2.6, 1.2, "surface"], "cx-pm80": [2.6, 1.2, "surface"], "cx-pm100": [2.6, 1.2, "surface"],
  "cx-doub80": [2.6, 1.2, "surface"], "cx-cal80": [2.6, 1.2, "surface"], "cx-poly80": [2.6, 1.2, "surface"],
  "cx-pmax80": [2.6, 1.2, "surface"], "cx-pth100": [2.6, 1.2, "surface"],
  "os-r48": [3, 0, "longueur"], "os-r70": [3, 0, "longueur"], "os-r90": [3, 0, "longueur"], "os-r100": [3, 0, "longueur"],
  "os-r125": [3, 0, "longueur"], "os-r150": [3, 0, "longueur"], "os-m125": [3, 0, "hauteur"], "os-m150": [3, 0, "hauteur"],
  "os-m48": [3, 0, "hauteur"], "os-m70": [3, 0, "hauteur"], "os-m90": [3, 0, "hauteur"], "os-m100": [3, 0, "hauteur"],
  "os-f530": [3, 0, "hauteur"], "os-corn": [3, 0, "longueur"], "os-t24": [3.6, 0, "longueur"], "os-l24": [3, 0, "longueur"],
  "ac-cornp": [3, 0, "longueur"],
};


export const A = (id, des, marque, famille, unite, prix, colis, parColis) =>
  ({ id, des, marque, famille, unite, prix, colis, parColis });


export const ARTICLES_BRUTS = [
  A("pl-ba13", "Placoplatre BA13 — 1200 × 2500", "Placo", "Plaque", "m²", 2.52, "plaque", 3),
  A("pl-ba15", "Placoplatre BA15 — 1200 × 2500", "Placo", "Plaque", "m²", 3.20, "plaque", 3),
  A("pl-ba18", "Placoplatre BA18 — 1200 × 2500", "Placo", "Plaque", "m²", 4.35, "plaque", 3),
  A("pl-hydro", "Placomarine BA13 hydrofuge", "Placo", "Plaque", "m²", 4.15, "plaque", 3),
  A("pl-feu", "Placoflam BA13 coupe-feu", "Placo", "Plaque", "m²", 3.55, "plaque", 3),
  A("pl-phon", "Placo Phonique BA13", "Placo", "Plaque", "m²", 3.85, "plaque", 3),
  A("pl-habito", "Habito 13 mm haute résistance", "Placo", "Plaque", "m²", 6.90, "plaque", 3),
  A("pl-duo", "Placo Duo'Tech 25 mm", "Placo", "Plaque", "m²", 9.40, "plaque", 3),
  A("pl-gyptone", "Gyptone Base 31 perforée 12,5", "Placo", "Plaque", "m²", 17.50, "plaque", 2.4),
  A("pl-rigitone", "Rigitone Activ'Air 12/25 perforée", "Placo", "Plaque", "m²", 26.00, "plaque", 2.4),
  A("kn-ks13", "Knauf Standard KS 13 — 1200 × 2500", "Knauf", "Plaque", "m²", 2.48, "plaque", 3),
  A("kn-ks15", "Knauf Standard KS 15", "Knauf", "Plaque", "m²", 3.15, "plaque", 3),
  A("kn-diam", "Knauf Diamant 12,5 haute dureté", "Knauf", "Plaque", "m²", 5.60, "plaque", 3),
  A("kn-feu", "Knauf Feu KF 13 coupe-feu", "Knauf", "Plaque", "m²", 3.60, "plaque", 3),
  A("kn-hydro", "Knauf Hydro KH 13", "Knauf", "Plaque", "m²", 4.10, "plaque", 3),
  A("kn-cleaneo", "Knauf Cleaneo Akustik perforée 12,5", "Knauf", "Plaque", "m²", 28.00, "plaque", 2.4),
  A("kn-aqua", "Aquapanel Outdoor 12,5", "Knauf", "Plaque", "m²", 21.00, "plaque", 2.4),
  A("si-preg13", "Prégyplac BA13 — 1200 × 2500", "Siniat", "Plaque", "m²", 2.55, "plaque", 3),
  A("si-preg15", "Prégyplac BA15", "Siniat", "Plaque", "m²", 3.18, "plaque", 3),
  A("si-flam", "Prégyflam BA13 coupe-feu", "Siniat", "Plaque", "m²", 3.50, "plaque", 3),
  A("si-dro", "Prégydro BA13 hydrofuge", "Siniat", "Plaque", "m²", 4.05, "plaque", 3),
  A("si-wab", "Prégywab BA13 très haute résistance à l'eau", "Siniat", "Plaque", "m²", 8.60, "plaque", 3),
  A("si-lys", "Prégylys perforée 12,5", "Siniat", "Plaque", "m²", 18.50, "plaque", 2.4),
  A("dl-caso", "Casoprano Casostar 600 × 600", "Siniat", "Dalle", "m²", 6.80, "dalle", 0.36),
  A("dl-gypt", "Gyptone Base 600 × 600", "Placo", "Dalle", "m²", 14.20, "dalle", 0.36),
  A("dl-danol", "Knauf Danoline dalle 600 × 600", "Knauf", "Dalle", "m²", 15.60, "dalle", 0.36),
  A("cx-pm40", "Placomur 13 + 40 (PSE)", "Placo", "Complexe", "m²", 8.90, "panneau", 3.12),
  A("cx-pm80", "Placomur 13 + 80 (PSE)", "Placo", "Complexe", "m²", 12.80, "panneau", 3.12),
  A("cx-pm100", "Placomur 13 + 100 (PSE)", "Placo", "Complexe", "m²", 14.60, "panneau", 3.12),
  A("cx-doub80", "Doublissimo 13 + 80 (PSE Th38)", "Placo", "Complexe", "m²", 15.20, "panneau", 3.12),
  A("cx-cal80", "Calibel 13 + 80 (laine minérale)", "Placo", "Complexe", "m²", 16.40, "panneau", 3.12),
  A("cx-poly80", "Polyplac E 13 + 80 (PSE)", "Knauf", "Complexe", "m²", 12.40, "panneau", 3.12),
  A("cx-pmax80", "Prégymax 13 + 80 (PSE graphité)", "Siniat", "Complexe", "m²", 14.90, "panneau", 3.12),
  A("cx-pth100", "Prégytherm 13 + 100 (PSE)", "Siniat", "Complexe", "m²", 15.80, "panneau", 3.12),
  A("os-r48", "Rail R48 — barre 3,00 m", "Multi-marques", "Ossature", "ml", 1.35, "barre", 3),
  A("os-m48", "Montant M48 — barre 3,00 m", "Multi-marques", "Ossature", "ml", 1.42, "barre", 3),
  A("os-r70", "Rail R70 — barre 3,00 m", "Multi-marques", "Ossature", "ml", 1.72, "barre", 3),
  A("os-m70", "Montant M70 — barre 3,00 m", "Multi-marques", "Ossature", "ml", 1.85, "barre", 3),
  A("os-r90", "Rail R90 — barre 3,00 m", "Multi-marques", "Ossature", "ml", 2.05, "barre", 3),
  A("os-m90", "Montant M90 — barre 3,00 m", "Multi-marques", "Ossature", "ml", 2.20, "barre", 3),
  A("os-r100", "Rail R100 — barre 3,00 m", "Multi-marques", "Ossature", "ml", 2.35, "barre", 3),
  A("os-m100", "Montant M100 — barre 3,00 m", "Multi-marques", "Ossature", "ml", 2.55, "barre", 3),
  A("os-f530", "Fourrure F530 — barre 3,00 m", "Multi-marques", "Ossature", "ml", 1.28, "barre", 3),
  A("os-corn", "Cornière 25 × 25 — barre 3,00 m", "Multi-marques", "Ossature", "ml", 0.92, "barre", 3),
  A("os-t24", "Ossature apparente T24 (porteurs + entretoises)", "Multi-marques", "Ossature", "ml", 1.15, "barre", 3.6),
  A("os-l24", "Cornière périphérique L24", "Multi-marques", "Ossature", "ml", 1.05, "barre", 3),
  A("os-optima", "Appui Optima / patte-équerre", "Placo", "Ossature", "u", 0.95, "boîte", 50),
  A("is-lm45", "Laine minérale 45 mm", "Isover", "Isolant", "m²", 3.60, "rouleau", 9),
  A("is-lm70", "Laine minérale 70 mm", "Isover", "Isolant", "m²", 4.80, "rouleau", 7.2),
  A("is-lm100", "Laine minérale 100 mm", "Isover", "Isolant", "m²", 5.90, "rouleau", 6),
  A("is-lm120", "Laine minérale 120 mm", "Isover", "Isolant", "m²", 6.80, "rouleau", 5.4),
  A("is-lm200", "Laine minérale 200 mm", "Isover", "Isolant", "m²", 9.80, "rouleau", 4),
  A("ac-susp", "Suspente + cavalier F530", "Multi-marques", "Accessoire", "u", 0.82, "boîte", 100),
  A("ac-suspt", "Suspente à tige filetée", "Multi-marques", "Accessoire", "u", 1.10, "boîte", 50),
  A("ac-ecl", "Éclisse F530", "Multi-marques", "Accessoire", "u", 0.48, "boîte", 100),
  A("ac-vis25", "Vis TTPC 25 mm", "Multi-marques", "Accessoire", "u", 0.013, "boîte", 1000),
  A("ac-vis35", "Vis TTPC 35 mm", "Multi-marques", "Accessoire", "u", 0.017, "boîte", 1000),
  A("ac-vis45", "Vis TTPC 45 mm", "Multi-marques", "Accessoire", "u", 0.024, "boîte", 1000),
  A("ac-vis-oss", "Vis tête cylindrique 13 mm (ossature)", "Multi-marques", "Accessoire", "u", 0.020, "boîte", 1000),
  A("ac-chev", "Cheville à frapper 6 × 40", "Multi-marques", "Accessoire", "u", 0.085, "boîte", 100),
  A("ac-bande", "Bande à joint papier — rouleau 150 ml", "Multi-marques", "Accessoire", "ml", 0.042, "rouleau", 150),
  A("ac-enduit", "Enduit à joint poudre", "Multi-marques", "Accessoire", "kg", 0.78, "sac", 25),
  A("ac-map", "MAP mortier adhésif", "Placo", "Accessoire", "kg", 0.54, "sac", 25),
  A("ac-resil", "Bande résiliente 45 mm — rouleau 30 ml", "Multi-marques", "Accessoire", "ml", 0.38, "rouleau", 30),
  A("ac-mastic", "Mastic acoustique — cartouche 310 ml", "Multi-marques", "Accessoire", "u", 6.40, "cartouche", 1),
  A("ac-cornp", "Cornière de protection d'angle", "Multi-marques", "Accessoire", "ml", 1.15, "barre", 3),
];


export const SEED_ARTICLES = ARTICLES_BRUTS.map((a) => {
  const [long = 0, larg = 0, coupe = "aucune"] = DIM_ART[a.id] || [];
  return {
    ...a, long, larg, coupe,
    poids: POIDS_ART[a.id] ?? POIDS_DEF[a.famille] ?? 1,
    parPalette: PALETTE_DEF[a.famille] ?? 20,
    paletteEntiere: false,
    marge: null,
    fournisseurs: [{ id: uid(), nom: "Point P", ref: "", libelle: "", prix: a.prix, maj: today() }],
    histo: [{ date: today(), prix: a.prix }],
  };
});


/* Quantité d'œuvre contenue dans le plus petit lot commandable */
export const lotAchat = (a) => (a.paletteEntiere ? (a.parColis || 0) * (a.parPalette || 1) : (a.parColis || 0));

export const nomLot = (a) => (a.paletteEntiere ? "palette" : a.colis);

/* Contenance déduite des dimensions : m² pour une plaque, ml pour une barre */
export const contenance = (a) => (a.coupe === "surface" && a.long > 0 && a.larg > 0 ? a.long * a.larg : a.long > 0 ? a.long : 0);
