import { nf } from "./format.js";
import { CLASSE_EAU_MAP, ENTRAXES, MARCHE_DEF } from "./referentiel.js";
import { lotAchat } from "./articles.js";
import { PERTE_ART, SANS_PERTE, hauteurMax } from "./systemes.js";


/* ================================================================== */
/*  3. Moteur de calcul                                                */
/* ================================================================== */

/* Coefficient d'entreprise appliqué au déboursé sec.
   Mode « % du prix de vente » : PV = DS / (1 - FG - bénéfice), la convention
   de l'économie de la construction. Mode « majoration » : PV = DS × (1+FG) × (1+B). */
export function coefEntreprise(p) {
  const fg = (p.fg || 0) / 100, b = (p.benef || 0) / 100;
  if (p.modeCoef === "deb") return (1 + fg) * (1 + b);
  if (p.cumul === "cascade") {
    const d1 = Math.max(0.05, 1 - fg), d2 = Math.max(0.05, 1 - b);
    return 1 / d1 / d2;
  }
  return 1 / Math.max(0.05, 1 - fg - b);
}


/* Taux de marge = marge / prix d'achat.  Taux de marque = marge / prix de vente. */
export const coefDeMarge = (m) => {
  if (!m || !m.taux) return 1;
  const t = (m.taux || 0) / 100;
  return m.mode === "marge" ? 1 + t : 1 / Math.max(0.05, 1 - t);
};

export const margeVersMarque = (t) => (t / (1 + t / 100)) || 0;

export const marqueVersMarge = (t) => (t / Math.max(0.05, 1 - t / 100)) || 0;

export const margeArticle = (a, p) => (a.marge && a.marge.taux ? a.marge : p.margeArtDefaut);


/* Taux horaire moyen pondéré par la répartition des qualifications */
export function tauxMO(sys, p) {
  const rep = (sys && sys.repart) || p.repartDefaut || {};
  let som = 0, tot = 0;
  (p.qualifs || []).forEach((q) => {
    const pc = rep[q.id] || 0;
    som += (pc / 100) * (q.taux || 0);
    tot += pc;
  });
  if (tot === 0) return p.qualifs?.[0]?.taux || 0;
  return tot === 100 ? som : (som * 100) / tot;
}


/* Taux de perte effectif : celui de la ligne s'il est renseigné, sinon celui du système */
/* Trois états, à ne pas confondre :
   verrouillé — article compté à la pièce, aucune chute possible : règle métier
   hérité     — la ligne suit le taux de l'article s'il en a un, sinon celui du système
   dérogation — un taux propre a été saisi sur la ligne */
export const verrouille = (lg) => SANS_PERTE.has(lg.art);
export const perteHeritee = (lg, sys) => PERTE_ART[lg.art] ?? (sys?.perteDef ?? 0);
export const perteOf = (lg, sys) =>
  verrouille(lg) ? 0
    : (lg && lg.perte !== null && lg.perte !== undefined) ? lg.perte
      : perteHeritee(lg, sys);

export const herite = (lg) => !verrouille(lg) && (lg.perte === null || lg.perte === undefined);

export const qteLigne = (lg, quantite = 1, sys = null) =>
  (lg.ratio || 0) * (1 + perteOf(lg, sys) / 100) * quantite;

export const qteLigneNette = (lg, quantite = 1) => (lg.ratio || 0) * quantite;


