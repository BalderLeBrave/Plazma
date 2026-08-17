import React, { useState } from "react";
import { csvN, eur, nf, telecharger, uid } from "../domaine/format.js";
import { CARAC, CATEGORIES, CAT_MAP, CLASSE_EAU_MAP, ENTRAXES } from "../domaine/referentiel.js";
import { P, PERTE_ART, hauteurMax, ratioMontant, ratioRail } from "../domaine/systemes.js";
import { coefEntreprise, coutSysteme, herite, perteOf, qteLigne, verrouille } from "../domaine/moteur.js";
import { Coupe, Num, SelectListe, ZonePhoto } from "./base.jsx";


export function SystemeDrawer({ sys, patch, articles, artMap, params, onClose, onDup, onDel, projets, setProjets, marques, addMarque, photos = {}, setPhoto = () => {} }) {
  const c = coutSysteme(sys, artMap, params);
  const [addTo, setAddTo] = useState(projets[0]?.id || "");
  const [sd, setSd] = useState(false);
  const rep = sys.repart || params.repartDefaut;
  const K = coefEntreprise(params);
  const nbDerog = (sys.lignes || []).filter((l) => !herite(l) && !verrouille(l)).length;

  const setLigne = (lid, p) => patch(sys.id, { lignes: sys.lignes.map((l) => (l.id === lid ? { ...l, ...p } : l)) });
  const addLigne = () => patch(sys.id, { lignes: [...sys.lignes, { id: uid(), art: articles[0]?.id, ratio: 1, perte: null, calc: "fixe" }] });

  const recalculerOssature = () => {
    patch(sys.id, {
      lignes: sys.lignes.map((l) => {
        if (l.calc === "rail") return { ...l, ratio: Math.round(ratioRail(sys.hsp) * 1000) / 1000 };
        if (l.calc === "montant") return { ...l, ratio: Math.round(ratioMontant(sys.entraxe) * 1000) / 1000 };
        return l;
      }),
    });
  };

  const injecter = () => {
    const p = projets.find((x) => x.id === addTo);
    if (!p) return;
    setProjets((ps) => ps.map((x) => x.id === addTo ? {
      ...x, ouvrages: [...x.ouvrages, {
        id: uid(), sys: sys.id, zone: x.zones?.[0] || "", niveau: x.niveaux?.[0] || "", local: "",
        variante: x.varianteActive || "Base", poste: "", mode: "direct", qte: 0, avPrec: 0, avAct: 0,
      }],
    } : x));
    onClose();
  };

  const exportSousDetail = () => {
    const L = [`Sous-detail de prix;${sys.code};${sys.nom}`, `Unite;${sys.unite}`, "",
      "Poste;Designation;Quantite;Unite;PU HT;Montant"];
    sys.lignes.forEach((lg) => {
      const a = artMap[lg.art];
      if (!a) return;
      const q = qteLigne(lg, 1, sys);
      L.push(["Fourniture", a.des, csvN(q, 3), a.unite, csvN(a.prix, 3), csvN(q * a.prix)].join(";"));
    });
    (params.qualifs || []).forEach((qu) => {
      const h = (sys.mo || 0) * ((rep[qu.id] || 0) / 100);
      if (h > 0) L.push(["Main d'oeuvre", qu.nom, csvN(h, 3), "h", csvN(qu.taux), csvN(h * qu.taux)].join(";"));
    });
    L.push(["Materiel", "Materiel et consommables", "1", sys.unite, csvN(c.materiel), csvN(c.materiel)].join(";"));
    L.push(["Dechets", "Evacuation et tri", csvN(c.dechets, 3), "kg", csvN((params.prixBenne || 0) / 1000, 4), csvN(c.coutDechets)].join(";"));
    L.push("", `Debourse sec;;;;;${csvN(c.ds)}`);
    L.push(`Frais generaux + benefice (${params.modeCoef === "ca" ? "% du PV" : "majoration"});;;;;${csvN(c.pv - c.ds)}`);
    L.push(`Prix de vente HT;;;;;${csvN(c.pv)}`);
    telecharger(`sous-detail_${sys.code.replace(/[^\w]+/g, "-")}.csv`, L.join("\n"));
  };

  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={sys.nom}>
        <div className="drawer-h">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <span className="eyebrow">{CAT_MAP[sys.cat]?.nom} · {sys.marque}</span>
              <input className="bare" style={{ fontSize: 17, fontWeight: 600, marginTop: 2 }}
                value={sys.nom} onChange={(e) => patch(sys.id, { nom: e.target.value })} />
            </div>
            <button className="btn sm" onClick={onClose}>Fermer</button>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn sm" onClick={onDup}>Dupliquer</button>
            <button className="btn sm" onClick={exportSousDetail}>Sous-détail CSV</button>
            <button className="btn sm danger" onClick={onDel}>Supprimer</button>
            <span style={{ flex: 1 }} />
            <select value={addTo} onChange={(e) => setAddTo(e.target.value)} style={{ width: 128 }}>
              {projets.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
            <button className="btn sm pri" onClick={injecter}>Ajouter au projet</button>
          </div>
        </div>

        <div style={{ padding: "16px 18px" }}>
          {sys.verif && (
            <p className="hint" style={{ marginTop: 0 }}>
              <span className="bdg verif">à vérifier</span>{" "}
              Performances et ratios indicatifs : recale-les sur la fiche technique et le PV d'essai du fabricant.
            </p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
            <div>
              <ZonePhoto src={photos[sys.id] || null} onChange={(v) => setPhoto(sys.id, v)} />
              <div style={{ marginTop: 10 }}><Coupe sys={sys} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label className="fld"><span>Code</span>
                <input className="mono" value={sys.code} onChange={(e) => patch(sys.id, { code: e.target.value })} /></label>
              <label className="fld"><span>Catégorie</span>
                <select value={sys.cat} onChange={(e) => patch(sys.id, { cat: e.target.value })}>
                  {CATEGORIES.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
                </select></label>
              <label className="fld"><span>Marque</span>
                <SelectListe value={sys.marque} items={marques} onCreate={addMarque} libelle="marque"
                  onChange={(v) => patch(sys.id, { marque: v })} /></label>
              <label className="fld"><span>Unité</span>
                <select value={sys.unite} onChange={(e) => patch(sys.id, { unite: e.target.value })}>
                  {["m²", "ml", "u"].map((u) => <option key={u}>{u}</option>)}
                </select></label>
              <label className="fld"><span>Épaisseur mm</span><Num value={sys.ep} onChange={(v) => patch(sys.id, { ep: v })} /></label>
              <label className="fld"><span>Affaibl. dB</span><Num value={sys.dB} onChange={(v) => patch(sys.id, { dB: v })} /></label>
              <label className="fld"><span>Feu</span><input className="mono" value={sys.feu} onChange={(e) => patch(sys.id, { feu: e.target.value })} /></label>
              <label className="fld"><span>Entraxe retenu m</span>
                <select value={String(sys.entraxe)} onChange={(e) => patch(sys.id, { entraxe: parseFloat(e.target.value) })}>
                  {ENTRAXES.map((e) => <option key={e} value={String(e)}>{nf(e, 2)}</option>)}
                </select></label>
            </div>
          </div>

          <div className="sep" />
          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
            <div className="row" style={{ gap: 10 }}>
              <label className="fld" style={{ width: 96 }}><span>HSP réf. m</span>
                <Num value={sys.hsp} onChange={(v) => patch(sys.id, { hsp: v })} /></label>
              <label className="fld" style={{ width: 96 }}><span>Entraxe m</span>
                <Num value={sys.entraxe} onChange={(v) => patch(sys.id, { entraxe: v })} /></label>
              <button className="btn sm" onClick={recalculerOssature} style={{ marginBottom: 1 }}>Recalculer l'ossature</button>
            </div>
            <span className="hint">rails 2 / HSP = {nf(ratioRail(sys.hsp), 3)} ml · montants 1 / entraxe = {nf(ratioMontant(sys.entraxe), 3)} ml</span>
          </div>

          <div className="row" style={{ marginTop: 12, gap: 10, alignItems: "flex-end" }}>
            <label className="fld" style={{ width: 128 }}><span>Perte du système %</span>
              <Num value={sys.perteDef ?? 0} onChange={(v) => patch(sys.id, { perteDef: v })} /></label>
            <button className="btn sm" style={{ marginBottom: 1 }} disabled={nbDerog === 0}
              onClick={() => {
                if (!confirm("Remettre les lignes dérogeantes sur le taux du système ?\n\nLes articles comptés à la pièce conservent leur taux nul.")) return;
                patch(sys.id, { lignes: sys.lignes.map((l) => (verrouille(l) ? l : { ...l, perte: null })) });
              }}>Tout réaligner</button>
            <span className="hint" style={{ paddingBottom: 6 }}>
              {nbDerog === 0 ? "Toutes les lignes suivent le taux du système."
                : `${nbDerog} ligne${nbDerog > 1 ? "s" : ""} ${nbDerog > 1 ? "dérogent" : "déroge"} au taux du système.`}
            </span>
          </div>

          <div className="row" style={{ justifyContent: "space-between", marginTop: 14 }}>
            <h3 style={{ margin: 0, fontSize: 13 }}>Nomenclature <span className="hint">— quantité par {sys.unite} d'ouvrage</span></h3>
            <button className="btn sm" onClick={addLigne}>+ Ligne</button>
          </div>

          <table style={{ marginTop: 8 }}>
            <thead>
              <tr><th>Article</th><th>Calcul</th><th className="r">Ratio</th><th className="r">Perte %</th>
                <th className="r">Qté</th><th className="r">P.U.</th><th className="r">Montant</th><th /></tr>
            </thead>
            <tbody>
              {sys.lignes.map((lg) => {
                const a = artMap[lg.art];
                const q = qteLigne(lg, 1, sys);
                return (
                  <tr key={lg.id}>
                    <td>
                      <select className="bare" value={lg.art} onChange={(e) => setLigne(lg.id, { art: e.target.value })} style={{ minWidth: 175 }}>
                        {articles.map((x) => <option key={x.id} value={x.id}>{x.des}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="bare" value={lg.calc || "fixe"} onChange={(e) => setLigne(lg.id, { calc: e.target.value })} style={{ width: 92 }}>
                        <option value="fixe">Fixe</option><option value="rail">Rail</option><option value="montant">Montant</option>
                      </select>
                    </td>
                    <td style={{ width: 72 }}><Num className="bare" value={lg.ratio} onChange={(v) => setLigne(lg.id, { ratio: v })} /></td>
                    <td style={{ width: 104 }}>
                      {verrouille(lg) ? (
                        <div className="row" style={{ gap: 4, flexWrap: "nowrap" }}
                          title="Article compté à la pièce : pas de chute de débit">
                          <span className="num hint" style={{ width: 54 }}>0</span>
                          <span className="bdg">pièce</span>
                        </div>
                      ) : (
                        <div className="row" style={{ gap: 2, flexWrap: "nowrap" }}>
                          <Num className={`bare ${herite(lg) ? "inherit" : ""}`} style={{ width: 54 }}
                            title={herite(lg) ? "Taux hérité" : "Taux propre à cette ligne"}
                            value={perteOf(lg, sys)} onChange={(v) => setLigne(lg.id, { perte: v })} />
                          {herite(lg)
                            ? <span className="hint" title={PERTE_ART[lg.art] !== undefined ? "taux propre à l'article" : "taux du système"}>↳</span>
                            : <button className="btn sm" title="Revenir au taux hérité"
                              onClick={() => setLigne(lg.id, { perte: null })}>↺</button>}
                        </div>
                      )}
                    </td>
                    <td className="num">{nf(q, 3)} <span className="hint">{a?.unite}</span></td>
                    <td className="num hint">{a ? eur(a.prix, 3) : "—"}</td>
                    <td className="num">{eur(q * (a?.prix || 0))}</td>
                    <td className="r"><button className="btn sm danger" onClick={() => patch(sys.id, { lignes: sys.lignes.filter((l) => l.id !== lg.id) })} aria-label="Supprimer la ligne">×</button></td>
                  </tr>
                );
              })}
              {sys.lignes.length === 0 && <tr><td colSpan={8} className="empty">Nomenclature vide. Ajoute une première ligne.</td></tr>}
              <tr className="tot-row"><td colSpan={6}>Fournitures</td><td className="num">{eur(c.mat)}</td><td /></tr>
            </tbody>
          </table>

          <div className="sep" />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, fontSize: 13 }}>Caractéristiques — {CAT_MAP[sys.cat]?.nom}</h3>
            <span className="hint">critères propres à cette famille d'ouvrage</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
            {(CARAC[sys.cat] || []).map((c) => {
              const val = (sys.carac || {})[c.id];
              const setCar = (v) => patch(sys.id, { carac: { ...(sys.carac || {}), [c.id]: v } });
              if (c.type === "h") return (
                <div key={c.id} style={{ gridColumn: "1 / -1" }}>
                  <span className="eyebrow">{c.lab}</span>
                  <div className="row" style={{ gap: 10, marginTop: 4 }}>
                    {ENTRAXES.map((e) => (
                      <label className="fld" key={e} style={{ width: 128 }}>
                        <span>entraxe {nf(e, 2)} m</span>
                        <Num value={(val || {})[String(e)] || 0}
                          onChange={(v) => setCar({ ...(val || {}), [String(e)]: v })} />
                      </label>
                    ))}
                    <span className="hint" style={{ paddingBottom: 6 }}>
                      hauteur retenue au chiffrage : {nf(hauteurMax(sys, sys.entraxe), 2)} m à l'entraxe {nf(sys.entraxe, 2)} m
                    </span>
                  </div>
                </div>
              );
              if (c.type === "m") return (
                <div key={c.id} style={{ gridColumn: "1 / -1" }}>
                  <span className="eyebrow">{c.lab}</span>
                  <div className="chips" style={{ marginTop: 4 }}>
                    {c.opts.map((o) => {
                      const on = Array.isArray(val) && val.includes(o);
                      return (
                        <button key={o} className={`chip ${on ? "on" : ""}`}
                          title={CLASSE_EAU_MAP[o]?.desc || ""}
                          onClick={() => setCar(on ? val.filter((x) => x !== o) : [...(val || []), o])}>
                          {c.fmt ? c.fmt(o) : o}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
              if (c.type === "l") return (
                <label className="fld" key={c.id}><span>{c.lab}</span>
                  <select value={val || ""} onChange={(e) => setCar(e.target.value)}>
                    <option value="">—</option>
                    {c.opts.map((o) => <option key={o}>{o}</option>)}
                  </select></label>
              );
              if (c.type === "n") return (
                <label className="fld" key={c.id}><span>{c.lab}{c.unite ? ` ${c.unite}` : ""}</span>
                  <Num value={val || 0} onChange={setCar} /></label>
              );
              return (
                <label className="fld" key={c.id}><span>{c.lab}</span>
                  <input value={val || ""} onChange={(e) => setCar(e.target.value)} /></label>
              );
            })}
          </div>

          <div className="sep" />
          <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>Main d'œuvre, matériel et déchets</h3>
          <div className="row" style={{ gap: 10, alignItems: "flex-end" }}>
            <label className="fld" style={{ width: 104 }}><span>Total h/{sys.unite}</span>
              <Num value={sys.mo} onChange={(v) => patch(sys.id, { mo: v })} /></label>
            {(params.qualifs || []).map((qu) => (
              <label className="fld" key={qu.id} style={{ width: 96 }}><span>{qu.nom} %</span>
                <Num value={rep[qu.id] || 0} onChange={(v) => patch(sys.id, { repart: { ...rep, [qu.id]: v } })} /></label>
            ))}
            <span className="hint" style={{ paddingBottom: 6 }}>taux moyen {nf(c.tauxH)} €/h</span>
          </div>
          <div className="row" style={{ gap: 10, alignItems: "flex-end", marginTop: 10 }}>
            <label className="fld" style={{ width: 128 }}><span>Matériel €/{sys.unite}</span>
              <Num value={sys.materiel} onChange={(v) => patch(sys.id, { materiel: v })} /></label>
            <label className="fld" style={{ width: 148 }}><span>Déchets hors chutes kg</span>
              <Num value={sys.dechetsSup} onChange={(v) => patch(sys.id, { dechetsSup: v })} /></label>
            <span className="hint" style={{ paddingBottom: 6 }}>
              chutes calculées {nf(c.dechets - (sys.dechetsSup || 0), 2)} kg · total {nf(c.dechets, 2)} kg → {eur(c.coutDechets)}
            </span>
          </div>

          <div className="kpis" style={{ marginTop: 14 }}>
            <div className="kpi"><span className="eyebrow">Fournitures</span><b>{eur(c.mat)}</b></div>
            <div className="kpi"><span className="eyebrow">Main d'œuvre</span><b>{eur(c.mo)}</b></div>
            <div className="kpi"><span className="eyebrow">Matériel + déchets</span><b>{eur(c.materiel + c.coutDechets)}</b></div>
            <div className="kpi"><span className="eyebrow">Déboursé sec</span><b>{eur(c.ds)}</b></div>
            <div className="kpi"><span className="eyebrow">Prix de vente HT</span><b style={{ color: "var(--acier)" }}>{eur(c.pv)}</b></div>
          </div>
          <p className="hint" style={{ marginTop: 8 }}>
            {params.margeSource === "article"
              ? `Marge par article, main d'œuvre à ${params.margeMO.mode === "marge" ? "marge" : "marque"} ${nf(params.margeMO.taux, 1)} %.`
              : `Coefficient d'entreprise ${nf(K, 4)} — marge dégagée ${eur(c.marge)} soit ${nf(c.pv > 0 ? (c.marge / c.pv) * 100 : 0, 1)} % du prix de vente.`}
          </p>

          <button className="btn sm" style={{ marginTop: 10 }} onClick={() => setSd(!sd)}>
            {sd ? "Masquer" : "Afficher"} le sous-détail
          </button>
          {sd && (
            <table style={{ marginTop: 10 }}>
              <thead><tr><th>Poste</th><th>Désignation</th><th className="r">Qté</th><th className="r">P.U.</th><th className="r">Montant</th></tr></thead>
              <tbody>
                {sys.lignes.map((lg) => {
                  const a = artMap[lg.art]; if (!a) return null;
                  const q = qteLigne(lg, 1, sys);
                  return (<tr key={lg.id}><td className="hint">Fourniture</td><td>{a.des}</td>
                    <td className="num">{nf(q, 3)} {a.unite}</td><td className="num">{eur(a.prix, 3)}</td>
                    <td className="num">{eur(q * a.prix)}</td></tr>);
                })}
                {(params.qualifs || []).map((qu) => {
                  const h = (sys.mo || 0) * ((rep[qu.id] || 0) / 100);
                  if (h <= 0) return null;
                  return (<tr key={qu.id}><td className="hint">Main d'œuvre</td><td>{qu.nom}</td>
                    <td className="num">{nf(h, 3)} h</td><td className="num">{eur(qu.taux)}</td>
                    <td className="num">{eur(h * qu.taux)}</td></tr>);
                })}
                <tr><td className="hint">Matériel</td><td>Matériel et consommables</td><td className="num">1</td>
                  <td className="num">{eur(c.materiel)}</td><td className="num">{eur(c.materiel)}</td></tr>
                <tr><td className="hint">Déchets</td><td>Évacuation et tri</td><td className="num">{nf(c.dechets, 2)} kg</td>
                  <td className="num">{eur((params.prixBenne || 0) / 1000, 4)}</td><td className="num">{eur(c.coutDechets)}</td></tr>
                <tr className="sub-row"><td colSpan={4}>Déboursé sec</td><td className="num">{eur(c.ds)}</td></tr>
                <tr><td colSpan={4} className="hint">Frais généraux et bénéfice</td><td className="num">{eur(c.pv - c.ds)}</td></tr>
                <tr className="tot-row"><td colSpan={4}>Prix de vente HT / {sys.unite}</td><td className="num">{eur(c.pv)}</td></tr>
              </tbody>
            </table>
          )}

          <label className="fld" style={{ marginTop: 14 }}><span>Notes</span>
            <textarea rows={2} value={sys.notes || ""} onChange={(e) => patch(sys.id, { notes: e.target.value })} /></label>
          <label className="row" style={{ gap: 6, marginTop: 10, fontSize: 12.5 }}>
            <input type="checkbox" checked={!sys.verif} onChange={(e) => patch(sys.id, { verif: !e.target.checked })} style={{ width: 14 }} />
            Données vérifiées sur la documentation fabricant
          </label>
        </div>
      </aside>
    </>
  );
}
