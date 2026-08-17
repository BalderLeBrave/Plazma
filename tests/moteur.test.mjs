/* Contrôles d'identité du moteur — à lancer avec « npm test ».
   Ces trois égalités doivent tenir quelles que soient les évolutions. */
import { strict as assert } from "node:assert";
import { SEED_SYSTEMES } from "../src/domaine/systemes.js";
import { SEED_ARTICLES } from "../src/domaine/articles.js";
import { SEED_PROJETS } from "../src/domaine/projets.js";
import { DEFAULT_PARAMS } from "../src/domaine/referentiel.js";
import {
  coefEntreprise, coutSysteme, besoinsDetail, ecartArticle,
  totauxProjet, situationProjet, evaluerSysteme,
} from "../src/domaine/moteur.js";

const sysMap = Object.fromEntries(SEED_SYSTEMES.map((s) => [s.id, s]));
const artMap = Object.fromEntries(SEED_ARTICLES.map((a) => [a.id, a]));
const p = DEFAULT_PARAMS;
const projet = SEED_PROJETS[0];
const proche = (a, b, tol = 1e-6) => Math.abs(a - b) < tol;
let n = 0;
const ok = (t) => { n++; console.log("  ✓", t); };

/* 1. coefficient d'entreprise : 12 + 8 % du prix de vente donne 1,25 */
assert(proche(coefEntreprise({ ...p, modeCoef: "ca", cumul: "cumule", fg: 12, benef: 8 }), 1.25));
assert(proche(coefEntreprise({ ...p, modeCoef: "ca", cumul: "cumule", fg: 30, benef: 0 }), 1 / 0.7));
ok("coefficient d'entreprise conforme à la convention du prix de vente");

/* 2. déboursé = fournitures + main d'œuvre + matériel + évacuation */
for (const s of SEED_SYSTEMES) {
  const c = coutSysteme(s, artMap, p);
  assert(proche(c.ds, c.mat + c.mo + c.materiel + c.coutDechets, 1e-9), s.code);
}
ok(`déboursé sec cohérent sur les ${SEED_SYSTEMES.length} systèmes`);

/* 3. quantité nette + causes = quantité consommée */
const det = besoinsDetail(projet, sysMap, artMap);
const ec = Object.values(det).map((e) => ecartArticle(e, projet));
for (const x of ec) {
  assert(proche(x.cons, x.nette + x.coupe + x.condit + x.casse + x.reprise + x.residu, 1e-6), x.art.des);
  assert(proche(x.evTot, x.evQte + x.evPrix, 1e-6), x.art.des);
}
ok(`cascade d'écart matière réconciliée sur ${ec.length} articles`);

/* 4. situation : net du mois = net cumulé moins situations précédentes */
const S = situationProjet(projet, sysMap, artMap, p);
assert(proche(S.netMois, S.netCumul - S.netPrecedent, 1e-6));
assert(proche(S.cumulRevise, S.cumulTravaux + S.revision, 1e-6));
ok("situation de travaux réconciliée");

/* 5. totaux projet : marge = vente moins déboursé */
const T = totauxProjet(projet, sysMap, artMap, p);
assert(proche(T.marge, T.pv - T.ds, 1e-6));
ok("marge du projet cohérente");

/* 6. assistant : un critère non renseigné écarte le système */
const cloisons = SEED_SYSTEMES.filter((s) => s.cat === "cd");
const sansCritere = evaluerSysteme({ ...cloisons[0], carac: {} }, { eau: "ea" });
assert.equal(sansCritere.conforme, false);
assert(sansCritere.manquants.length > 0);
const conforme = evaluerSysteme(cloisons[0], { eau: "ea" });
assert.equal(conforme.conforme, true);
ok("filtre de conformité : donnée manquante écartée, donnée conforme retenue");