/* Déboursé et prix de vente d'un système, à l'unité d'ouvrage */
export function coutSysteme(sys, artMap, p) {
  let mat = 0, pvFourn = 0, dechets = 0;
  (sys.lignes || []).forEach((lg) => {
    const a = artMap[lg.art];
    if (!a) return;
    const q = qteLigne(lg, 1, sys);
    mat += q * (a.prix || 0);
    pvFourn += q * (a.prix || 0) * coefDeMarge(margeArticle(a, p));
    dechets += qteLigneNette(lg) * (perteOf(lg, sys) / 100) * (a.poids || 0);
  });
  dechets += sys.dechetsSup || 0;
  const th = tauxMO(sys, p);
  const mo = (sys.mo || 0) * th;
  const materiel = sys.materiel || 0;
  const coutDechets = (dechets / 1000) * (p.prixBenne || 0);
  const ds = mat + mo + materiel + coutDechets;
  const K = coefEntreprise(p);
  let pv;
  if (p.margeSource === "article") {
    pv = pvFourn + mo * coefDeMarge(p.margeMO) + (materiel + coutDechets) * K;
  } else {
    pv = ds * K;
    pvFourn = mat * K;
  }
  return { mat, mo, heures: sys.mo || 0, tauxH: th, materiel, dechets, coutDechets, ds, pv, pvFourn, marge: pv - ds };
}


/* Quantité d'un ouvrage : saisie directe ou métré longueur × hauteur - baies */
export const qteOuvrage = (o) =>
  o.mode === "detail"
    ? Math.max(0, (o.nb || 1) * (o.long || 0) * (o.hsp || 0) - (o.deduc || 0))
    : (o.qte || 0);


export const ouvragesVariante = (projet) =>
  (projet.ouvrages || []).filter((o) => (o.variante || "Base") === (projet.varianteActive || "Base"));


export function totauxProjet(projet, sysMap, artMap, p, tousOuvrages = false) {
  const list = tousOuvrages ? (projet.ouvrages || []) : ouvragesVariante(projet);
  let mat = 0, mo = 0, materiel = 0, dechets = 0, coutDechets = 0, ds = 0, pv = 0, h = 0, qte = 0;
  list.forEach((o) => {
    const s = sysMap[o.sys];
    if (!s) return;
    const c = coutSysteme(s, artMap, p);
    const q = qteOuvrage(o);
    mat += c.mat * q; mo += c.mo * q; materiel += c.materiel * q;
    dechets += c.dechets * q; coutDechets += c.coutDechets * q;
    ds += c.ds * q; pv += c.pv * q; h += c.heures * q; qte += q;
  });
  const frais = (projet.fraisChantier || []).reduce((a, f) => a + (f.montant || 0), 0);
  const K = coefEntreprise(p);
  const dsTot = ds + frais;
  const pvTot = pv + frais * K;
  return {
    mat, mo, materiel, dechets, coutDechets, frais, h, qte,
    ds: dsTot, pv: pvTot, marge: pvTot - dsTot,
    tauxMarque: pvTot > 0 ? ((pvTot - dsTot) / pvTot) * 100 : 0,
  };
}


/* Besoins matière théoriques, filtrés */
export function calculBesoins(projet, sysMap, artMap, f = {}) {
  const acc = {};
  ouvragesVariante(projet).forEach((o) => {
    const z = o.zone || "Non affecté", n = o.niveau || "Non affecté";
    if (f.zone && f.zone !== "Toutes" && z !== f.zone) return;
    if (f.niveau && f.niveau !== "Tous" && n !== f.niveau) return;
    const s = sysMap[o.sys];
    if (!s) return;
    const q = qteOuvrage(o);
    s.lignes.forEach((lg) => {
      const a = artMap[lg.art];
      if (!a) return;
      if (f.famille && f.famille !== "Toutes" && a.famille !== f.famille) return;
      if (f.fournisseur && f.fournisseur !== "Tous" && (a.fournisseurs || []).every((x) => x.nom !== f.fournisseur)) return;
      if (!acc[a.id]) acc[a.id] = { art: a, qte: 0, nette: 0, detail: {} };
      acc[a.id].qte += qteLigne(lg, q, s);
      acc[a.id].nette += qteLigneNette(lg, q);
      const k = `${z} · ${n}`;
      acc[a.id].detail[k] = (acc[a.id].detail[k] || 0) + qteLigne(lg, q, s);
    });
  });
  return Object.values(acc).map((b) => ({
    ...b,
    colis: lotAchat(b.art) > 0 ? Math.ceil(b.qte / lotAchat(b.art)) : 0,
    montant: b.qte * (b.art.prix || 0),
    poids: b.qte * (b.art.poids || 0),
  })).sort((x, y) => y.montant - x.montant);
}


