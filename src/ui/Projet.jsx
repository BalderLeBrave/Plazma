import React, { useState, useMemo, useRef } from "react";
import { csvN, eur, nf, semaineISO, telecharger, today, uid } from "../domaine/format.js";
import { CAT_MAP, DEVIS_DEF, ENTREPRISE_DEF, LOGO_ID, STATUTS, STATUTS_TS } from "../domaine/referentiel.js";
import { A } from "../domaine/articles.js";
import { P , hauteurMax } from "../domaine/systemes.js";
import { TS_ACQUIS, coefEntreprise, coutSysteme, montantTS, ouvragesVariante, qteOuvrage, rendementMO, situationProjet, totauxProjet } from "../domaine/moteur.js";
import { ChipsListe, Num } from "./base.jsx";


/* ================================================================== */
/*  8. Projet                                                          */
/* ================================================================== */

export function Projet({ projet, patchP, systemes, sysMap, artMap, params, setSystemes, photos, retour }) {
  const [vue, setVue] = useState("metre");
  const [groupe, setGroupe] = useState("zone");
  const [matZone, setMatZone] = useState(projet.zones?.[0] || "");
  const dpgfRef = useRef(null);

  const zones = projet.zones || [], niveaux = projet.niveaux || [];
  const variantes = projet.variantes || ["Base"];
  const vAct = projet.varianteActive || "Base";
  const postes = projet.postes || [];

  const setOuv = (oid, p) => patchP({ ouvrages: projet.ouvrages.map((o) => (o.id === oid ? { ...o, ...p } : o)) });
  const addOuv = () => patchP({
    ouvrages: [...projet.ouvrages, {
      id: uid(), sys: systemes[0]?.id, zone: zones[0] || "", niveau: niveaux[0] || "", local: "",
      variante: vAct, poste: "", mode: "direct", qte: 0, nb: 1, long: 0, hsp: 2.5, deduc: 0, avPrec: 0, avAct: 0,
    }],
  });

  const lignes = ouvragesVariante(projet).map((o) => {
    const s = sysMap[o.sys];
    const c = s ? coutSysteme(s, artMap, params) : { ds: 0, pv: 0 };
    const q = qteOuvrage(o);
    return { o, s, q, pu: c, ds: c.ds * q, pv: c.pv * q };
  });
  const t = totauxProjet(projet, sysMap, artMap, params);
  const RD = rendementMO(projet, sysMap, params);
  const SIT = situationProjet(projet, sysMap, artMap, params);
  const tsListe = (projet.ts || []).map((x) => ({ ...x, montant: montantTS(x, sysMap, artMap, params) }));

  const groupes = useMemo(() => {
    const g = {};
    lignes.forEach((l) => {
      const k = (groupe === "zone" ? l.o.zone : groupe === "niveau" ? l.o.niveau
        : groupe === "cat" ? CAT_MAP[l.s?.cat]?.nom : (postes.find((p) => p.id === l.o.poste)?.code || "Hors poste")) || "Non affecté";
      if (!g[k]) g[k] = { qte: 0, ds: 0, pv: 0, n: 0 };
      g[k].qte += l.q; g[k].ds += l.ds; g[k].pv += l.pv; g[k].n += 1;
    });
    return Object.entries(g).sort((a, b) => a[0].localeCompare(b[0]));
  }, [lignes, groupe, postes]);

  const sysUtilises = useMemo(() => {
    const ids = Array.from(new Set(ouvragesVariante(projet).map((o) => o.sys)));
    return ids.map((id) => sysMap[id]).filter(Boolean);
  }, [projet, sysMap]);

  const cellules = useMemo(() => {
    const m = {};
    ouvragesVariante(projet).forEach((o) => {
      if (o.zone !== matZone) return;
      const k = `${o.sys}|${o.niveau}`;
      if (!m[k]) m[k] = { qte: 0, ids: [] };
      m[k].qte += qteOuvrage(o); m[k].ids.push(o.id);
    });
    return m;
  }, [projet, matZone]);

  const setCellule = (sysId, niveau, v) => {
    const cel = cellules[`${sysId}|${niveau}`];
    if (!cel || cel.ids.length === 0) {
      patchP({ ouvrages: [...projet.ouvrages, { id: uid(), sys: sysId, zone: matZone, niveau, local: "", variante: vAct, poste: "", mode: "direct", qte: v, avPrec: 0, avAct: 0 }] });
    } else if (cel.ids.length === 1) {
      patchP({ ouvrages: projet.ouvrages.map((o) => (o.id === cel.ids[0] ? { ...o, mode: "direct", qte: v } : o)) });
    }
  };

  /* Comparatif des variantes */
  const compVariantes = variantes.map((v) => {
    const tv = totauxProjet({ ...projet, varianteActive: v }, sysMap, artMap, params);
    return { v, ...tv };
  });

  /* Bordereau DPGF chiffré */
  const bordereau = postes.map((p) => {
    const ls = lignes.filter((l) => l.o.poste === p.id);
    const qte = ls.reduce((a, l) => a + l.q, 0);
    const pv = ls.reduce((a, l) => a + l.pv, 0);
    return { ...p, qteMetre: qte, pv, pu: qte > 0 ? pv / qte : 0, ecart: p.qte > 0 ? ((qte - p.qte) / p.qte) * 100 : null };
  });

  const exportBordereau = () => {
    const L = [`Bordereau chiffre;${projet.nom};variante ${vAct}`, "", "Code;Designation;Unite;Qte_DPGF;Qte_metre;PU_HT;Montant_HT"];
    bordereau.forEach((b) => L.push([b.code, b.des, b.unite, csvN(b.qte), csvN(b.qteMetre), csvN(b.pu), csvN(b.pv)].join(";")));
    const hp = lignes.filter((l) => !l.o.poste);
    if (hp.length) L.push(["", "Ouvrages hors poste DPGF", "", "", csvN(hp.reduce((a, l) => a + l.q, 0)), "", csvN(hp.reduce((a, l) => a + l.pv, 0))].join(";"));
    L.push("", `Frais de chantier;;;;;;${csvN((projet.fraisChantier || []).reduce((a, f) => a + f.montant, 0) * coefEntreprise(params))}`);
    L.push(`TOTAL HT;;;;;;${csvN(t.pv)}`);
    telecharger(`bordereau_${projet.nom.replace(/\s+/g, "-")}.csv`, L.join("\n"));
  };

  const importDPGF = (txt) => {
    const rows = txt.split(/\r?\n/).filter((l) => l.trim());
    if (rows.length < 2) { alert("Fichier vide."); return; }
    const sep = rows[0].includes(";") ? ";" : ",";
    const head = rows[0].split(sep).map((h) => h.trim().toLowerCase());
    const iC = head.findIndex((h) => h.startsWith("code")), iD = head.findIndex((h) => h.startsWith("des")),
      iU = head.findIndex((h) => h.startsWith("unit")), iQ = head.findIndex((h) => h.startsWith("q"));
    if (iD < 0) { alert("Colonnes attendues : code ; designation ; unite ; quantite"); return; }
    const nouveaux = rows.slice(1).map((r) => {
      const c = r.split(sep);
      const g = (i, d = "") => (i >= 0 && c[i] !== undefined ? c[i].trim() : d);
      return { id: uid(), code: g(iC), des: g(iD), unite: g(iU, "m²"), qte: parseFloat(g(iQ, "0").replace(",", ".")) || 0 };
    }).filter((p) => p.des);
    patchP({ postes: [...postes, ...nouveaux] });
    alert(`${nouveaux.length} poste${nouveaux.length > 1 ? "s" : ""} importé${nouveaux.length > 1 ? "s" : ""}.`);
  };

  const situation = lignes.map((l) => {
    const av = Math.max(0, Math.min(100, l.o.avAct || 0)), pr = Math.max(0, Math.min(100, l.o.avPrec || 0));
    return { ...l, av, pr, cumul: l.pv * (av / 100), mois: l.pv * ((av - pr) / 100) };
  });
  const totSit = situation.reduce((a, s) => ({ cumul: a.cumul + s.cumul, mois: a.mois + s.mois }), { cumul: 0, mois: 0 });

  return (
    <div className="pad">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <button className="crumb" onClick={retour}>← Tous les projets</button>
        <div className="chips">
          {[["metre", "Métré"], ["matrice", "Zone / niveau"], ["chantier", "DPGF & frais"], ["heures", "Heures"], ["ts", "Travaux suppl."], ["devis", "Devis"], ["situation", "Situation"], ["recap", "Récapitulatif"]].map(([k, lab]) => (
            <button key={k} className={`chip ${vue === k ? "on" : ""}`} onClick={() => setVue(k)}>{lab}</button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-h" style={{ gap: 20 }}>
          <div className="row" style={{ gap: 14, flex: 1 }}>
            <label className="fld" style={{ width: 170 }}><span>Nom du projet</span>
              <input value={projet.nom} onChange={(e) => patchP({ nom: e.target.value })} /></label>
            <label className="fld" style={{ width: 170 }}><span>Client</span>
              <input value={projet.client || ""} placeholder="—" onChange={(e) => patchP({ client: e.target.value })} /></label>
            <label className="fld" style={{ width: 120 }}><span>Statut</span>
              <select value={projet.statut || "Étude"} onChange={(e) => patchP({ statut: e.target.value })}>
                {STATUTS.map((s) => <option key={s}>{s}</option>)}
              </select></label>
            <div>
              <span className="eyebrow">Variante chiffrée</span>
              <div className="chips" style={{ marginTop: 4 }}>
                {variantes.map((v) => (
                  <button key={v} className={`chip ${vAct === v ? "on" : ""}`} onClick={() => patchP({ varianteActive: v })}>{v}</button>
                ))}
                <button className="chip" title="Dupliquer la variante active" onClick={() => {
                  const nom = prompt("Nom de la nouvelle variante ?", `Variante ${variantes.length}`);
                  if (!nom || variantes.includes(nom)) return;
                  patchP({
                    variantes: [...variantes, nom], varianteActive: nom,
                    ouvrages: [...projet.ouvrages, ...ouvragesVariante(projet).map((o) => ({ ...o, id: uid(), variante: nom }))],
                  });
                }}>+</button>
                {variantes.length > 1 && (
                  <button className="chip" onClick={() => {
                    if (!confirm(`Supprimer la variante « ${vAct} » et ses lignes ?`)) return;
                    const rest = variantes.filter((v) => v !== vAct);
                    patchP({ variantes: rest, varianteActive: rest[0], ouvrages: projet.ouvrages.filter((o) => (o.variante || "Base") !== vAct) });
                  }}>×</button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="row" style={{ padding: 14, gap: 28, alignItems: "flex-start" }}>
          <ChipsListe label="Zones" items={zones} placeholder="Nom de la zone (ex. Zone C)" onChange={(v) => patchP({ zones: v })} />
          <ChipsListe label="Niveaux" items={niveaux} placeholder="Nom du niveau (ex. R+5)" onChange={(v) => patchP({ niveaux: v })} />
        </div>
      </div>

      <div className="kpis" style={{ margin: "14px 0" }}>
        <div className="kpi"><span className="eyebrow">Fournitures</span><b>{eur(t.mat)}</b></div>
        <div className="kpi"><span className="eyebrow">Main d'œuvre</span><b>{eur(t.mo)}</b><span className="hint mono">{nf(t.h, 0)} h</span></div>
        <div className="kpi"><span className="eyebrow">Matériel + déchets</span><b>{eur(t.materiel + t.coutDechets)}</b><span className="hint mono">{nf(t.dechets / 1000, 2)} t</span></div>
        <div className="kpi"><span className="eyebrow">Frais de chantier</span><b>{eur(t.frais)}</b></div>
        <div className="kpi"><span className="eyebrow">Déboursé sec</span><b>{eur(t.ds)}</b></div>
        <div className="kpi"><span className="eyebrow">Vente HT</span><b style={{ color: "var(--acier)" }}>{eur(t.pv)}</b></div>
        <div className="kpi"><span className="eyebrow">Marge / marque</span><b>{eur(t.marge)}</b><span className="hint mono">{nf(t.tauxMarque, 1)} %</span></div>
      </div>

      {vue === "metre" && (
        <div className="card">
          <div className="card-h">
            <h3>Métré — variante {vAct}</h3>
            <button className="btn sm pri" onClick={addOuv}>+ Ouvrage</button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr><th>Zone</th><th>Niveau</th><th>Local</th><th>Poste</th><th>Système</th>
                  <th>Métré</th><th className="r">Qté</th><th className="r">P.U. vente</th><th className="r">Vente HT</th><th /></tr>
              </thead>
              <tbody>
                {lignes.map(({ o, s, q, pu, pv }) => (
                  <tr key={o.id}>
                    <td><select className="bare" value={o.zone} onChange={(e) => setOuv(o.id, { zone: e.target.value })} style={{ width: 100 }}>
                      <option value="">—</option>{zones.map((z) => <option key={z}>{z}</option>)}</select></td>
                    <td><select className="bare" value={o.niveau} onChange={(e) => setOuv(o.id, { niveau: e.target.value })} style={{ width: 82 }}>
                      <option value="">—</option>{niveaux.map((n) => <option key={n}>{n}</option>)}</select></td>
                    <td><input className="bare" value={o.local} placeholder="—" onChange={(e) => setOuv(o.id, { local: e.target.value })} style={{ width: 110 }} /></td>
                    <td><select className="bare" value={o.poste || ""} onChange={(e) => setOuv(o.id, { poste: e.target.value })} style={{ width: 86 }}>
                      <option value="">—</option>{postes.map((p) => <option key={p.id} value={p.id}>{p.code || p.des.slice(0, 12)}</option>)}</select></td>
                    <td><select className="bare" value={o.sys} onChange={(e) => setOuv(o.id, { sys: e.target.value })} style={{ minWidth: 200 }}>
                      {systemes.map((x) => <option key={x.id} value={x.id}>{x.code} — {x.nom}</option>)}</select></td>
                    <td style={{ minWidth: 240 }}>
                      <div className="row" style={{ gap: 3, flexWrap: "nowrap" }}>
                        <select className="bare" value={o.mode || "direct"} onChange={(e) => setOuv(o.id, { mode: e.target.value })} style={{ width: 74 }}>
                          <option value="direct">Direct</option><option value="detail">L × H</option>
                        </select>
                        {o.mode === "detail" ? (
                          <>
                            <Num className="bare" style={{ width: 42 }} title="nombre" value={o.nb ?? 1} onChange={(v) => setOuv(o.id, { nb: v })} />
                            <span className="hint">×</span>
                            <Num className="bare" style={{ width: 58 }} title="longueur" value={o.long || 0} onChange={(v) => setOuv(o.id, { long: v })} />
                            <span className="hint">×</span>
                            <Num className="bare" style={{ width: 52 }} title="hauteur" value={o.hsp || 0} onChange={(v) => setOuv(o.id, { hsp: v })} />
                            <span className="hint">−</span>
                            <Num className="bare" style={{ width: 52 }} title="déduction des baies en m²" value={o.deduc || 0} onChange={(v) => setOuv(o.id, { deduc: v })} />
                          </>
                        ) : (
                          <Num className="bare" style={{ width: 84 }} value={o.qte || 0} onChange={(v) => setOuv(o.id, { qte: v })} />
                        )}
                      </div>
                    </td>
                    <td className="num">
                      {nf(q, 2)} <span className="hint">{s?.unite}</span>
                      {(() => {
                        const hLigne = o.mode === "detail" ? (o.hsp || 0) : 0;
                        const hLim = s ? hauteurMax(s, s.entraxe) : 0;
                        if (!hLigne || !hLim || hLigne <= hLim + 1e-9) return null;
                        return (
                          <div className="bdg ko" style={{ marginTop: 3 }}
                            title={`Ce système est admis jusqu'à ${nf(hLim, 2)} m à l'entraxe ${nf(s.entraxe, 2)} m. Resserrer l'entraxe, changer de profil ou retenir un autre système.`}>
                            H {nf(hLigne, 2)} &gt; {nf(hLim, 2)} m
                          </div>
                        );
                      })()}
                    </td>
                    <td className="num hint">{eur(pu.pv)}</td>
                    <td className="num" style={{ color: "var(--acier)" }}>{eur(pv)}</td>
                    <td className="r" style={{ whiteSpace: "nowrap" }}>
                      <button className="btn sm" onClick={() => patchP({ ouvrages: [...projet.ouvrages, { ...o, id: uid() }] })} aria-label="Dupliquer">⧉</button>{" "}
                      <button className="btn sm danger" onClick={() => patchP({ ouvrages: projet.ouvrages.filter((x) => x.id !== o.id) })} aria-label="Supprimer">×</button>
                    </td>
                  </tr>
                ))}
                {lignes.length === 0 && <tr><td colSpan={10} className="empty">Aucun ouvrage dans cette variante.</td></tr>}
                <tr className="tot-row"><td colSpan={8}>Total ouvrages</td>
                  <td className="num" style={{ color: "var(--acier)" }}>{eur(t.pv - t.frais * coefEntreprise(params))}</td><td /></tr>
              </tbody>
            </table>
          </div>
          <p className="hint" style={{ padding: "10px 14px", margin: 0 }}>
            Mode « L × H » : nombre × longueur × hauteur − déduction des baies en m². La quantité se recalcule seule.
          </p>
        </div>
      )}

      {vue === "matrice" && (
        <div className="card">
          <div className="card-h">
            <h3>Quantités par système et par niveau</h3>
            <div className="row">
              <span className="eyebrow">Zone</span>
              <select value={matZone} onChange={(e) => setMatZone(e.target.value)} style={{ width: 150 }}>
                {zones.map((z) => <option key={z}>{z}</option>)}
              </select>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="mat">
              <thead><tr><th>Système</th>{niveaux.map((n) => <th key={n} className="r">{n}</th>)}<th className="r">Total zone</th></tr></thead>
              <tbody>
                {sysUtilises.map((s) => {
                  let tl = 0;
                  return (
                    <tr key={s.id}>
                      <td style={{ minWidth: 230 }}><span className="mono" style={{ fontSize: 11 }}>{s.code}</span> — {s.nom}</td>
                      {niveaux.map((n) => {
                        const cel = cellules[`${s.id}|${n}`], v = cel?.qte || 0;
                        tl += v;
                        const multi = (cel?.ids.length || 0) > 1;
                        return (
                          <td key={n}>
                            {multi ? <span className="num hint" title="Plusieurs lignes de métré">{nf(v, 2)}*</span>
                              : <Num className="bare" value={v} onChange={(nv) => setCellule(s.id, n, nv)} />}
                          </td>
                        );
                      })}
                      <td className="num" style={{ fontWeight: 600 }}>{nf(tl, 2)} {s.unite}</td>
                    </tr>
                  );
                })}
                {sysUtilises.length === 0 && <tr><td colSpan={niveaux.length + 2} className="empty">Aucun système dans cette variante.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="hint" style={{ padding: "10px 14px", margin: 0 }}>
            Une ligne de métré est créée automatiquement pour chaque case remplie. Les cases marquées d'un astérisque regroupent plusieurs lignes et se modifient dans le métré.
          </p>
        </div>
      )}

      {vue === "chantier" && (
        <>
          <div className="card">
            <div className="card-h">
              <h3>Postes du DPGF</h3>
              <div className="row">
                <button className="btn sm" onClick={() => dpgfRef.current?.click()}>Importer un DPGF (CSV)</button>
                <button className="btn sm" onClick={exportBordereau}>Exporter le bordereau chiffré</button>
                <button className="btn sm pri" onClick={() => patchP({ postes: [...postes, { id: uid(), code: "", des: "Nouveau poste", unite: "m²", qte: 0 }] })}>+ Poste</button>
              </div>
            </div>
            <input ref={dpgfRef} type="file" accept=".csv,text/csv" style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0]; if (!f) return;
                const r = new FileReader(); r.onload = () => importDPGF(String(r.result));
                r.readAsText(f, "utf-8"); e.target.value = "";
              }} />
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead><tr><th>Code</th><th>Désignation</th><th>Unité</th><th className="r">Qté DPGF</th>
                  <th className="r">Qté métré</th><th className="r">Écart</th><th className="r">P.U. HT</th><th className="r">Montant HT</th><th /></tr></thead>
                <tbody>
                  {bordereau.map((b) => (
                    <tr key={b.id}>
                      <td style={{ width: 90 }}><input className="bare mono" value={b.code} onChange={(e) => patchP({ postes: postes.map((p) => p.id === b.id ? { ...p, code: e.target.value } : p) })} /></td>
                      <td><input className="bare" value={b.des} onChange={(e) => patchP({ postes: postes.map((p) => p.id === b.id ? { ...p, des: e.target.value } : p) })} style={{ minWidth: 220 }} /></td>
                      <td style={{ width: 60 }}><input className="bare" value={b.unite} onChange={(e) => patchP({ postes: postes.map((p) => p.id === b.id ? { ...p, unite: e.target.value } : p) })} /></td>
                      <td style={{ width: 90 }}><Num className="bare" value={b.qte} onChange={(v) => patchP({ postes: postes.map((p) => p.id === b.id ? { ...p, qte: v } : p) })} /></td>
                      <td className="num">{nf(b.qteMetre, 2)}</td>
                      <td className={`num ${b.ecart === null ? "hint" : Math.abs(b.ecart) < 2 ? "hint" : b.ecart > 0 ? "neg" : "pos"}`}>
                        {b.ecart === null ? "—" : `${b.ecart > 0 ? "+" : ""}${nf(b.ecart, 1)} %`}
                      </td>
                      <td className="num">{eur(b.pu)}</td>
                      <td className="num" style={{ color: "var(--acier)" }}>{eur(b.pv)}</td>
                      <td className="r"><button className="btn sm danger" onClick={() => patchP({ postes: postes.filter((p) => p.id !== b.id) })} aria-label="Supprimer">×</button></td>
                    </tr>
                  ))}
                  {postes.length === 0 && <tr><td colSpan={9} className="empty">Aucun poste. Importe le DPGF du maître d'œuvre ou saisis les postes à la main.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="hint" style={{ padding: "10px 14px", margin: 0 }}>
              Format d'import : code ; designation ; unite ; quantite. L'écart compare ton métré à la quantité du DPGF.
            </p>
          </div>

          <div className="card">
            <div className="card-h">
              <h3>Frais de chantier</h3>
              <button className="btn sm pri" onClick={() => patchP({ fraisChantier: [...(projet.fraisChantier || []), { id: uid(), des: "Nouveau poste", montant: 0 }] })}>+ Poste</button>
            </div>
            <table>
              <thead><tr><th>Désignation</th><th className="r">Montant HT</th><th className="r">Vente HT</th><th /></tr></thead>
              <tbody>
                {(projet.fraisChantier || []).map((f) => (
                  <tr key={f.id}>
                    <td><input className="bare" value={f.des} onChange={(e) => patchP({ fraisChantier: projet.fraisChantier.map((x) => x.id === f.id ? { ...x, des: e.target.value } : x) })} /></td>
                    <td style={{ width: 110 }}><Num className="bare" value={f.montant} onChange={(v) => patchP({ fraisChantier: projet.fraisChantier.map((x) => x.id === f.id ? { ...x, montant: v } : x) })} /></td>
                    <td className="num hint">{eur(f.montant * coefEntreprise(params))}</td>
                    <td className="r"><button className="btn sm danger" onClick={() => patchP({ fraisChantier: projet.fraisChantier.filter((x) => x.id !== f.id) })} aria-label="Supprimer">×</button></td>
                  </tr>
                ))}
                {(projet.fraisChantier || []).length === 0 && <tr><td colSpan={4} className="empty">Installation, lift-plaque, échafaudage, benne, nettoyage : à chiffrer ici plutôt que de les noyer dans les frais généraux.</td></tr>}
                <tr className="tot-row"><td>Total</td><td className="num">{eur(t.frais)}</td><td className="num">{eur(t.frais * coefEntreprise(params))}</td><td /></tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {vue === "heures" && (
        <>
          <div className="kpis" style={{ marginBottom: 14 }}>
            <div className="kpi"><span className="eyebrow">Heures pointées</span><b>{nf(RD.heuresPointees, 0)} h</b></div>
            <div className="kpi"><span className="eyebrow">Heures chiffrées à l'avancement</span><b>{nf(RD.heuresAvancement, 0)} h</b></div>
            <div className="kpi"><span className="eyebrow">Rendement</span>
              <b className={RD.rendement === null ? "" : RD.rendement > 0 ? "neg" : "pos"}>
                {RD.rendement === null ? "—" : `${RD.rendement > 0 ? "+" : ""}${nf(RD.rendement, 1)} %`}
              </b></div>
            <div className="kpi"><span className="eyebrow">Coût MO réel</span><b>{eur(RD.coutReel)}</b></div>
            <div className="kpi"><span className="eyebrow">Écart sur MO</span>
              <b className={RD.coutReel - RD.coutChiffre > 0 ? "neg" : "pos"}>
                {RD.coutReel - RD.coutChiffre >= 0 ? "+" : "−"}{eur(Math.abs(RD.coutReel - RD.coutChiffre))}
              </b></div>
            <div className="kpi"><span className="eyebrow">Reste à faire</span><b>{nf(RD.resteAFaire, 0)} h</b>
              <span className="hint mono">{nf(RD.resteAFaire / 7, 0)} j compagnon</span></div>
          </div>

          <div className="card">
            <div className="card-h">
              <h3>Pointage hebdomadaire</h3>
              <div className="row">
                <button className="btn sm" onClick={() => {
                  const L = ["Semaine;Zone;Qualification;Systeme;Heures;Cout"];
                  (projet.pointages || []).forEach((pt) => {
                    const q = (params.qualifs || []).find((x) => x.id === pt.qualif);
                    L.push([pt.semaine, pt.zone, q ? q.nom : "", sysMap[pt.sys]?.code || "", csvN(pt.heures, 2), csvN((pt.heures || 0) * (q ? q.taux : 0))].join(";"));
                  });
                  telecharger(`heures_${projet.nom.replace(/\s+/g, "-")}.csv`, L.join("\n"));
                }}>Exporter</button>
                <button className="btn sm pri" onClick={() => patchP({
                  pointages: [...(projet.pointages || []), {
                    id: uid(), semaine: semaineISO(), zone: zones[0] || "", qualif: params.qualifs?.[1]?.id || params.qualifs?.[0]?.id,
                    sys: "", heures: 0,
                  }],
                })}>+ Ligne</button>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead><tr><th>Semaine</th><th>Zone</th><th>Qualification</th><th>Système travaillé</th>
                  <th className="r">Heures</th><th className="r">Coût</th><th /></tr></thead>
                <tbody>
                  {(projet.pointages || []).map((pt) => {
                    const q = (params.qualifs || []).find((x) => x.id === pt.qualif);
                    const setPt = (v) => patchP({ pointages: projet.pointages.map((x) => (x.id === pt.id ? { ...x, ...v } : x)) });
                    return (
                      <tr key={pt.id}>
                        <td style={{ width: 116 }}><input className="bare mono" value={pt.semaine} onChange={(e) => setPt({ semaine: e.target.value })} /></td>
                        <td><select className="bare" value={pt.zone} onChange={(e) => setPt({ zone: e.target.value })} style={{ width: 110 }}>
                          <option value="">—</option>{zones.map((z) => <option key={z}>{z}</option>)}</select></td>
                        <td><select className="bare" value={pt.qualif} onChange={(e) => setPt({ qualif: e.target.value })} style={{ width: 140 }}>
                          {(params.qualifs || []).map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}</select></td>
                        <td><select className="bare" value={pt.sys || ""} onChange={(e) => setPt({ sys: e.target.value })} style={{ minWidth: 220 }}>
                          <option value="">— non rattaché</option>
                          {sysUtilises.map((x) => <option key={x.id} value={x.id}>{x.code} — {x.nom}</option>)}</select></td>
                        <td style={{ width: 84 }}><Num className="bare" value={pt.heures} onChange={(v) => setPt({ heures: v })} /></td>
                        <td className="num hint">{eur((pt.heures || 0) * (q ? q.taux : 0))}</td>
                        <td className="r"><button className="btn sm danger" onClick={() => patchP({ pointages: projet.pointages.filter((x) => x.id !== pt.id) })} aria-label="Supprimer">×</button></td>
                      </tr>
                    );
                  })}
                  {(projet.pointages || []).length === 0 && (
                    <tr><td colSpan={7} className="empty">Aucune heure pointée. Une ligne par semaine, par zone et par qualification suffit.</td></tr>
                  )}
                  <tr className="tot-row"><td colSpan={4}>Total</td><td className="num">{nf(RD.heuresPointees, 1)} h</td>
                    <td className="num">{eur(RD.coutReel)}</td><td /></tr>
                </tbody>
              </table>
            </div>
            <p className="hint" style={{ padding: "10px 14px", margin: 0 }}>
              Rattacher la ligne à un système est facultatif, mais c'est la seule façon d'obtenir un temps unitaire réel exploitable au chiffrage suivant.
            </p>
          </div>

          <div className="card">
            <div className="card-h"><h3>Temps unitaires constatés</h3>
              <span className="hint">comparés à l'avancement déclaré des ouvrages</span></div>
            <table>
              <thead><tr><th>Système</th><th className="r">Heures pointées</th><th className="r">Heures chiffrées</th>
                <th className="r">Écart</th><th className="r">h/{"m²"} chiffré</th><th className="r">h/{"m²"} réel</th><th /></tr></thead>
              <tbody>
                {RD.parSys.map((g) => (
                  <tr key={g.sys?.id || uid()}>
                    <td><span className="mono" style={{ fontSize: 11 }}>{g.sys?.code}</span> {g.sys?.nom}</td>
                    <td className="num">{nf(g.reelles, 1)}</td>
                    <td className="num hint">{nf(g.chiffrees, 1)}</td>
                    <td className={`num ${g.ecart === null ? "hint" : g.ecart > 0 ? "neg" : "pos"}`}>
                      {g.ecart === null ? "—" : `${g.ecart > 0 ? "+" : ""}${nf(g.ecart, 1)} %`}
                    </td>
                    <td className="num hint">{nf(g.moChiffre, 3)}</td>
                    <td className="num" style={{ fontWeight: 500 }}>{g.moReel === null ? "—" : nf(g.moReel, 3)}</td>
                    <td className="r">
                      {g.moReel !== null && g.sys && (
                        <button className="btn sm" title="Reporter ce temps unitaire dans la bibliothèque" onClick={() => {
                          const v = Math.round(g.moReel * 1000) / 1000;
                          if (!confirm(`Porter ${nf(v, 3)} h/${g.sys.unite} sur « ${g.sys.nom} » ?\n\nLe temps chiffré actuel est de ${nf(g.moChiffre, 3)} h.`)) return;
                          setSystemes((ss) => ss.map((x) => (x.id === g.sys.id ? { ...x, mo: v } : x)));
                        }}>↥ biblio</button>
                      )}
                    </td>
                  </tr>
                ))}
                {RD.parSys.length === 0 && (
                  <tr><td colSpan={7} className="empty">Aucun pointage rattaché à un système. Renseigne la colonne « Système travaillé » pour alimenter ce tableau.</td></tr>
                )}
              </tbody>
            </table>
            <p className="hint" style={{ padding: "10px 14px", margin: 0 }}>
              Le temps réel se calcule sur la quantité effectivement avancée, pas sur la quantité totale : un ouvrage à 40 % ne compte que pour 40 % de ses heures.
              Un avancement mal tenu fausse ce tableau plus sûrement qu'un pointage approximatif.
            </p>
          </div>
        </>
      )}

      {vue === "ts" && (
        <>
          <div className="kpis" style={{ marginBottom: 14 }}>
            <div className="kpi"><span className="eyebrow">Travaux supplémentaires</span><b>{tsListe.length}</b></div>
            <div className="kpi"><span className="eyebrow">En attente d'OS</span>
              <b>{eur(tsListe.filter((x) => !TS_ACQUIS.includes(x.statut) && x.statut !== "Refusé").reduce((a, x) => a + x.montant, 0))}</b></div>
            <div className="kpi"><span className="eyebrow">Acquis</span>
              <b style={{ color: "var(--acier)" }}>{eur(tsListe.filter((x) => TS_ACQUIS.includes(x.statut)).reduce((a, x) => a + x.montant, 0))}</b></div>
            <div className="kpi"><span className="eyebrow">Refusé</span>
              <b className="neg">{eur(tsListe.filter((x) => x.statut === "Refusé").reduce((a, x) => a + x.montant, 0))}</b></div>
            <div className="kpi"><span className="eyebrow">Part du marché</span>
              <b>{nf(SIT.marcheBase > 0 ? (SIT.marcheTS / SIT.marcheBase) * 100 : 0, 1)} %</b></div>
          </div>

          <div className="card">
            <div className="card-h">
              <h3>Registre des travaux supplémentaires</h3>
              <button className="btn sm pri" onClick={() => patchP({
                ts: [...(projet.ts || []), {
                  id: uid(), num: `TS-${String((projet.ts || []).length + 1).padStart(3, "0")}`,
                  date: today(), objet: "Nouveau travail supplémentaire", demandeur: "", zone: zones[0] || "",
                  statut: "À chiffrer", forfait: 0, lignes: [], av: 0, os: "",
                }],
              })}>+ Travail supplémentaire</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead><tr><th>N°</th><th>Date</th><th>Objet</th><th>Demandé par</th><th>Zone</th>
                  <th>Statut</th><th>Réf. OS</th><th className="r">Avanc. %</th><th className="r">Montant HT</th><th /></tr></thead>
                <tbody>
                  {tsListe.map((x) => {
                    const setTs = (v) => patchP({ ts: projet.ts.map((y) => (y.id === x.id ? { ...y, ...v } : y)) });
                    return (
                      <React.Fragment key={x.id}>
                        <tr>
                          <td style={{ width: 86 }}><input className="bare mono" value={x.num} onChange={(e) => setTs({ num: e.target.value })} /></td>
                          <td style={{ width: 124 }}><input className="bare" type="date" value={x.date} onChange={(e) => setTs({ date: e.target.value })} /></td>
                          <td><input className="bare" value={x.objet} onChange={(e) => setTs({ objet: e.target.value })} style={{ minWidth: 200 }} /></td>
                          <td style={{ width: 120 }}><input className="bare" value={x.demandeur} placeholder="MOE, MOA…" onChange={(e) => setTs({ demandeur: e.target.value })} /></td>
                          <td><select className="bare" value={x.zone} onChange={(e) => setTs({ zone: e.target.value })} style={{ width: 100 }}>
                            <option value="">—</option>{zones.map((z) => <option key={z}>{z}</option>)}</select></td>
                          <td><select className="bare" value={x.statut} onChange={(e) => setTs({ statut: e.target.value })} style={{ width: 116 }}>
                            {STATUTS_TS.map((st) => <option key={st}>{st}</option>)}</select></td>
                          <td style={{ width: 104 }}><input className="bare mono" value={x.os || ""} placeholder="n° OS" onChange={(e) => setTs({ os: e.target.value })} /></td>
                          <td style={{ width: 74 }}><Num className="bare" value={x.av || 0} onChange={(v) => setTs({ av: v })} /></td>
                          <td className="num" style={{ color: TS_ACQUIS.includes(x.statut) ? "var(--acier)" : undefined }}>{eur(x.montant)}</td>
                          <td className="r" style={{ whiteSpace: "nowrap" }}>
                            <button className="btn sm" title="Ajouter un ouvrage chiffré" onClick={() => setTs({
                              lignes: [...(x.lignes || []), { id: uid(), sys: systemes[0]?.id, qte: 0 }],
                            })}>+</button>{" "}
                            <button className="btn sm danger" onClick={() => patchP({ ts: projet.ts.filter((y) => y.id !== x.id) })} aria-label="Supprimer">×</button>
                          </td>
                        </tr>
                        {(x.lignes || []).map((l) => {
                          const sy = sysMap[l.sys];
                          const pu = sy ? coutSysteme(sy, artMap, params).pv : 0;
                          return (
                            <tr key={l.id}>
                              <td colSpan={2} className="hint" style={{ paddingLeft: 26 }}>↳ ouvrage</td>
                              <td colSpan={4}>
                                <select className="bare" value={l.sys} style={{ minWidth: 240 }}
                                  onChange={(e) => setTs({ lignes: x.lignes.map((y) => (y.id === l.id ? { ...y, sys: e.target.value } : y)) })}>
                                  {systemes.map((z) => <option key={z.id} value={z.id}>{z.code} — {z.nom}</option>)}
                                </select>
                              </td>
                              <td colSpan={2}>
                                <div className="row" style={{ gap: 4, flexWrap: "nowrap" }}>
                                  <Num className="bare" style={{ width: 76 }} value={l.qte}
                                    onChange={(v) => setTs({ lignes: x.lignes.map((y) => (y.id === l.id ? { ...y, qte: v } : y)) })} />
                                  <span className="hint mono">{sy?.unite} × {eur(pu)}</span>
                                </div>
                              </td>
                              <td className="num hint">{eur(pu * (l.qte || 0))}</td>
                              <td className="r"><button className="btn sm danger" onClick={() => setTs({ lignes: x.lignes.filter((y) => y.id !== l.id) })} aria-label="Supprimer">×</button></td>
                            </tr>
                          );
                        })}
                        {(x.lignes || []).length === 0 && (
                          <tr>
                            <td colSpan={7} className="hint" style={{ paddingLeft: 26 }}>↳ prix forfaitaire, ou « + » pour chiffrer depuis la bibliothèque</td>
                            <td colSpan={2}><Num className="bare" value={x.forfait || 0} onChange={(v) => setTs({ forfait: v })} /></td>
                            <td />
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {tsListe.length === 0 && (
                    <tr><td colSpan={10} className="empty">Aucun travail supplémentaire enregistré.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="hint" style={{ padding: "10px 14px", margin: 0 }}>
              Seuls les travaux au statut « OS reçu » ou « Facturé » entrent dans la situation. Les autres restent visibles ici, à relancer :
              c'est le poste où une entreprise de plâtrerie perd le plus d'argent déjà dépensé.
            </p>
          </div>
        </>
      )}

      {vue === "devis" && (() => {
        const E = { ...ENTREPRISE_DEF, ...(params.entreprise || {}) };
        const D = { ...DEVIS_DEF, ...(projet.devis || {}) };
        const setD = (v) => patchP({ devis: { ...D, ...v } });
        const tauxTVA = SIT.m.tva || 0;

        /* Les lignes suivent le DPGF quand il est renseigné, sinon le métré regroupé par système */
        const lignesDevis = postes.length
          ? bordereau.filter((b) => b.qteMetre > 0).map((b) => ({
            code: b.code, des: b.des, unite: b.unite, qte: b.qteMetre, pu: b.pu, montant: b.pv,
          }))
          : Object.values(lignes.reduce((acc, l) => {
            if (!l.s) return acc;
            const g = acc[l.s.id] || (acc[l.s.id] = { code: l.s.code, des: l.s.nom, unite: l.s.unite, qte: 0, montant: 0 });
            g.qte += l.q; g.montant += l.pv;
            return acc;
          }, {})).map((g) => ({ ...g, pu: g.qte > 0 ? g.montant / g.qte : 0 }));

        const horsPoste = postes.length ? lignes.filter((l) => !l.o.poste).reduce((a, l) => a + l.pv, 0) : 0;
        const fraisVente = (projet.fraisChantier || []).reduce((a, f) => a + (f.montant || 0), 0) * coefEntreprise(params);
        const brut = lignesDevis.reduce((a, l) => a + l.montant, 0) + horsPoste + fraisVente;
        const remise = brut * ((D.remise || 0) / 100);
        const ht = brut - remise;
        const tva = ht * (tauxTVA / 100);
        const ttc = ht + tva;
        const acompte = ttc * ((D.acompte || 0) / 100);
        const dateFr = (d) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

        return (
          <>
            <div className="card no-print">
              <div className="card-h">
                <h3>Établissement du devis</h3>
                <div className="row">
                  <button className="btn" onClick={() => {
                    const L = [`Devis;${D.num || ""};${projet.nom}`, "", "Code;Designation;Unite;Quantite;PU_HT;Montant_HT"];
                    lignesDevis.forEach((l) => L.push([l.code, l.des, l.unite, csvN(l.qte), csvN(l.pu), csvN(l.montant)].join(";")));
                    if (fraisVente > 0) L.push(["", "Installation et frais de chantier", "Forfait", "1", csvN(fraisVente), csvN(fraisVente)].join(";"));
                    L.push("", `Total HT;;;;;${csvN(ht)}`, `TVA ${csvN(tauxTVA, 1)} %;;;;;${csvN(tva)}`, `Total TTC;;;;;${csvN(ttc)}`);
                    telecharger(`devis_${(D.num || projet.nom).replace(/\s+/g, "-")}.csv`, L.join("\n"));
                  }}>Exporter en CSV</button>
                  <button className="btn pri" onClick={() => window.print()}>Imprimer ou enregistrer en PDF</button>
                </div>
              </div>
              <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10 }}>
                <label className="fld"><span>N° de devis</span>
                  <input className="mono" value={D.num} placeholder="DV-2026-118" onChange={(e) => setD({ num: e.target.value })} /></label>
                <label className="fld"><span>Date</span>
                  <input type="date" value={D.date} onChange={(e) => setD({ date: e.target.value })} /></label>
                <label className="fld"><span>Validité en jours</span>
                  <Num value={D.validite} onChange={(v) => setD({ validite: v })} /></label>
                <label className="fld"><span>Remise commerciale %</span>
                  <Num value={D.remise} onChange={(v) => setD({ remise: v })} /></label>
                <label className="fld" style={{ gridColumn: "span 2" }}><span>Objet des travaux</span>
                  <input value={D.objet} placeholder="Lot 03 — plâtrerie, doublages et plafonds" onChange={(e) => setD({ objet: e.target.value })} /></label>
                <label className="fld" style={{ gridColumn: "span 2" }}><span>Adresse du chantier</span>
                  <input value={D.adresseChantier} onChange={(e) => setD({ adresseChantier: e.target.value })} /></label>
                <label className="fld"><span>Acompte à la commande %</span>
                  <Num value={D.acompte} onChange={(v) => setD({ acompte: v })} /></label>
                <div style={{ gridColumn: "span 3", alignSelf: "end" }}>
                  <span className="hint">
                    {postes.length
                      ? `${lignesDevis.length} poste${lignesDevis.length > 1 ? "s" : ""} repris du DPGF.`
                      : "Aucun poste DPGF : les ouvrages sont regroupés par système."}
                    {" "}TVA {nf(tauxTVA, 1)} %, reprise des conditions du marché.
                  </span>
                </div>
              </div>
              {!E.nom && (
                <p className="hint" style={{ padding: "0 14px 14px", margin: 0 }}>
                  L'identité de l'entreprise n'est pas renseignée : complète-la dans Paramètres, elle est obligatoire sur un devis.
                </p>
              )}
            </div>

            <div className="atelier" style={{ marginTop: 14 }}>
              <div className="feuille">
                <div className="bloc" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 28, paddingBottom: 15, borderBottom: "3px solid #111312" }}>
                  <div style={{ minWidth: 0 }}>
                    {photos[LOGO_ID]
                      ? <img src={photos[LOGO_ID]} alt="" style={{ maxHeight: 54, maxWidth: 200, objectFit: "contain", display: "block" }} />
                      : <div className="titre" style={{ fontSize: 19, letterSpacing: ".09em" }}>{E.nom || "VOTRE ENTREPRISE"}</div>}
                    <div style={{ marginTop: 8, fontSize: 10.5, lineHeight: 1.55, color: "#3F4441" }}>
                      {E.nom && <>{E.nom}{E.forme ? ` · ${E.forme}` : ""}{E.capital ? ` au capital de ${E.capital}` : ""}<br /></>}
                      {E.adresse}{E.adresse && <br />}
                      {[E.cp, E.ville].filter(Boolean).join(" ")}{(E.cp || E.ville) && <br />}
                      {[E.tel, E.email].filter(Boolean).join(" · ")}{(E.tel || E.email) && <br />}
                      {E.siret && <>SIRET {E.siret}</>}{E.ape ? ` · APE ${E.ape}` : ""}{E.tvaIntra ? ` · TVA ${E.tvaIntra}` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flex: "none" }}>
                    <h1>Devis quantitatif</h1>
                    <div className="mono" style={{ fontSize: 9.5, letterSpacing: ".13em", textTransform: "uppercase", color: "#5C625E", marginTop: 3 }}>
                      {D.objet || "Lot plâtrerie"}
                    </div>
                    <div className="mono" style={{ marginTop: 10, display: "inline-grid", gridTemplateColumns: "auto auto", gap: "2px 13px", fontSize: 10.5, textAlign: "left" }}>
                      <span style={{ color: "#5C625E" }}>N°</span><span>{D.num || "—"}</span>
                      <span style={{ color: "#5C625E" }}>Date</span><span>{dateFr(D.date)}</span>
                      <span style={{ color: "#5C625E" }}>Validité</span><span>{nf(D.validite, 0)} jours</span>
                    </div>
                  </div>
                </div>

                <div className="bloc" style={{ display: "flex", justifyContent: "space-between", gap: 28, margin: "18px 0 16px" }}>
                  <div>
                    <div className="eyebrow">Maître d'ouvrage</div>
                    <div style={{ marginTop: 3, fontSize: 12.5, fontWeight: 600 }}>{projet.client || "—"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="eyebrow">Chantier</div>
                    <div style={{ marginTop: 3, fontSize: 12.5, fontWeight: 600 }}>{projet.nom}</div>
                    {D.adresseChantier && <div style={{ fontSize: 10.5, color: "#3F4441" }}>{D.adresseChantier}</div>}
                  </div>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", width: 62 }}>Code</th>
                      <th style={{ textAlign: "left" }}>Désignation</th>
                      <th style={{ textAlign: "right", width: 44 }}>Unité</th>
                      <th style={{ textAlign: "right", width: 66 }}>Quantité</th>
                      <th style={{ textAlign: "right", width: 72 }}>P.U. HT</th>
                      <th style={{ textAlign: "right", width: 84 }}>Montant HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignesDevis.map((l, i) => (
                      <tr key={i}>
                        <td className="mono" style={{ fontSize: 10 }}>{l.code || "—"}</td>
                        <td>{l.des}</td>
                        <td className="num">{l.unite}</td>
                        <td className="num">{nf(l.qte, 2)}</td>
                        <td className="num">{eur(l.pu)}</td>
                        <td className="num">{eur(l.montant)}</td>
                      </tr>
                    ))}
                    {horsPoste > 0 && (
                      <tr><td className="mono">—</td><td>Ouvrages divers non affectés à un poste</td>
                        <td className="num">Ens.</td><td className="num">1,00</td>
                        <td className="num">{eur(horsPoste)}</td><td className="num">{eur(horsPoste)}</td></tr>
                    )}
                    {fraisVente > 0 && (
                      <tr><td className="mono">—</td><td>Installation de chantier, matériel et repli</td>
                        <td className="num">Ens.</td><td className="num">1,00</td>
                        <td className="num">{eur(fraisVente)}</td><td className="num">{eur(fraisVente)}</td></tr>
                    )}
                    {D.remise > 0 && (
                      <tr><td /><td colSpan={4} style={{ textAlign: "right" }}>Remise commerciale de {nf(D.remise, 1)} %</td>
                        <td className="num">−{eur(remise)}</td></tr>
                    )}
                    <tr className="tot"><td /><td colSpan={4} style={{ textAlign: "right" }}>Total HT</td>
                      <td className="num">{eur(ht)}</td></tr>
                    <tr><td /><td colSpan={4} style={{ textAlign: "right" }}>TVA {nf(tauxTVA, 1)} %</td>
                      <td className="num">{eur(tva)}</td></tr>
                    <tr className="tot"><td /><td colSpan={4} style={{ textAlign: "right", fontSize: 13 }}>Total TTC</td>
                      <td className="num" style={{ fontSize: 13 }}>{eur(ttc)}</td></tr>
                  </tbody>
                </table>

                {D.acompte > 0 && (
                  <p style={{ margin: "12px 0 0", fontSize: 11.5 }}>
                    <b>Acompte à la commande de {nf(D.acompte, 0)} % : {eur(acompte)} TTC.</b>
                  </p>
                )}

                <div className="bloc" style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #E4E4E1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
                  <div>
                    <div className="eyebrow">Conditions de paiement</div>
                    <p style={{ margin: "4px 0 0", fontSize: 10.5, lineHeight: 1.55 }}>{E.paiement}</p>
                    {E.iban && (
                      <div className="mono" style={{ marginTop: 8, fontSize: 10 }}>
                        {E.banque && <div>{E.banque}</div>}
                        <div>IBAN {E.iban}</div>
                        {E.bic && <div>BIC {E.bic}</div>}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="eyebrow">Bon pour accord</div>
                    <p style={{ margin: "4px 0 0", fontSize: 10.5, color: "#3F4441" }}>
                      Date, signature et cachet, précédés de la mention « bon pour accord ».
                    </p>
                    <div style={{ marginTop: 6, height: 74, border: "1px solid #B9BAB6" }} />
                  </div>
                </div>

                <div className="mentions bloc" style={{ marginTop: "auto", paddingTop: 16 }}>
                  <p style={{ margin: 0 }}>{E.cgv}</p>
                  {E.penalites && <p style={{ margin: "5px 0 0" }}>{E.penalites}</p>}
                  {(E.assureur || E.police) && (
                    <p style={{ margin: "5px 0 0" }}>
                      Assurance de responsabilité décennale{E.assureur ? ` souscrite auprès de ${E.assureur}` : ""}
                      {E.police ? `, police n° ${E.police}` : ""}. Couverture : France métropolitaine.
                      {E.qualibat ? ` Qualification Qualibat ${E.qualibat}.` : ""}
                    </p>
                  )}
                  {E.mediateur && <p style={{ margin: "5px 0 0" }}>Médiateur de la consommation : {E.mediateur}.</p>}
                  {E.rcs && <p style={{ margin: "5px 0 0" }}>{E.rcs}{E.capital ? ` · capital de ${E.capital}` : ""}</p>}
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {vue === "situation" && (
        <>
          <div className="card">
            <div className="card-h"><h3>Conditions du marché</h3>
              <span className="hint">à renseigner une fois, au moment de la signature</span></div>
            <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <label className="fld"><span>Retenue de garantie %</span>
                <Num value={SIT.m.retenue} onChange={(v) => patchP({ marche: { ...SIT.m, retenue: v } })} /></label>
              <label className="fld"><span>Compte prorata %</span>
                <Num value={SIT.m.prorata} onChange={(v) => patchP({ marche: { ...SIT.m, prorata: v } })} /></label>
              <label className="fld"><span>Avance forfaitaire %</span>
                <Num value={SIT.m.avance} onChange={(v) => patchP({ marche: { ...SIT.m, avance: v } })} /></label>
              <label className="fld"><span>Remboursement dès %</span>
                <Num value={SIT.m.seuilRemb} onChange={(v) => patchP({ marche: { ...SIT.m, seuilRemb: v } })} /></label>
              <label className="fld"><span>TVA %</span>
                <select value={SIT.m.tva} onChange={(e) => patchP({ marche: { ...SIT.m, tva: parseFloat(e.target.value) } })}>
                  <option value="20">20 — taux normal</option>
                  <option value="10">10 — rénovation de logement</option>
                  <option value="5.5">5,5 — rénovation énergétique</option>
                  <option value="0">0 — autoliquidation</option>
                </select></label>
              <label className="fld"><span>Index base</span>
                <Num value={SIT.m.indexBase} onChange={(v) => patchP({ marche: { ...SIT.m, indexBase: v } })} /></label>
              <label className="fld"><span>Index actuel</span>
                <Num value={SIT.m.indexActuel} onChange={(v) => patchP({ marche: { ...SIT.m, indexActuel: v } })} /></label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "flex-end", paddingBottom: 4 }}>
                <label className="row" style={{ gap: 6, fontSize: 12.5 }}>
                  <input type="checkbox" checked={!!SIT.m.revision} style={{ width: 14 }}
                    onChange={(e) => patchP({ marche: { ...SIT.m, revision: e.target.checked } })} />
                  Prix révisables
                </label>
                <label className="row" style={{ gap: 6, fontSize: 12.5 }}>
                  <input type="checkbox" checked={!!SIT.m.cautionRG} style={{ width: 14 }}
                    onChange={(e) => patchP({ marche: { ...SIT.m, cautionRG: e.target.checked } })} />
                  Caution bancaire au lieu de la retenue
                </label>
              </div>
            </div>
          </div>

          <div className="kpis" style={{ margin: "14px 0" }}>
            <div className="kpi"><span className="eyebrow">Marché + avenants</span><b>{eur(SIT.marcheTotal)}</b>
              <span className="hint mono">dont TS {eur(SIT.marcheTS)}</span></div>
            <div className="kpi"><span className="eyebrow">Avancement</span><b>{nf(SIT.avAv * 100, 1)} %</b></div>
            <div className="kpi"><span className="eyebrow">Cumul travaux</span><b>{eur(SIT.cumulRevise)}</b></div>
            <div className="kpi"><span className="eyebrow">Net à payer ce mois</span>
              <b style={{ color: "var(--acier)" }}>{eur(SIT.netMois)}</b></div>
            <div className="kpi"><span className="eyebrow">TTC</span><b>{eur(SIT.ttc)}</b></div>
          </div>

          <div className="card">
            <div className="card-h">
              <h3>Situation n° {projet.situationNum || 1}</h3>
              <div className="row">
                <button className="btn sm" onClick={() => {
                  const L = [`Situation n ${projet.situationNum || 1};${projet.nom};${today()}`, "",
                    "Poste;Montant HT"];
                  L.push(["Travaux ouvrages cumules", csvN(SIT.cumulOuv)].join(";"));
                  L.push(["Frais de chantier cumules", csvN(SIT.cumulFrais)].join(";"));
                  L.push(["Travaux supplementaires cumules", csvN(SIT.cumulTS)].join(";"));
                  if (SIT.m.revision) L.push([`Revision (coef ${csvN(SIT.coefRevision, 4)})`, csvN(SIT.revision)].join(";"));
                  L.push(["Cumul travaux", csvN(SIT.cumulRevise)].join(";"));
                  L.push([`Compte prorata ${csvN(SIT.m.prorata, 2)} %`, csvN(-SIT.prorata)].join(";"));
                  L.push([`Retenue de garantie ${SIT.m.cautionRG ? "(caution)" : csvN(SIT.m.retenue, 2) + " %"}`, csvN(-SIT.retenue)].join(";"));
                  L.push(["Remboursement avance", csvN(-SIT.remboursement)].join(";"));
                  L.push(["Net cumule", csvN(SIT.netCumul)].join(";"));
                  L.push(["Situations precedentes", csvN(-SIT.netPrecedent)].join(";"));
                  L.push(["NET A PAYER HT", csvN(SIT.netMois)].join(";"));
                  L.push([`TVA ${csvN(SIT.m.tva, 1)} %`, csvN(SIT.tva)].join(";"));
                  L.push(["NET A PAYER TTC", csvN(SIT.ttc)].join(";"));
                  telecharger(`situation-${projet.situationNum || 1}_${projet.nom.replace(/\s+/g, "-")}.csv`, L.join("\n"));
                }}>Exporter la situation</button>
                <button className="btn sm pri" onClick={() => {
                  if (!confirm(`Clôturer la situation n° ${projet.situationNum || 1} pour ${eur(SIT.netMois)} HT ?\n\nLes avancements actuels deviennent la référence de la prochaine situation.`)) return;
                  patchP({
                    situationNum: (projet.situationNum || 1) + 1,
                    histoSit: [...(projet.histoSit || []), {
                      id: uid(), num: projet.situationNum || 1, date: today(),
                      cumulHT: SIT.cumulRevise, netCumul: SIT.netCumul, netMois: SIT.netMois,
                    }],
                    ouvrages: projet.ouvrages.map((o) => ({ ...o, avPrec: o.avAct || 0 })),
                  });
                }}>Clôturer</button>
              </div>
            </div>
            <table>
              <tbody>
                <tr><td>Travaux — ouvrages</td><td className="num">{eur(SIT.cumulOuv)}</td>
                  <td className="hint">{nf(SIT.avGlobal * 100, 1)} % du marché de base</td></tr>
                <tr><td>Frais de chantier</td><td className="num">{eur(SIT.cumulFrais)}</td><td className="hint">au prorata de l'avancement</td></tr>
                <tr><td>Travaux supplémentaires</td><td className="num">{eur(SIT.cumulTS)}</td>
                  <td className="hint">{(projet.ts || []).filter((x) => TS_ACQUIS.includes(x.statut)).length} avec OS</td></tr>
                {SIT.m.revision && (
                  <tr><td>Révision de prix</td><td className={`num ${SIT.revision >= 0 ? "" : "neg"}`}>{SIT.revision >= 0 ? "+" : "−"}{eur(Math.abs(SIT.revision))}</td>
                    <td className="hint">coefficient {nf(SIT.coefRevision, 4)} — index {nf(SIT.m.indexActuel, 1)} / {nf(SIT.m.indexBase, 1)}</td></tr>
                )}
                <tr className="sub-row"><td>Cumul travaux HT</td><td className="num">{eur(SIT.cumulRevise)}</td><td /></tr>
                <tr><td>Compte prorata</td><td className="num neg">−{eur(SIT.prorata)}</td><td className="hint">{nf(SIT.m.prorata, 2)} % du cumul</td></tr>
                <tr><td>Retenue de garantie</td><td className="num neg">{SIT.m.cautionRG ? "—" : `−${eur(SIT.retenue)}`}</td>
                  <td className="hint">{SIT.m.cautionRG ? "remplacée par une caution bancaire" : `${nf(SIT.m.retenue, 2)} %, libérée à la levée des réserves`}</td></tr>
                <tr><td>Remboursement de l'avance</td><td className="num neg">{SIT.remboursement > 0 ? `−${eur(SIT.remboursement)}` : "—"}</td>
                  <td className="hint">{SIT.avanceVersee > 0 ? `avance de ${eur(SIT.avanceVersee)}, remboursée au-delà de ${nf(SIT.m.seuilRemb, 0)} %` : "aucune avance au marché"}</td></tr>
                <tr className="sub-row"><td>Net cumulé</td><td className="num">{eur(SIT.netCumul)}</td><td /></tr>
                <tr><td>Situations précédentes</td><td className="num">−{eur(SIT.netPrecedent)}</td>
                  <td className="hint">{(projet.histoSit || []).length} situation{(projet.histoSit || []).length > 1 ? "s" : ""} clôturée{(projet.histoSit || []).length > 1 ? "s" : ""}</td></tr>
                <tr className="tot-row"><td>Net à payer HT</td><td className="num" style={{ color: "var(--acier)" }}>{eur(SIT.netMois)}</td><td /></tr>
                <tr><td>TVA {nf(SIT.m.tva, 1)} %</td><td className="num">{eur(SIT.tva)}</td><td /></tr>
                <tr className="tot-row"><td>Net à payer TTC</td><td className="num">{eur(SIT.ttc)}</td><td /></tr>
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="card-h"><h3>Avancement par ouvrage</h3>
              <span className="hint">saisir l'avancement cumulé de chaque ligne</span></div>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead><tr><th>Zone</th><th>Niveau</th><th>Système</th><th className="r">Marché</th>
                  <th className="r">Précédent %</th><th className="r">Cumulé %</th><th>Avancement</th><th className="r">Ce mois</th></tr></thead>
                <tbody>
                  {lignes.map(({ o, s, pv }) => {
                    const av = Math.max(0, Math.min(100, o.avAct || 0)), pr = Math.max(0, Math.min(100, o.avPrec || 0));
                    return (
                      <tr key={o.id}>
                        <td>{o.zone || "—"}</td><td>{o.niveau || "—"}</td>
                        <td><span className="mono" style={{ fontSize: 11 }}>{s?.code}</span> {o.local}</td>
                        <td className="num hint">{eur(pv)}</td>
                        <td className="num hint">{nf(pr, 0)}</td>
                        <td style={{ width: 78 }}><Num className="bare" value={o.avAct || 0} onChange={(v) => setOuv(o.id, { avAct: v })} /></td>
                        <td style={{ width: 90 }}><div className="bar"><i style={{ width: `${av}%` }} /></div></td>
                        <td className="num" style={{ color: "var(--acier)" }}>{eur(pv * ((av - pr) / 100))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {(projet.histoSit || []).length > 0 && (
            <div className="card">
              <div className="card-h"><h3>Situations clôturées</h3></div>
              <table>
                <thead><tr><th>N°</th><th>Date</th><th className="r">Cumul travaux</th><th className="r">Net cumulé</th><th className="r">Net du mois</th><th /></tr></thead>
                <tbody>
                  {(projet.histoSit || []).map((h) => (
                    <tr key={h.id}>
                      <td className="mono">{h.num}</td><td className="mono hint">{h.date}</td>
                      <td className="num hint">{eur(h.cumulHT)}</td>
                      <td className="num">{eur(h.netCumul)}</td>
                      <td className="num" style={{ color: "var(--acier)" }}>{eur(h.netMois)}</td>
                      <td className="r"><button className="btn sm danger" title="Annuler cette clôture"
                        onClick={() => { if (confirm(`Annuler la clôture de la situation n° ${h.num} ?`)) patchP({ histoSit: projet.histoSit.filter((x) => x.id !== h.id), situationNum: Math.max(1, (projet.situationNum || 2) - 1) }); }}>×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {vue === "recap" && (
        <>
          <div className="card">
            <div className="card-h">
              <h3>Récapitulatif</h3>
              <div className="chips">
                {[["zone", "Par zone"], ["niveau", "Par niveau"], ["cat", "Par catégorie"], ["poste", "Par poste DPGF"]].map(([k, lab]) => (
                  <button key={k} className={`chip ${groupe === k ? "on" : ""}`} onClick={() => setGroupe(k)}>{lab}</button>
                ))}
              </div>
            </div>
            <table>
              <thead><tr><th>Groupe</th><th className="r">Lignes</th><th className="r">Quantité</th>
                <th className="r">Déboursé sec</th><th className="r">Vente HT</th><th className="r">Marge</th><th className="r">Part</th></tr></thead>
              <tbody>
                {groupes.map(([k, g]) => (
                  <tr key={k}>
                    <td>{k}</td><td className="num hint">{g.n}</td><td className="num">{nf(g.qte, 2)}</td>
                    <td className="num">{eur(g.ds)}</td>
                    <td className="num" style={{ color: "var(--acier)" }}>{eur(g.pv)}</td>
                    <td className="num">{nf(g.pv > 0 ? ((g.pv - g.ds) / g.pv) * 100 : 0, 1)} %</td>
                    <td className="num hint">{t.pv > 0 ? nf((g.pv / t.pv) * 100, 1) : "0,0"} %</td>
                  </tr>
                ))}
                <tr><td>Frais de chantier</td><td className="num hint">{(projet.fraisChantier || []).length}</td><td className="num">—</td>
                  <td className="num">{eur(t.frais)}</td>
                  <td className="num" style={{ color: "var(--acier)" }}>{eur(t.frais * coefEntreprise(params))}</td>
                  <td className="num">—</td><td className="num hint">{t.pv > 0 ? nf((t.frais * coefEntreprise(params) / t.pv) * 100, 1) : "0,0"} %</td></tr>
                <tr className="tot-row"><td colSpan={3}>Total</td><td className="num">{eur(t.ds)}</td>
                  <td className="num" style={{ color: "var(--acier)" }}>{eur(t.pv)}</td>
                  <td className="num">{nf(t.tauxMarque, 1)} %</td><td className="num">100,0 %</td></tr>
              </tbody>
            </table>
          </div>

          {variantes.length > 1 && (
            <div className="card">
              <div className="card-h"><h3>Comparatif des variantes</h3></div>
              <table>
                <thead><tr><th>Variante</th><th className="r">Quantité</th><th className="r">Heures</th>
                  <th className="r">Déboursé sec</th><th className="r">Vente HT</th><th className="r">Écart / base</th></tr></thead>
                <tbody>
                  {compVariantes.map((v) => {
                    const base = compVariantes[0];
                    const ec = base.pv > 0 ? ((v.pv - base.pv) / base.pv) * 100 : 0;
                    return (
                      <tr key={v.v} style={v.v === vAct ? { background: "var(--acier-l)" } : undefined}>
                        <td>{v.v}</td><td className="num">{nf(v.qte, 2)}</td><td className="num">{nf(v.h, 0)} h</td>
                        <td className="num">{eur(v.ds)}</td>
                        <td className="num" style={{ color: "var(--acier)" }}>{eur(v.pv)}</td>
                        <td className={`num ${ec > 0 ? "neg" : ec < 0 ? "pos" : "hint"}`}>{v.v === compVariantes[0].v ? "—" : `${ec > 0 ? "+" : ""}${nf(ec, 1)} %`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