/* 7. taux de perte : verrouillé, hérité, dérogation */
{
  const { verrouille, herite, perteOf } = await import("../src/domaine/moteur.js");
  const sys = SEED_SYSTEMES.find((s) => s.cat === "cd");
  const vis = sys.lignes.find((l) => l.art === "ac-vis25");
  const plaque = sys.lignes.find((l) => String(l.art).startsWith("pl-"));
  const laine = sys.lignes.find((l) => String(l.art).startsWith("is-"));
  assert.equal(verrouille(vis), true, "les vis sont verrouillées");
  assert.equal(perteOf(vis, sys), 0, "une vis ne subit aucune chute");
  assert.equal(herite(vis), false, "une ligne verrouillée n'est pas une ligne héritée");
  assert.equal(herite(plaque), true, "la plaque hérite du taux du système");
  assert.equal(perteOf(plaque, sys), sys.perteDef);
  assert.equal(perteOf(laine, sys), 5, "l'isolant porte son propre taux");
  const derog = { ...plaque, perte: 14 };
  assert.equal(herite(derog), false);
  assert.equal(perteOf(derog, sys), 14);
  /* le réalignement ne doit jamais toucher une ligne verrouillée */
  const apres = sys.lignes.map((l) => (verrouille(l) ? l : { ...l, perte: null }));
  assert.equal(perteOf(apres.find((l) => l.art === "ac-vis25"), sys), 0);
  const nbDerog = sys.lignes.filter((l) => !herite(l) && !verrouille(l)).length;
  assert.equal(nbDerog, 0, "un système d'amorçage ne comporte aucune dérogation");
  ok("taux de perte : verrouillé à 0, hérité, dérogation réversible");
}


/* 8. hauteurs limites : une par profil, monotones, et sources tracées */
{
  const { hauteursSysteme, HAUTEURS_LIMITES, hauteurParFleche } = await import("../src/domaine/systemes.js");
  for (const profil of Object.keys(HAUTEURS_LIMITES)) {
    for (const parements of [1, 2, 3]) {
      const t = HAUTEURS_LIMITES[profil][parements];
      assert(t[0.4] > t[0.6], `profil ${profil} : l'entraxe resserré doit admettre davantage`);
    }
  }
  let anomalies = 0;
  for (const s of SEED_SYSTEMES) {
    const h = hauteursSysteme(s);
    if (h["0.6"] && h["0.4"] && h["0.4"] < h["0.6"] - 1e-9) anomalies++;
    assert(["table", "catalogue", "calcul", "saisie"].includes(h.source), s.code);
  }
  assert.equal(anomalies, 0, "aucune hauteur ne doit décroître quand l'entraxe se resserre");
  assert(hauteurParFleche(48, 0.5) > hauteurParFleche(48, 0.6), "la flèche décroît avec l'entraxe");
  ok(`hauteurs limites cohérentes sur les ${SEED_SYSTEMES.length} systèmes`);
}

/* 9. taxonomie : chaque catégorie appartient à une famille et une seule */
{
  const { FAMILLES, CATEGORIES, familleDe } = await import("../src/domaine/referentiel.js");
  const vues = FAMILLES.flatMap((f) => f.cats);
  assert.equal(new Set(vues).size, vues.length, "aucune catégorie ne doit figurer dans deux familles");
  for (const c of CATEGORIES) assert(vues.includes(c.id), `catégorie orpheline : ${c.id}`);
  assert.equal(familleDe("cgh"), "cloisons", "la grande hauteur est une cloison");
  for (const s of SEED_SYSTEMES) assert(vues.includes(s.cat), `${s.code} : catégorie ${s.cat} sans famille`);
  ok("taxonomie à deux niveaux complète et sans recouvrement");
}

/* 10. filtrage à facettes : compteurs et résultats concordent */
{
  const { filtrer } = await import("../src/domaine/facettes.js");
  const ctx = { artMap, params: p, entraxe: 0.6 };
  const vide = filtrer(SEED_SYSTEMES, "cloisons", {}, ctx);
  assert.equal(vide.resultats.length, vide.base.length, "sans filtre, tout passe");
  assert(vide.base.length >= 20, "la famille cloisons agrège les quatre sous-catégories");
  const dur = filtrer(SEED_SYSTEMES, "cloisons", { feu: ["EI 60"], db: ["d4", "d5", "d6"], hauteur: 3.5 }, ctx);
  for (const s of dur.resultats) {
    assert(/60|90|120/.test(s.feu), `${s.code} : feu insuffisant`);
    assert((s.carac?.dnt || s.dB) >= 50, `${s.code} : acoustique insuffisante`);
  }
  const sansFeu = filtrer(SEED_SYSTEMES, "cloisons", { db: ["d4", "d5", "d6"], hauteur: 3.5 }, ctx);
  assert(sansFeu.resultats.length >= dur.resultats.length, "relâcher un filtre ne réduit pas le résultat");
  const total = Object.values(vide.compteurs.cat).reduce((a, b) => a + b, 0);
  assert.equal(total, vide.base.length, "les compteurs de sous-catégorie couvrent la base");
  ok(`filtres à facettes : ${dur.resultats.length} cloisons EI 60 · ≥ 50 dB · 3,50 m`);
}
console.log(`\n${n} contrôles passés.`);
