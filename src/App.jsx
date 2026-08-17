import React, { useState, useEffect, useMemo } from "react";
import { nf, today, uid } from "./domaine/format.js";
import { DEFAULT_PARAMS, DEVIS_DEF, ENTREPRISE_DEF, FOURNISSEURS_SEED, MARCHE_DEF, MARQUES_SEED, OLD_KEYS, STORE_KEY , familleDe } from "./domaine/referentiel.js";
import { DIM_ART, PALETTE_DEF, POIDS_ART, POIDS_DEF, SEED_ARTICLES } from "./domaine/articles.js";
import { HSP_REF, SANS_PERTE, SEED_SYSTEMES } from "./domaine/systemes.js";
import { SEED_PROJETS } from "./domaine/projets.js";
import { coefEntreprise } from "./domaine/moteur.js";
import { PHOTO_PREFIX, chargerPhotos } from "./domaine/photos.js";
import { CSS } from "./styles.js";
import { Bibliotheque } from "./ui/Bibliotheque.jsx";
import { Articles } from "./ui/Articles.jsx";
import { Portefeuille } from "./ui/Portefeuille.jsx";
import { Projet } from "./ui/Projet.jsx";
import { Achats } from "./ui/Achats.jsx";
import { Depot } from "./ui/Depot.jsx";
import { Parametres } from "./ui/Parametres.jsx";


/* ================================================================== */
/*  11. Application                                                    */
/* ================================================================== */

export const NAV = [
  ["biblio", "Bibliothèque"],
  ["articles", "Articles & prix"],
  ["projets", "Projets"],
  ["achats", "Achats"],
  ["depot", "Dépôt"],
  ["params", "Paramètres"],
];


/* Normalisation : complète les données anciennes ou importées */
export function normaliser(d) {
  const articles = (d.articles || SEED_ARTICLES).map((a) => {
    const [long = 0, larg = 0, coupe = "aucune"] = DIM_ART[a.id] || [];
    return {
      poids: POIDS_ART[a.id] ?? POIDS_DEF[a.famille] ?? 1,
      parPalette: PALETTE_DEF[a.famille] ?? 20, long, larg, coupe, paletteEntiere: false,
      marge: null, histo: [{ date: today(), prix: a.prix }],
      ...a,
      fournisseurs: (a.fournisseurs || []).map((f) => ({ ref: "", libelle: "", ...f })),
    };
  });
  /* A.2 — « hb » mélangeait deux ouvrages : arbitrage sur le type et les
     caractéristiques, prudence en cas de doute, le système reste à vérifier.
     E.2 — l'ancien 0 forcé des articles comptés à la pièce redevient un héritage. */
  const migrerCat = (s) => {
    if (s.cat !== "hb") return s.cat;
    if (s.carac?.exterieur === "Oui" || /bardage|aquapanel/i.test(s.nom || "")) return "bar";
    return "ps";
  };
  const systemes = (d.systemes || SEED_SYSTEMES).map((s) => {
    const cat = migrerCat(s);
    return {
      entraxe: 0.6, hsp: HSP_REF, materiel: 0.3, dechetsSup: 0.15, perteDef: 8, repart: null, type: "cloison",
      carac: {},
      ...s,
      cat, famille: familleDe(cat),
      verif: s.cat === "hb" ? true : s.verif,
      lignes: (s.lignes || []).map((l) => ({
        calc: "fixe", ...l,
        perte: SANS_PERTE.has(l.art) && (l.perte === 0 || l.perte === undefined) ? null : l.perte ?? null,
      })),
    };
  });
  const projets = (d.projets || SEED_PROJETS).map((p) => ({
    variantes: ["Base"], varianteActive: "Base", situationNum: 1, postes: [], fraisChantier: [],
    marche: { ...MARCHE_DEF }, pointages: [], ts: [], histoSit: [], devis: { ...DEVIS_DEF },
    commandes: [], conso: {}, casseDef: 1.0, repriseDef: 1.2, ecartArt: {},
    zones: Array.from(new Set((p.ouvrages || []).map((o) => o.zone).filter(Boolean))),
    niveaux: Array.from(new Set((p.ouvrages || []).map((o) => o.niveau).filter(Boolean))),
    ...p,
    ouvrages: (p.ouvrages || []).map((o) => ({
      variante: "Base", poste: "", mode: "direct", nb: 1, long: 0, hsp: 2.5, deduc: 0, avPrec: 0, avAct: 0, ...o,
    })),
  }));
  return {
    articles, systemes, projets,
    marques: d.marques?.length ? d.marques : MARQUES_SEED,
    fournisseurs: d.fournisseurs?.length ? d.fournisseurs : FOURNISSEURS_SEED,
    params: {
      ...DEFAULT_PARAMS, ...(d.params || {}),
      entreprise: { ...ENTREPRISE_DEF, ...((d.params || {}).entreprise || {}) },
    },
    depot: { mouvements: [], ...(d.depot || {}) },
  };
}


