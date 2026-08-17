import React, { useState, useMemo } from "react";
import { csvN, eur, nf, pluriel, telecharger, today, uid } from "../domaine/format.js";
import { SENS } from "../domaine/referentiel.js";
import { lotAchat, nomLot } from "../domaine/articles.js";
import { P } from "../domaine/systemes.js";
import { calculBesoins, couvertureDepot, etatStock } from "../domaine/moteur.js";
import { Num } from "./base.jsx";
import { Achats } from "./Achats.jsx";


/* ================================================================== */
/*  9 bis. Dépôt                                                       */
/* ================================================================== */

export function Depot({ depot, setDepot, articles, artMap, projets, setProjets, sysMap, params }) {
  const [vue, setVue] = useState("stock");
  const [q, setQ] = useState("");
  const stock = useMemo(() => etatStock(depot, artMap), [depot, artMap]);

  const addMv = (m) => setDepot((d) => ({ ...d, mouvements: [...(d.mouvements || []), { id: uid(), date: today(), ...m }] }));
  const valeur = stock.reduce((a, e) => a + Math.max(0, e.valeur), 0);
  const negatifs = stock.filter((e) => e.qte < -0.001);
  const dormants = stock.filter((e) => e.qte > 0 && e.dernier && e.dernier < new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10));

  /* couverture des besoins de chaque projet par le stock disponible */
  const couverture = useMemo(() => projets.map((pr) => {
    const b = calculBesoins(pr, sysMap, artMap, {});
    const c = couvertureDepot(b, stock);
    return {
      projet: pr,
      couvert: c.reduce((a, x) => a + x.couvert * (x.art.prix || 0), 0),
      aCommander: c.reduce((a, x) => a + x.aCommander * (x.art.prix || 0), 0),
      lignes: c.filter((x) => x.couvert > 0),
    };
  }), [projets, stock, sysMap, artMap]);

  const liste = stock.filter((e) => !q.trim() || e.art.des.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="pad">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <div className="chips">
          {[["stock", "État du stock"], ["mouvements", "Mouvements"], ["couverture", "Couverture des chantiers"]].map(([k, lab]) => (
            <button key={k} className={`chip ${vue === k ? "on" : ""}`} onClick={() => setVue(k)}>{lab}</button>
          ))}
        </div>
        <div className="row">
          <input placeholder="Rechercher un article…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 200 }} />
          <button className="btn" onClick={() => {
            const L = ["Article;Marque;Quantite;Unite;PMP;Valeur;Dernier_mouvement"];
            stock.forEach((e) => L.push([e.art.des, e.art.marque, csvN(e.qte, 2), e.art.unite, csvN(e.pmp, 3), csvN(e.valeur), e.dernier].join(";")));
            telecharger(`stock-depot_${today()}.csv`, L.join("\n"));
          }}>Exporter</button>
        </div>
      </div>

      <div className="kpis" style={{ marginBottom: 14 }}>
        <div className="kpi"><span className="eyebrow">Références en stock</span><b>{stock.filter((e) => e.qte > 0).length}</b></div>
        <div className="kpi"><span className="eyebrow">Valeur du stock</span><b style={{ color: "var(--acier)" }}>{eur(valeur)}</b></div>
        <div className="kpi"><span className="eyebrow">Mouvements</span><b>{(depot.mouvements || []).length}</b></div>
        <div className="kpi"><span className="eyebrow">Stock dormant</span><b>{dormants.length}</b><span className="hint mono">plus de 90 jours</span></div>
        <div className="kpi"><span className="eyebrow">Quantités négatives</span><b className={negatifs.length ? "neg" : ""}>{negatifs.length}</b></div>
      </div>

      {vue === "stock" && (
        <div className="card">
          <div className="card-h">
            <h3>État du stock au {today()}</h3>
            <button className="btn sm pri" onClick={() => {
              const nom = prompt("Désignation de l'article à mouvementer ? (recherche par mot-clé)");
              if (!nom) return;
              const a = articles.find((x) => x.des.toLowerCase().includes(nom.toLowerCase()));
              if (!a) { alert("Aucun article ne correspond."); return; }
              addMv({ art: a.id, sens: "entree", qte: 0, pu: a.prix, ref: "", projet: "" });
              setVue("mouvements");
            }}>+ Mouvement</button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr><th>Article</th><th>Marque</th><th className="r">Quantité</th><th className="r">Lots</th>
                <th className="r">P.M.P.</th><th className="r">Valeur</th><th>Dernier mouvement</th><th /></tr></thead>
              <tbody>
                {liste.map((e) => (
                  <tr key={e.art.id}>
                    <td>{e.art.des}</td>
                    <td className="hint">{e.art.marque}</td>
                    <td className={`num ${e.qte < 0 ? "neg" : ""}`} style={{ fontWeight: 500 }}>{nf(e.qte, 2)} <span className="hint">{e.art.unite}</span></td>
                    <td className="num hint">{lotAchat(e.art) > 0 ? `${nf(e.qte / lotAchat(e.art), 1)} ${pluriel(nomLot(e.art), 2)}` : "—"}</td>
                    <td className="num hint">{eur(e.pmp, 3)}</td>
                    <td className="num">{eur(e.valeur)}</td>
                    <td className="hint mono">{e.dernier || "—"}</td>
                    <td className="r" style={{ whiteSpace: "nowrap" }}>
                      <button className="btn sm" title="Sortie vers un chantier" onClick={() => {
                        const pr = projets[0];
                        if (!pr) { alert("Aucun projet ouvert."); return; }
                        const v = prompt(`Sortie de « ${e.art.des} » vers « ${pr.nom} » — quantité en ${e.art.unite} ?`, nf(Math.max(0, e.qte), 2));
                        if (!v) return;
                        const qte = parseFloat(v.replace(",", ".")) || 0;
                        if (qte <= 0) return;
                        addMv({ art: e.art.id, sens: "sortie", qte, pu: e.pmp, projet: pr.id, ref: "" });
                        setProjets((ps) => ps.map((x) => (x.id === pr.id
                          ? { ...x, conso: { ...(x.conso || {}), [e.art.id]: ((x.conso || {})[e.art.id] || 0) + qte } } : x)));
                      }}>Sortir</button>{" "}
                      <button className="btn sm" title="Corriger après inventaire" onClick={() => {
                        const v = prompt(`Quantité comptée en ${e.art.unite} pour « ${e.art.des} » ?`, nf(e.qte, 2));
                        if (v === null) return;
                        addMv({ art: e.art.id, sens: "inventaire", qte: parseFloat(v.replace(",", ".")) || 0, pu: e.pmp, ref: "inventaire" });
                      }}>Inventaire</button>
                    </td>
                  </tr>
                ))}
                {liste.length === 0 && <tr><td colSpan={8} className="empty">Le dépôt est vide. Réceptionne une livraison depuis l'onglet Achats, ou saisis un mouvement.</td></tr>}
                <tr className="tot-row"><td colSpan={5}>Valeur totale</td><td className="num">{eur(valeur)}</td><td colSpan={2} /></tr>
              </tbody>
            </table>
          </div>
          <p className="hint" style={{ padding: "10px 14px", margin: 0 }}>
            Une sortie vers un chantier alimente automatiquement la consommation de ce projet : c'est elle qui nourrit l'écart matière, sans double saisie.
            Une quantité négative signale une sortie non couverte par une entrée — livraison oubliée, ou sortie saisie deux fois.
          </p>
        </div>
      )}

      {vue === "mouvements" && (
        <div className="card">
          <div className="card-h"><h3>Journal des mouvements</h3>
            <span className="hint">{(depot.mouvements || []).length} ligne{(depot.mouvements || []).length > 1 ? "s" : ""}</span></div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr><th>Date</th><th>Sens</th><th>Article</th><th className="r">Quantité</th>
                <th className="r">P.U.</th><th>Chantier</th><th>Référence</th><th /></tr></thead>
              <tbody>
                {[...(depot.mouvements || [])].reverse().map((m) => {
                  const a = artMap[m.art];
                  const set = (v) => setDepot((d) => ({ ...d, mouvements: d.mouvements.map((x) => (x.id === m.id ? { ...x, ...v } : x)) }));
                  return (
                    <tr key={m.id}>
                      <td style={{ width: 124 }}><input className="bare" type="date" value={m.date} onChange={(e) => set({ date: e.target.value })} /></td>
                      <td><select className="bare" value={m.sens} onChange={(e) => set({ sens: e.target.value })} style={{ width: 108 }}>
                        {Object.entries(SENS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td>
                      <td><select className="bare" value={m.art} onChange={(e) => set({ art: e.target.value })} style={{ minWidth: 220 }}>
                        {articles.map((x) => <option key={x.id} value={x.id}>{x.des}</option>)}</select></td>
                      <td style={{ width: 92 }}>
                        <div className="row" style={{ gap: 3, flexWrap: "nowrap" }}>
                          <Num className="bare" value={m.qte} onChange={(v) => set({ qte: v })} />
                          <span className="hint mono">{a?.unite}</span>
                        </div>
                      </td>
                      <td style={{ width: 86 }}><Num className="bare" value={m.pu || 0} onChange={(v) => set({ pu: v })} /></td>
                      <td><select className="bare" value={m.projet || ""} onChange={(e) => set({ projet: e.target.value })} style={{ width: 130 }}>
                        <option value="">— dépôt</option>{projets.map((pr) => <option key={pr.id} value={pr.id}>{pr.nom}</option>)}</select></td>
                      <td><input className="bare mono" value={m.ref || ""} placeholder="BL, commande…" onChange={(e) => set({ ref: e.target.value })} /></td>
                      <td className="r"><button className="btn sm danger" onClick={() => setDepot((d) => ({ ...d, mouvements: d.mouvements.filter((x) => x.id !== m.id) }))} aria-label="Supprimer">×</button></td>
                    </tr>
                  );
                })}
                {(depot.mouvements || []).length === 0 && <tr><td colSpan={8} className="empty">Aucun mouvement enregistré.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {vue === "couverture" && (
        <div className="card">
          <div className="card-h"><h3>Ce que le dépôt couvre sur les chantiers en cours</h3></div>
          <table>
            <thead><tr><th>Chantier</th><th>Statut</th><th className="r">Couvert par le stock</th><th className="r">Reste à commander</th><th className="r">Références couvertes</th></tr></thead>
            <tbody>
              {couverture.map((c) => (
                <tr key={c.projet.id}>
                  <td>{c.projet.nom}</td>
                  <td className="hint">{c.projet.statut}</td>
                  <td className="num" style={{ color: "var(--acier)" }}>{eur(c.couvert)}</td>
                  <td className="num">{eur(c.aCommander)}</td>
                  <td className="num hint">{c.lignes.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hint" style={{ padding: "10px 14px", margin: 0 }}>
            À regarder avant de passer commande : ce qui dort au dépôt a déjà été payé. Le calcul compare le besoin théorique de chaque chantier au disponible, sans réservation ni priorité entre affaires.
          </p>
        </div>
      )}
    </div>
  );
}