/* ------------------------------------------------------------------ */
/*  Conformité d'un système aux contraintes de filtrage                */
/* ------------------------------------------------------------------ */

export const feuEnNombre = (f) => {
  const m = /(\d+)/.exec(String(f || ""));
  return m ? parseInt(m[1], 10) : 0;
};


/* Évaluation d'un système : conforme, écarté, ou sans donnée déclarée.
   Un critère non renseigné écarte le système : on ne présume pas d'une
   performance qui n'a pas été vérifiée. */
export function evaluerSysteme(sys, c) {
  const k = sys.carac || {};
  const motifs = [];
  const manquants = [];

  if (c.eau) {
    if (!Array.isArray(k.eau) || !k.eau.length) manquants.push("exposition à l'eau");
    else if (!k.eau.includes(c.eau)) motifs.push(`non admis en ${CLASSE_EAU_MAP[c.eau]?.lab}`);
  }
  if (c.hauteur > 0) {
    const dispo = ENTRAXES.map((e) => ({ e, h: hauteurMax(sys, e) })).filter((x) => x.h > 0);
    if (!dispo.length) manquants.push("hauteur admissible");
    else {
      const ok = dispo.filter((x) => x.h >= c.hauteur - 1e-9).sort((a, b) => b.e - a.e)[0];
      if (!ok) motifs.push(`hauteur limitée à ${nf(Math.max(...dispo.map((x) => x.h)), 2)} m`);
      else sys._entraxeRequis = ok.e;
    }
  }
  if (c.feu > 0) {
    const f = feuEnNombre(sys.feu);
    if (!f) manquants.push("résistance au feu");
    else if (f < c.feu) motifs.push(`classé EI ${f}`);
  }
  if (c.dB > 0) {
    const v = k.dnt || sys.dB || 0;
    if (!v) manquants.push("performance acoustique");
    else if (v < c.dB) motifs.push(`${nf(v, 0)} dB seulement`);
  }
  if (c.separe) {
    if (!k.separe) manquants.push("nature du séparatif");
    else if (k.separe !== c.separe) motifs.push(`prévu pour « ${k.separe} »`);
  }
  if (c.choc) {
    if (!k.choc) manquants.push("résistance aux chocs");
    else if (c.choc === "renforce" && /standard/i.test(k.choc)) motifs.push("parement standard");
  }
  if (c.r > 0) {
    if (!k.r) manquants.push("résistance thermique");
    else if (k.r < c.r - 1e-9) motifs.push(`R = ${nf(k.r, 2)} m²·K/W`);
  }
  if (c.isolant) {
    if (!k.isolant) manquants.push("nature de l'isolant");
    else if (k.isolant !== c.isolant) motifs.push(`isolant ${k.isolant}`);
  }
  if (c.epMax > 0 && sys.ep > 0 && sys.ep > c.epMax) motifs.push(`${sys.ep} mm d'encombrement`);
  if (c.reseaux === "Oui") {
    if (!k.reseaux) manquants.push("passage de réseaux");
    else if (k.reseaux !== "Oui") motifs.push("pas de vide technique");
  }
  if (c.support) {
    const sup = k.support;
    if (!sup) manquants.push("support de fixation");
    else if (Array.isArray(sup) ? !sup.includes(c.support) : true) motifs.push(`non admis sur ${c.support.toLowerCase()}`);
  }
  if (c.portee > 0) {
    if (!k.portee) manquants.push("portée entre suspentes");
    else if (k.portee < c.portee - 1e-9) motifs.push(`portée de ${nf(k.portee, 2)} m`);
  }
  if (c.alpha > 0) {
    if (!k.alpha) manquants.push("absorption acoustique");
    else if (k.alpha < c.alpha - 1e-9) motifs.push(`αw = ${nf(k.alpha, 2)}`);
  }
  if (c.demontable) {
    if (!k.demontable) manquants.push("démontabilité");
    else if (k.demontable !== c.demontable) motifs.push(`démontabilité ${k.demontable.toLowerCase()}`);
  }
  if (c.exterieur === "Oui") {
    if (!k.exterieur) manquants.push("emploi en extérieur");
    else if (k.exterieur !== "Oui") motifs.push("intérieur uniquement");
  }
  return { conforme: !motifs.length && !manquants.length, motifs, manquants };
}