export default function App() {
  const [tab, setTab] = useState("biblio");
  const [articles, setArticles] = useState(SEED_ARTICLES);
  const [systemes, setSystemes] = useState(SEED_SYSTEMES);
  const [projets, setProjets] = useState(SEED_PROJETS);
  const [marques, setMarques] = useState(MARQUES_SEED);
  const [fournisseurs, setFournisseurs] = useState(FOURNISSEURS_SEED);
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [depot, setDepot] = useState({ mouvements: [] });
  const [photos, setPhotos] = useState({});
  const [projetId, setProjetId] = useState(null);
  const [achatId, setAchatId] = useState(SEED_PROJETS[0].id);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState("");

  const appliquer = (d) => {
    if (d.photos) Object.entries(d.photos).forEach(([id, url]) => { if (url) setPhoto(id, url); });
    const n = normaliser(d);
    setArticles(n.articles); setSystemes(n.systemes); setProjets(n.projets);
    setMarques(n.marques); setFournisseurs(n.fournisseurs); setParams(n.params); setDepot(n.depot);
    setAchatId(n.projets[0]?.id || null);
  };

  useEffect(() => {
    (async () => {
      let d = null;
      try { const r = await window.storage.get(STORE_KEY); if (r?.value) d = JSON.parse(r.value); } catch { /* première ouverture */ }
      if (!d) {
        for (const k of OLD_KEYS) {
          try {
            const r = await window.storage.get(k);
            if (r?.value) {
              const o = JSON.parse(r.value);
              d = {
                params: o.params, projets: o.projets, marques: o.marques,
                articles: SEED_ARTICLES.map((a) => {
                  const anc = (o.articles || []).find((x) => x.id === a.id);
                  return anc ? { ...a, prix: anc.prix, colis: anc.colis, parColis: anc.parColis } : a;
                }),
                systemes: [...SEED_SYSTEMES, ...(o.systemes || []).filter((s) => !SEED_SYSTEMES.some((n) => n.id === s.id))],
              };
              break;
            }
          } catch { /* rien à migrer */ }
        }
      }
      if (d) appliquer(d);
      setPhotos(await chargerPhotos());
      setLoaded(true);
    })();
  }, []);

  const data = useMemo(() => ({ articles, systemes, projets, marques, fournisseurs, params, depot }),
    [articles, systemes, projets, marques, fournisseurs, params, depot]);

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(async () => {
      try {
        await window.storage.set(STORE_KEY, JSON.stringify(data));
        setSaved(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
      } catch { setSaved("échec"); }
    }, 700);
    return () => clearTimeout(t);
  }, [data, loaded]);

  /* chaque visuel a sa propre clé : écriture immédiate, sans réécrire les autres,
     et sans plafond global sur l'ensemble de la photothèque */
  const setPhoto = async (id, dataUrl) => {
    setPhotos((ph) => {
      const nv = { ...ph };
      if (dataUrl) nv[id] = dataUrl; else delete nv[id];
      return nv;
    });
    try {
      if (dataUrl) await window.storage.set(PHOTO_PREFIX + id, dataUrl);
      else await window.storage.delete(PHOTO_PREFIX + id);
    } catch {
      alert("Ce visuel n'a pas pu être enregistré : il dépasse la taille autorisée pour une image.");
      setPhotos((ph) => { const nv = { ...ph }; delete nv[id]; return nv; });
    }
  };

  const artMap = useMemo(() => Object.fromEntries(articles.map((a) => [a.id, a])), [articles]);
  const sysMap = useMemo(() => Object.fromEntries(systemes.map((s) => [s.id, s])), [systemes]);
  const projet = projets.find((p) => p.id === projetId) || null;
  const projetAchat = projets.find((p) => p.id === achatId) || projets[0] || null;

  const addMarque = (nom) => setMarques((ms) => (ms.some((m) => m.nom === nom) ? ms : [...ms, { id: uid(), nom }]));
  const addFournisseur = (nom) => setFournisseurs((fs) => (fs.some((f) => f.nom === nom) ? fs : [...fs, { id: uid(), nom }]));
  const patchP = (p) => setProjets((ps) => ps.map((x) => (x.id === projetId ? { ...x, ...p } : x)));
  const patchAchat = (p) => setProjets((ps) => ps.map((x) => (x.id === projetAchat?.id ? { ...x, ...p } : x)));

  const reset = () => {
    if (!confirm("Tout remettre à l'état d'origine ? Les projets, prix et commandes saisis seront perdus.")) return;
    appliquer({});
    if (confirm("Supprimer également les photographies des systèmes ?")) setPhotos({});
    setProjetId(null); setTab("biblio");
  };

  const K = coefEntreprise(params);
  const titre = tab === "projets" ? (projet ? projet.nom : "Portefeuille de projets")
    : tab === "achats" ? (projetAchat ? `Achats — ${projetAchat.nom}` : "Achats")
      : tab === "depot" ? "Dépôt"
      : tab === "articles" ? "Articles et prix"
        : tab === "params" ? "Paramètres" : "Bibliothèque de systèmes";

  const sousTitre = {
    biblio: "Systèmes Placo, Knauf, Siniat et internes — nomenclature, sous-détail et prix de vente",
    articles: "Prix d'achat, marges, colisage, poids et prix fournisseurs",
    projets: projet ? "Métré, variantes, DPGF, situation" : "Vue d'ensemble des affaires en cours",
    achats: "Besoins, logistique, commandes et suivi des écarts",
    depot: "Stock, mouvements et couverture des chantiers",
    params: "Politique de prix, main d'œuvre, marques et fournisseurs",
  }[tab];

  return (
    <div className="cq">
      <style>{CSS}</style>
      <div className="shell">
        <header className="bandeau">
          <div className="bandeau-in">
            <div className="row" style={{ gap: 26, minWidth: 0 }}>
              <div className="logo"><span>PLAZMA</span><i /></div>
              <div className="nav">
                {NAV.map(([k, lab]) => (
                  <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{lab}</button>
                ))}
              </div>
            </div>
            <div className="bandeau-fin">
              <span className="k">{saved ? `Enregistré ${saved}` : "Enregistrement auto"}</span>
              <span className="k">Coefficient</span><b>{nf(K, 4)}</b>
            </div>
          </div>
        </header>

        <main className="main">
          <header className="cartouche">
            <div className="cartouche-top">
              <div>
                <span className="eyebrow">{NAV.find(([k]) => k === tab)?.[1]}</span>
                <h2 className="titre">{titre}</h2>
                <p className="sub">{sousTitre}</p>
              </div>
              <div className="cart-fields">
                <div className="cart-f"><span>Systèmes</span><b>{systemes.length}</b></div>
                <div className="cart-f"><span>Articles</span><b>{articles.length}</b></div>
                <div className="cart-f"><span>Coefficient</span><b>{nf(K, 4)}</b></div>
                <div className="cart-f"><span>Marque</span><b>{nf(((K - 1) / K) * 100, 1)} %</b></div>
              </div>
            </div>
            {tab === "achats" && projets.length > 0 && (
              <div className="tabs" style={{ borderTop: "1px solid var(--line2)", marginTop: 10, paddingTop: 2 }}>
                {projets.map((p) => (
                  <button key={p.id} className={projetAchat?.id === p.id ? "on" : ""} onClick={() => setAchatId(p.id)}>{p.nom}</button>
                ))}
              </div>
            )}
            {tab !== "achats" && <div style={{ height: 12 }} />}
          </header>

          {tab === "biblio" && (
            <Bibliotheque systemes={systemes} setSystemes={setSystemes} articles={articles} artMap={artMap}
              params={params} projets={projets} setProjets={setProjets} marques={marques} addMarque={addMarque}
              photos={photos} setPhoto={setPhoto} />
          )}
          {tab === "articles" && (
            <Articles articles={articles} setArticles={setArticles} systemes={systemes} marques={marques}
              addMarque={addMarque} fournisseurs={fournisseurs} addFournisseur={addFournisseur} params={params} />
          )}
          {tab === "projets" && (projet
            ? <Projet projet={projet} patchP={patchP} systemes={systemes} sysMap={sysMap} artMap={artMap}
              params={params} setSystemes={setSystemes} photos={photos} retour={() => setProjetId(null)} />
            : <Portefeuille projets={projets} setProjets={setProjets} sysMap={sysMap} artMap={artMap}
              params={params} ouvrir={(id) => setProjetId(id)} />
          )}
          {tab === "achats" && (
            <Achats projet={projetAchat} patchP={patchAchat} sysMap={sysMap} artMap={artMap}
              params={params} fournisseurs={fournisseurs} setSystemes={setSystemes} />
          )}
          {tab === "depot" && (
            <Depot depot={depot} setDepot={setDepot} articles={articles} artMap={artMap}
              projets={projets} setProjets={setProjets} sysMap={sysMap} params={params} />
          )}
          {tab === "params" && (
            <Parametres params={params} setParams={setParams} marques={marques} setMarques={setMarques}
              fournisseurs={fournisseurs} setFournisseurs={setFournisseurs} articles={articles} setArticles={setArticles}
              data={data} photos={photos} setPhoto={setPhoto} importer={appliquer} reset={reset} />
          )}
        </main>
      </div>
    </div>
  );
}
