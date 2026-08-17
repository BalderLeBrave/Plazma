import React, { useState, useMemo } from "react";
import { csvN, eur, nf, pluriel, telecharger, today, uid } from "../domaine/format.js";
import { FAMILLES_ART, MODE_COUPE, MODE_COUPE_LIB, UNITES } from "../domaine/referentiel.js";
import { contenance, lotAchat, nomLot } from "../domaine/articles.js";
import { P } from "../domaine/systemes.js";
import { coefDeMarge, margeArticle } from "../domaine/moteur.js";
import { Num, SelectListe, TauxMarge } from "./base.jsx";


/* ================================================================== */
/*  6. Articles et prix                                                */
/* ================================================================== */

export function Articles({ articles, setArticles, systemes, marques, addMarque, fournisseurs, addFournisseur, params }) {
  const [fam, setFam] = useState("Toutes");
  const [marque, setMarque] = useState("Toutes");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);

  const usage = useMemo(() => {
    const m = {};
    systemes.forEach((s) => s.lignes.forEach((l) => (m[l.art] = (m[l.art] || 0) + 1)));
    return m;
  }, [systemes]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return articles.filter((a) =>
      (fam === "Toutes" || a.famille === fam) && (marque === "Toutes" || a.marque === marque) &&
      (!t || a.des.toLowerCase().includes(t) || (a.marque || "").toLowerCase().includes(t)));
  }, [articles, fam, marque, q]);

  const patch = (id, p) => setArticles((as) => as.map((a) => (a.id === id ? { ...a, ...p } : a)));

  const setPrix = (a, prix) => {
    const histo = [...(a.histo || [])];
    if (!histo.length || histo[histo.length - 1].prix !== prix) histo.push({ date: today(), prix });
    patch(a.id, { prix, histo: histo.slice(-20) });
  };

  const exportBordereau = () => {
    const L = ["Designation;Marque;Famille;Unite;PA_HT;Mode_marge;Taux;PV_HT;Longueur_m;Largeur_m;Debit;Colisage;Qte_par_colis;Colis_par_palette;Palette_entiere;Lot_commandable;Poids_unitaire;Fournisseur_retenu;Code_article;Designation_fournisseur"];
    articles.forEach((a) => {
      const m = margeArticle(a, params);
      const f = (a.fournisseurs || []).find((x) => Math.abs((x.prix || 0) - (a.prix || 0)) < 0.0001);
      L.push([a.des, a.marque, a.famille, a.unite, csvN(a.prix, 3), m.mode, csvN(m.taux, 1),
      csvN(a.prix * coefDeMarge(m), 3), csvN(a.long || 0, 3), csvN(a.larg || 0, 3), a.coupe || "aucune",
      a.colis, csvN(a.parColis, 2), a.parPalette, a.paletteEntiere ? "oui" : "non", csvN(lotAchat(a), 2),
      csvN(a.poids, 3), f ? f.nom : "", f ? (f.ref || "") : "", f ? (f.libelle || "") : ""].join(";"));
    });
    telecharger("bordereau-fournitures.csv", L.join("\n"));
  };

  return (
    <div className="pad">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <div className="chips">
          {["Toutes", ...FAMILLES_ART].map((f) => (
            <button key={f} className={`chip ${fam === f ? "on" : ""}`} onClick={() => setFam(f)}>{f}</button>
          ))}
        </div>
        <div className="row">
          <select value={marque} onChange={(e) => setMarque(e.target.value)} style={{ width: 140 }}>
            <option>Toutes</option>
            {marques.map((m) => <option key={m.id}>{m.nom}</option>)}
          </select>
          <input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 180 }} />
          <button className="btn" onClick={exportBordereau}>Exporter</button>
          <button className="btn pri" onClick={() => setArticles((as) => [{
            id: uid(), des: "Nouvel article", marque: marques[0]?.nom || "Interne", famille: "Accessoire",
            unite: "u", prix: 0, colis: "unité", parColis: 1, poids: 0.3, parPalette: 24,
            long: 0, larg: 0, coupe: "aucune", paletteEntiere: false,
            marge: null, fournisseurs: [], histo: [],
          }, ...as])}>+ Article</button>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>Bordereau des prix fournitures</h3>
          <span className="hint">
            {list.length} article{list.length > 1 ? "s" : ""} · marge par défaut {params.margeArtDefaut.mode === "marge" ? "marge" : "marque"} {nf(params.margeArtDefaut.taux, 1)} %
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th /><th>Désignation</th><th>Marque</th><th>Famille</th><th>Unité</th>
                <th className="r">P.A. HT</th><th>Marge ou marque</th><th className="r">P.V. HT</th>
                <th>Colisage</th><th className="r">Qté / colis</th><th className="r">Syst.</th><th />
              </tr>
            </thead>
            <tbody>
              {list.map((a) => {
                const m = margeArticle(a, params);
                const pv = (a.prix || 0) * coefDeMarge(m);
                const ouvert = open === a.id;
                return (
                  <React.Fragment key={a.id}>
                    <tr>
                      <td style={{ width: 26 }}>
                        <button className="btn sm" onClick={() => setOpen(ouvert ? null : a.id)} aria-label="Détail article">
                          {ouvert ? "−" : "+"}
                        </button>
                      </td>
                      <td><input className="bare" value={a.des} onChange={(e) => patch(a.id, { des: e.target.value })} style={{ minWidth: 210 }} /></td>
                      <td style={{ width: 128 }}>
                        <SelectListe className="bare" value={a.marque} items={marques} onCreate={addMarque} libelle="marque"
                          onChange={(v) => patch(a.id, { marque: v })} />
                      </td>
                      <td>
                        <select className="bare" value={a.famille} onChange={(e) => patch(a.id, { famille: e.target.value })}>
                          {FAMILLES_ART.map((f) => <option key={f}>{f}</option>)}
                        </select>
                      </td>
                      <td>
                        <select className="bare" value={a.unite} onChange={(e) => patch(a.id, { unite: e.target.value })} style={{ width: 58 }}>
                          {UNITES.map((u) => <option key={u}>{u}</option>)}
                        </select>
                      </td>
                      <td style={{ width: 86 }}><Num className="bare" value={a.prix} onChange={(v) => setPrix(a, v)} /></td>
                      <td style={{ minWidth: 210 }}>
                        <div className="row" style={{ gap: 4, flexWrap: "nowrap" }}>
                          <TauxMarge compact valeur={m} onChange={(v) => patch(a.id, { marge: v })} />
                          {a.marge ? (
                            <button className="btn sm" title="Revenir au taux par défaut" onClick={() => patch(a.id, { marge: null })}>↺</button>
                          ) : <span className="hint">déf.</span>}
                        </div>
                      </td>
                      <td className="num" style={{ color: "var(--acier)" }}>{eur(pv, 3)}</td>
                      <td>
                        <div className="hint mono" style={{ whiteSpace: "nowrap" }}>
                          {nomLot(a)}{a.long > 0 ? ` · ${nf(a.long, 2)}${a.larg > 0 ? " × " + nf(a.larg, 2) : ""} m` : ""}
                        </div>
                      </td>
                      <td className="num hint">{nf(lotAchat(a), 2)}</td>
                      <td className="num hint">{usage[a.id] || 0}</td>
                      <td className="r"><button className="btn sm danger" onClick={() => {
                        if (usage[a.id] > 0 && !confirm(`Cet article est utilisé dans ${usage[a.id]} système(s). Le supprimer quand même ?`)) return;
                        setArticles((as) => as.filter((x) => x.id !== a.id));
                      }} aria-label="Supprimer">×</button></td>
                    </tr>
                    {ouvert && (
                      <tr>
                        <td colSpan={12} style={{ padding: 0 }}>
                          <div className="fold">
                            <div className="eyebrow">Dimensions et conditionnement</div>
                            <div className="row" style={{ gap: 10, alignItems: "flex-end", margin: "6px 0 10px" }}>
                              <label className="fld" style={{ width: 96 }}><span>Longueur m</span>
                                <Num value={a.long || 0} onChange={(v) => patch(a.id, { long: v })} /></label>
                              <label className="fld" style={{ width: 96 }}><span>Largeur m</span>
                                <Num value={a.larg || 0} onChange={(v) => patch(a.id, { larg: v })} /></label>
                              <label className="fld" style={{ width: 132 }}><span>Débit</span>
                                <select value={a.coupe || "aucune"} onChange={(e) => patch(a.id, { coupe: e.target.value })}>
                                  {MODE_COUPE.map((m) => <option key={m} value={m}>{MODE_COUPE_LIB[m]}</option>)}
                                </select></label>
                              <label className="fld" style={{ width: 110 }}><span>Poids par {a.unite} kg</span>
                                <Num value={a.poids} onChange={(v) => patch(a.id, { poids: v })} /></label>
                              {contenance(a) > 0 && Math.abs(contenance(a) - (a.parColis || 0)) > 0.001 && (
                                <button className="btn sm" style={{ marginBottom: 1 }}
                                  onClick={() => patch(a.id, { parColis: Math.round(contenance(a) * 1000) / 1000 })}>
                                  Reprendre {nf(contenance(a), 3)} {a.unite} / {a.colis}
                                </button>
                              )}
                            </div>

                            <div className="row" style={{ gap: 10, alignItems: "flex-end", marginBottom: 10 }}>
                              <label className="fld" style={{ width: 110 }}><span>Nom du colis</span>
                                <input value={a.colis} onChange={(e) => patch(a.id, { colis: e.target.value })} /></label>
                              <label className="fld" style={{ width: 118 }}><span>{a.unite} par {a.colis || "colis"}</span>
                                <Num value={a.parColis} onChange={(v) => patch(a.id, { parColis: v })} /></label>
                              <label className="fld" style={{ width: 122 }}><span>{pluriel(a.colis || "colis", 2)} par palette</span>
                                <Num value={a.parPalette} onChange={(v) => patch(a.id, { parPalette: v })} /></label>
                              <label className="row" style={{ gap: 6, fontSize: 12.5, paddingBottom: 6 }}>
                                <input type="checkbox" checked={!!a.paletteEntiere} style={{ width: 14 }}
                                  onChange={(e) => patch(a.id, { paletteEntiere: e.target.checked })} />
                                Vendu par palette entière uniquement
                              </label>
                            </div>
                            <p className="hint" style={{ margin: "0 0 12px" }}>
                              Plus petit lot commandable : {nf(lotAchat(a), 2)} {a.unite} — 1 {nomLot(a)}
                              {a.paletteEntiere ? ` de ${nf(a.parPalette, 0)} ${pluriel(a.colis, a.parPalette)}` : ""} ·
                              {" "}{nf((a.poids || 0) * lotAchat(a), 1)} kg ·
                              {" "}{a.coupe === "aucune"
                                ? " aucune chute de débit calculée"
                                : a.coupe === "surface"
                                  ? ` chute calculée sur ${nf(a.long, 2)} × ${nf(a.larg, 2)} m`
                                  : ` chute calculée sur une barre de ${nf(a.long, 2)} m`}
                            </p>

                            <div className="row" style={{ justifyContent: "space-between" }}>
                              <span className="eyebrow">Prix fournisseurs</span>
                              <button className="btn sm" onClick={() => patch(a.id, {
                                fournisseurs: [...(a.fournisseurs || []), { id: uid(), nom: fournisseurs[0]?.nom || "", ref: "", libelle: "", prix: a.prix, maj: today() }],
                              })}>+ Fournisseur</button>
                            </div>
                            <table style={{ marginTop: 6, background: "var(--panel)" }}>
                              <thead><tr><th>Fournisseur</th><th>Code article</th><th>Désignation fournisseur</th><th className="r">Prix HT</th><th className="r">Écart / retenu</th><th>Mise à jour</th><th /></tr></thead>
                              <tbody>
                                {(a.fournisseurs || []).map((f) => {
                                  const ecart = (a.prix || 0) > 0 ? ((f.prix - a.prix) / a.prix) * 100 : 0;
                                  const retenu = Math.abs((f.prix || 0) - (a.prix || 0)) < 0.0001;
                                  const maj = (p) => patch(a.id, { fournisseurs: a.fournisseurs.map((x) => x.id === f.id ? { ...x, ...p } : x) });
                                  return (
                                    <tr key={f.id}>
                                      <td style={{ width: 150 }}>
                                        <SelectListe className="bare" value={f.nom} items={fournisseurs} onCreate={addFournisseur} libelle="fournisseur"
                                          onChange={(v) => maj({ nom: v })} />
                                      </td>
                                      <td style={{ width: 118 }}>
                                        <input className="bare mono" value={f.ref || ""} placeholder="réf. catalogue"
                                          onChange={(e) => maj({ ref: e.target.value })} />
                                      </td>
                                      <td>
                                        <input className="bare" value={f.libelle || ""} placeholder="libellé du fournisseur" style={{ minWidth: 180 }}
                                          onChange={(e) => maj({ libelle: e.target.value })} />
                                      </td>
                                      <td style={{ width: 88 }}>
                                        <Num className="bare" value={f.prix} onChange={(v) => maj({ prix: v, maj: today() })} />
                                      </td>
                                      <td className={`num ${ecart > 0 ? "neg" : ecart < 0 ? "pos" : "hint"}`}>
                                        {retenu ? "—" : `${ecart > 0 ? "+" : ""}${nf(ecart, 1)} %`}
                                      </td>
                                      <td className="hint mono">{f.maj}</td>
                                      <td className="r" style={{ whiteSpace: "nowrap" }}>
                                        {retenu ? <span className="bdg ok">retenu</span>
                                          : <button className="btn sm" onClick={() => setPrix(a, f.prix)}>Retenir</button>}{" "}
                                        <button className="btn sm danger" onClick={() => patch(a.id, { fournisseurs: a.fournisseurs.filter((x) => x.id !== f.id) })} aria-label="Supprimer">×</button>
                                      </td>
                                    </tr>
                                  );
                                })}
                                {(a.fournisseurs || []).length === 0 && (
                                  <tr><td colSpan={7} className="hint" style={{ padding: 10 }}>Aucun prix fournisseur. Ajoute-en pour comparer et tracer les hausses.</td></tr>
                                )}
                              </tbody>
                            </table>

                            {(a.histo || []).length > 1 && (
                              <p className="hint" style={{ marginTop: 8, marginBottom: 0 }}>
                                Historique du prix retenu : {a.histo.slice(-6).map((h) => `${h.date} ${nf(h.prix, 3)} €`).join(" → ")}
                                {a.histo.length > 1 && (() => {
                                  const d = a.histo[0].prix, f = a.histo[a.histo.length - 1].prix;
                                  const v = d > 0 ? ((f - d) / d) * 100 : 0;
                                  return ` · évolution ${v > 0 ? "+" : ""}${nf(v, 1)} %`;
                                })()}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="hint" style={{ marginTop: 10 }}>
        Taux de marge = marge / prix d'achat. Taux de marque = marge / prix de vente. Les deux équivalences sont affichées côte à côte :
        30 % de marque correspond à 42,9 % de marge.
      </p>
    </div>
  );
}