/* ------------------------------------------------------------------ */
/*  Géométrie de coupe et décomposition de l'écart matière             */
/*  Porté de la maquette « Audit & écart matière » (écran 5a).         */
/* ------------------------------------------------------------------ */

export const SEUIL_RECUP = 0.6;

export const TAUX_RECUP = 0.55;


/* Chute de débit, déduite des dimensions de l'article.
   Une chute d'au moins SEUIL_RECUP est réemployée à hauteur de TAUX_RECUP. */
export const perteDebit = (chute, base) =>
  base > 0 ? (chute - (chute >= SEUIL_RECUP ? chute * TAUX_RECUP : 0)) / base : 0;


export function fracCoupe(a, H, Lw) {
  const L = a.long || 0, W = a.larg || 0, mode = a.coupe || "aucune";
  if (mode === "surface") {
    if (!L) return 0;
    const fL = perteDebit(Math.ceil(H / L) * L - H, H);
    const fW = W > 0 && Lw > 0 ? perteDebit(Math.ceil(Lw / W) * W - Lw, Lw) : 0;
    return (1 + fL) * (1 + fW) - 1;
  }
  if (mode === "hauteur") return L ? perteDebit(Math.ceil(H / L) * L - H, H) : 0;
  if (mode === "longueur") return L && Lw > 0 ? perteDebit(Math.ceil(Lw / L) * L - Lw, Lw) : 0;
  return 0;
}


/* Besoins enrichis : on conserve la géométrie de chaque ouvrage contributeur */
export function besoinsDetail(projet, sysMap, artMap) {
  const acc = {};
  ouvragesVariante(projet).forEach((o) => {
    const s = sysMap[o.sys];
    if (!s) return;
    const q = qteOuvrage(o);
    const H = o.mode === "detail" ? (o.hsp || s.hsp) : s.hsp;
    const Lw = o.mode === "detail" ? (o.long || 0) : 0;
    s.lignes.forEach((lg) => {
      const a = artMap[lg.art];
      if (!a) return;
      const e = acc[a.id] || (acc[a.id] = { art: a, qte: 0, nette: 0, parts: [] });
      const qn = qteLigneNette(lg, q);
      e.qte += qteLigne(lg, q, s);
      e.nette += qn;
      e.parts.push({ nette: qn, H, Lw, sysNom: s.nom });
    });
  });
  return acc;
}


/* Prix réellement facturé, relevé sur les lignes de commande saisies */
export function prixFacture(projet, artId, pRef) {
  let q = 0, m = 0;
  (projet.commandes || []).forEach((c) => (c.lignes || []).forEach((l) => {
    if (l.art !== artId) return;
    const pu = l.puFacture || 0;
    if (pu > 0 && (l.livre || 0) > 0) { q += l.livre; m += l.livre * pu; }
  }));
  return q > 0 ? m / q : pRef;
}


export const tauxEcart = (projet, artId, cle) => {
  const d = (projet.ecartArt || {})[artId];
  if (d && d[cle] !== null && d[cle] !== undefined) return d[cle];
  return cle === "casse" ? (projet.casseDef ?? 0) : (projet.repriseDef ?? 0);
};

