import React from "react";
import { eur, nf, uid } from "../domaine/format.js";
import { DEVIS_DEF, MARCHE_DEF } from "../domaine/referentiel.js";
import { A } from "../domaine/articles.js";
import { totauxProjet } from "../domaine/moteur.js";


/* ================================================================== */
/*  7. Portefeuille de projets                                         */
/* ================================================================== */

export function Portefeuille({ projets, setProjets, sysMap, artMap, params, ouvrir }) {
  const creer = () => {
    const nom = prompt("Nom du projet ?", "Tour B");
    if (!nom) return;
    const n = {
      id: uid(), nom, client: "", statut: "Étude", zones: ["Zone A"], niveaux: ["RDC"],
      variantes: ["Base"], varianteActive: "Base", situationNum: 1,
      marche: { ...MARCHE_DEF }, pointages: [], ts: [], histoSit: [], devis: { ...DEVIS_DEF },
      postes: [], fraisChantier: [], ouvrages: [], commandes: [], conso: {},
      casseDef: 1.0, repriseDef: 1.2, ecartArt: {},
    };
    setProjets((ps) => [...ps, n]); ouvrir(n.id);
  };
  const total = projets.reduce((a, p) => {
    const t = totauxProjet(p, sysMap, artMap, params);
    return { ds: a.ds + t.ds, pv: a.pv + t.pv, qte: a.qte + t.qte, h: a.h + t.h };
  }, { ds: 0, pv: 0, qte: 0, h: 0 });
  const enCours = projets.filter((p) => ["Obtenu", "En cours"].includes(p.statut));
  const caEnCours = enCours.reduce((a, p) => a + totauxProjet(p, sysMap, artMap, params).pv, 0);

  return (
    <div className="pad">
      <div className="kpis" style={{ marginBottom: 14 }}>
        <div className="kpi"><span className="eyebrow">Projets</span><b>{projets.length}</b></div>
        <div className="kpi"><span className="eyebrow">Quantité totale</span><b>{nf(total.qte, 0)}</b></div>
        <div className="kpi"><span className="eyebrow">Heures</span><b>{nf(total.h, 0)} h</b></div>
        <div className="kpi"><span className="eyebrow">Déboursé cumulé</span><b>{eur(total.ds)}</b></div>
        <div className="kpi"><span className="eyebrow">Vente HT cumulée</span><b style={{ color: "var(--acier)" }}>{eur(total.pv)}</b></div>
        <div className="kpi"><span className="eyebrow">Dont obtenu</span><b>{eur(caEnCours)}</b></div>
      </div>

      <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <span className="eyebrow">Portefeuille</span>
        <button className="btn pri" onClick={creer}>+ Nouveau projet</button>
      </div>

      {projets.length === 0 ? (
        <div className="card empty">Aucun projet. Crée le premier pour commencer le métré.</div>
      ) : (
        <div className="prj-grid">
          {projets.map((p) => {
            const t = totauxProjet(p, sysMap, artMap, params);
            return (
              <div className="prj" key={p.id}>
                <div className="prj-h">
                  <span className="eyebrow">{p.statut || "Étude"}{p.client ? ` · ${p.client}` : ""}</span>
                  <h4>{p.nom}</h4>
                </div>
                <div className="prj-b">
                  <div><span className="eyebrow">Ouvrages</span><b className="mono">{p.ouvrages.length}</b></div>
                  <div><span className="eyebrow">Quantité</span><b className="mono">{nf(t.qte, 0)}</b></div>
                  <div><span className="eyebrow">Zones / niveaux</span><b className="mono">{(p.zones || []).length} / {(p.niveaux || []).length}</b></div>
                  <div><span className="eyebrow">Heures</span><b className="mono">{nf(t.h, 0)} h</b></div>
                  <div><span className="eyebrow">Déboursé sec</span><b className="mono">{eur(t.ds)}</b></div>
                  <div><span className="eyebrow">Vente HT</span><b className="mono" style={{ color: "var(--acier)" }}>{eur(t.pv)}</b></div>
                  <div><span className="eyebrow">Marge</span><b className="mono">{eur(t.marge)}</b></div>
                  <div><span className="eyebrow">Taux de marque</span><b className="mono">{nf(t.tauxMarque, 1)} %</b></div>
                </div>
                <div className="prj-f">
                  <button className="btn sm pri" onClick={() => ouvrir(p.id)}>Ouvrir</button>
                  <button className="btn sm" onClick={() => {
                    const n = { ...p, id: uid(), nom: `${p.nom} (copie)`, ouvrages: p.ouvrages.map((o) => ({ ...o, id: uid() })), commandes: [] };
                    setProjets((ps) => [...ps, n]);
                  }}>Dupliquer</button>
                  <button className="btn sm danger" style={{ marginLeft: "auto" }} onClick={() => {
                    if (confirm(`Supprimer le projet « ${p.nom} » et son métré ?`)) setProjets((ps) => ps.filter((x) => x.id !== p.id));
                  }}>Supprimer</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