export const ecartHerite = (projet, artId, cle) => {
  const d = (projet.ecartArt || {})[artId];
  return !d || d[cle] === null || d[cle] === undefined;
};


/* Décomposition réconciliante : net + causes = quantité consommée */
export function ecartArticle(e, projet) {
  const a = e.art, pcl = lotAchat(a) || 1;
  const nette = e.nette, theo = e.qte;
  let coupe = 0, Hsom = 0, Hpds = 0;
  e.parts.forEach((pt) => {
    coupe += pt.nette * fracCoupe(a, pt.H, pt.Lw);
    Hsom += pt.H * pt.nette; Hpds += pt.nette;
  });
  const Hmoy = Hpds > 0 ? Hsom / Hpds : 0;
  const avantColis = nette + coupe;
  const condit = Math.max(0, Math.ceil(avantColis / pcl) * pcl - avantColis);
  const tCasse = tauxEcart(projet, a.id, "casse");
  const tReprise = tauxEcart(projet, a.id, "reprise");
  const casse = nette * (tCasse / 100);
  const reprise = nette * (tReprise / 100);
  const expliq = nette + coupe + condit + casse + reprise;
  const saisie = (projet.conso || {})[a.id];
  const releve = saisie !== undefined && saisie !== null && saisie > 0;
  const cons = releve ? saisie : expliq;
  const residu = cons - expliq;
  const pTheo = nette > 0 ? (theo / nette - 1) * 100 : 0;
  const pReel = nette > 0 ? (cons / nette - 1) * 100 : 0;
  const pRef = a.prix || 0;
  const pFact = prixFacture(projet, a.id, pRef);
  const evQte = (cons - theo) * pRef;
  const evPrix = cons * (pFact - pRef);
  const causes = [
    { k: "coupe", v: coupe }, { k: "condit", v: condit },
    { k: "casse", v: casse }, { k: "reprise", v: reprise }, { k: "residu", v: residu },
  ];
  const dom = causes.filter((c) => c.v > 0).sort((x, y) => y.v - x.v)[0] || { k: "residu", v: 0 };
  return {
    art: a, nette, theo, coupe, condit, casse, reprise, residu, cons, expliq, releve,
    tCasse, tReprise, pTheo, pReel, dPerte: pReel - pTheo, Hmoy, pcl,
    fracCoupePc: nette > 0 ? (coupe / nette) * 100 : 0,
    colisSaisis: pcl > 0 ? cons / pcl : 0,
    pRef, pFact, evQte, evPrix, evTot: evQte + evPrix,
    dom: dom.k, domPc: nette > 0 ? (dom.v / nette) * 100 : 0,
    Lc: a.coupe === "aucune" ? 0 : (a.long || 0),
    modeCoupe: a.coupe || "aucune",
  };
}


/* ------------------------------------------------------------------ */
/*  Heures pointées, travaux supplémentaires, situation de travaux     */
/* ------------------------------------------------------------------ */

/* Heures chiffrées d'un ouvrage, et heures ramenées à son avancement */
export const heuresOuvrage = (o, sysMap) => (sysMap[o.sys]?.mo || 0) * qteOuvrage(o);

export const avOuvrage = (o) => Math.max(0, Math.min(100, o.avAct || 0)) / 100;


/* Rapprochement heures pointées / heures chiffrées, global et par système */
export function rendementMO(projet, sysMap, params) {
  const lignes = ouvragesVariante(projet);
  const pointages = projet.pointages || [];
  const heuresPointees = pointages.reduce((a, p) => a + (p.heures || 0), 0);
  const coutReel = pointages.reduce((a, p) => {
    const q = (params.qualifs || []).find((x) => x.id === p.qualif);
    return a + (p.heures || 0) * (q ? q.taux : 0);
  }, 0);
  const heuresChiffrees = lignes.reduce((a, o) => a + heuresOuvrage(o, sysMap), 0);
  const heuresAvancement = lignes.reduce((a, o) => a + heuresOuvrage(o, sysMap) * avOuvrage(o), 0);

  /* par système : seuls les pointages rattachés à un système sont exploitables */
  const parSys = {};
  pointages.forEach((p) => {
    if (!p.sys) return;
    const g = parSys[p.sys] || (parSys[p.sys] = { sys: sysMap[p.sys], reelles: 0, chiffrees: 0, qte: 0 });
    g.reelles += p.heures || 0;
  });
  Object.keys(parSys).forEach((id) => {
    const g = parSys[id];
    lignes.filter((o) => o.sys === id).forEach((o) => {
      g.chiffrees += heuresOuvrage(o, sysMap) * avOuvrage(o);
      g.qte += qteOuvrage(o) * avOuvrage(o);
    });
    g.moReel = g.qte > 0 ? g.reelles / g.qte : null;
    g.moChiffre = g.sys ? g.sys.mo : 0;
    g.ecart = g.chiffrees > 0 ? (g.reelles / g.chiffrees - 1) * 100 : null;
  });

  return {
    heuresPointees, heuresChiffrees, heuresAvancement, coutReel,
    coutChiffre: heuresAvancement * tauxMO(null, params),
    rendement: heuresAvancement > 0 ? (heuresPointees / heuresAvancement - 1) * 100 : null,
    resteAFaire: Math.max(0, heuresChiffrees - heuresAvancement),
    parSys: Object.values(parSys),
  };
}


/* Montant d'un travail supplémentaire : ouvrages chiffrés depuis la bibliothèque, ou forfait */
export function montantTS(t, sysMap, artMap, params) {
  if (t.forfait > 0) return t.forfait;
  return (t.lignes || []).reduce((a, l) => {
    const s = sysMap[l.sys];
    return a + (s ? coutSysteme(s, artMap, params).pv * (l.qte || 0) : 0);
  }, 0);
}

export const TS_ACQUIS = ["OS reçu", "Facturé"];


/* Situation de travaux : cumul, révision, prorata, retenue, avance, TVA */
export function situationProjet(projet, sysMap, artMap, params) {
  const m = { ...MARCHE_DEF, ...(projet.marche || {}) };
  const lignes = ouvragesVariante(projet);
  const K = coefEntreprise(params);

  const marcheOuv = lignes.reduce((a, o) => {
    const s = sysMap[o.sys];
    return a + (s ? coutSysteme(s, artMap, params).pv * qteOuvrage(o) : 0);
  }, 0);
  const frais = (projet.fraisChantier || []).reduce((a, f) => a + (f.montant || 0), 0) * K;
  const marcheBase = marcheOuv + frais;

  const cumulOuv = lignes.reduce((a, o) => {
    const s = sysMap[o.sys];
    return a + (s ? coutSysteme(s, artMap, params).pv * qteOuvrage(o) * avOuvrage(o) : 0);
  }, 0);
  const avGlobal = marcheOuv > 0 ? cumulOuv / marcheOuv : 0;
  const cumulFrais = frais * avGlobal;

  const tsAcquis = (projet.ts || []).filter((t) => TS_ACQUIS.includes(t.statut));
  const marcheTS = tsAcquis.reduce((a, t) => a + montantTS(t, sysMap, artMap, params), 0);
  const cumulTS = tsAcquis.reduce((a, t) => a + montantTS(t, sysMap, artMap, params) * (Math.max(0, Math.min(100, t.av || 0)) / 100), 0);

  const cumulTravaux = cumulOuv + cumulFrais + cumulTS;
  const coefRevision = m.revision && m.indexBase > 0 ? m.indexActuel / m.indexBase : 1;
  const revision = cumulTravaux * (coefRevision - 1);
  const cumulRevise = cumulTravaux + revision;

  const prorata = cumulRevise * ((m.prorata || 0) / 100);
  const retenue = m.cautionRG ? 0 : cumulRevise * ((m.retenue || 0) / 100);

  const marcheTotal = marcheBase + marcheTS;
  const avanceVersee = marcheTotal * ((m.avance || 0) / 100);
  const avAv = marcheTotal > 0 ? cumulRevise / marcheTotal : 0;
  const seuil = (m.seuilRemb || 0) / 100;
  const partRemb = avAv <= seuil ? 0 : Math.min(1, (avAv - seuil) / Math.max(0.01, 1 - seuil));
  const remboursement = avanceVersee * partRemb;

  const netCumul = cumulRevise - prorata - retenue - remboursement;
  const histo = projet.histoSit || [];
  const netPrecedent = histo.length ? histo[histo.length - 1].netCumul : 0;
  const netMois = netCumul - netPrecedent;
  const tva = netMois * ((m.tva || 0) / 100);

  return {
    m, marcheOuv, frais, marcheBase, marcheTS, marcheTotal,
    cumulOuv, cumulFrais, cumulTS, cumulTravaux, avGlobal, avAv,
    coefRevision, revision, cumulRevise, prorata, retenue,
    avanceVersee, remboursement, netCumul, netPrecedent, netMois, tva, ttc: netMois + tva,
  };
}


export function etatStock(depot, artMap) {
  const mv = [...(depot.mouvements || [])].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const st = {};
  mv.forEach((m) => {
    const a = artMap[m.art];
    if (!a) return;
    const e = st[m.art] || (st[m.art] = { art: a, qte: 0, pmp: a.prix || 0, dernier: "", reserve: 0 });
    const q = m.qte || 0;
    if (m.sens === "entree") {
      const val = e.qte * e.pmp + q * (m.pu ?? e.pmp);
      e.qte += q;
      e.pmp = e.qte > 0 ? val / e.qte : (m.pu ?? e.pmp);
    } else if (m.sens === "sortie") {
      e.qte -= q;
    } else if (m.sens === "inventaire") {
      e.qte = q;
      if (m.pu) e.pmp = m.pu;
    }
    e.dernier = m.date || e.dernier;
  });
  return Object.values(st).map((e) => ({ ...e, valeur: e.qte * e.pmp }))
    .sort((a, b) => b.valeur - a.valeur);
}


/* Ce que le dépôt peut couvrir sur les besoins d'un projet */
export function couvertureDepot(besoins, stock) {
  const idx = Object.fromEntries(stock.map((s) => [s.art.id, s]));
  return besoins.map((b) => {
    const s = idx[b.art.id];
    const dispo = s ? Math.max(0, s.qte) : 0;
    const couvert = Math.min(dispo, b.qte);
    return { ...b, dispo, couvert, aCommander: Math.max(0, b.qte - dispo) };
  });
}


/* Consolidation commandé / livré / consommé par article */
export function suiviAchats(projet, besoins) {
  const cde = {}, liv = {}, fac = {};
  (projet.commandes || []).forEach((c) => {
    (c.lignes || []).forEach((l) => {
      cde[l.art] = (cde[l.art] || 0) + (l.qte || 0);
      liv[l.art] = (liv[l.art] || 0) + (l.livre || 0);
      fac[l.art] = (fac[l.art] || 0) + (l.livre || 0) * (l.puFacture || l.pu || 0);
    });
  });
  const conso = projet.conso || {};
  return besoins.map((b) => {
    const c = cde[b.art.id] || 0, l = liv[b.art.id] || 0, k = conso[b.art.id] || 0;
    const perteReelle = b.nette > 0 && k > 0 ? (k / b.nette - 1) * 100 : null;
    return {
      ...b, commande: c, livre: l, consomme: k, reliquat: c - l,
      resteACommander: Math.max(0, b.qte - c),
      montantReel: fac[b.art.id] || 0,
      ecart: (fac[b.art.id] || 0) - l * (b.art.prix || 0),
      perteReelle,
    };
  });
}
