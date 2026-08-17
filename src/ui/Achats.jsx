import React, { useState, useMemo } from "react";
import { csvN, eur, nf, pluriel, telecharger, today, uid } from "../domaine/format.js";
import { FAMILLES_ART, STATUTS_CDE, TX_CAUSE, TX_GAIN, TX_GEO_HAUTEUR, TX_GEO_LONGUEUR, TX_GEO_NONE, TX_GEO_SURFACE, TX_LECTURE } from "../domaine/referentiel.js";
import { lotAchat, nomLot } from "../domaine/articles.js";
import { P } from "../domaine/systemes.js";
import { besoinsDetail, calculBesoins, ecartArticle, ecartHerite, suiviAchats } from "../domaine/moteur.js";
import { Coupe, Num, SelectListe } from "./base.jsx";


/* ================================================================== */
/*  9. Achats                                                          */
/* ================================================================== */

export function Achats({ projet, patchP, sysMap, artMap, params, fournisseurs, setSystemes }) {
  const [vue, setVue] = useState("besoins");
  const [zone, setZone] = useState("Toutes");
  const [niveau, setNiveau] = useState("Tous");
  const [famille, setFamille] = useState("Toutes");
  const [fourn, setFourn] = useState("Tous");
  const [detail, setDetail] = useState(false);
  const [openCde, setOpenCde] = useState(null);

  const zones = ["Toutes", ...(projet?.zones || [])];
  const niveaux = ["Tous", ...(projet?.niveaux || [])];
  const filtres = { zone, niveau, famille, fournisseur: fourn };

  const besoins = useMemo(() => (projet ? calculBesoins(projet, sysMap, artMap, filtres) : []),
    [projet, sysMap, artMap, zone, niveau, famille, fourn]);
  const besoinsTous = useMemo(() => (projet ? calculBesoins(projet, sysMap, artMap, {}) : []), [projet, sysMap, artMap]);
  const suivi = useMemo(() => (projet ? suiviAchats(projet, besoinsTous) : []), [projet, besoinsTous]);

  const detailGeo = useMemo(() => (projet ? besoinsDetail(projet, sysMap, artMap) : {}), [projet, sysMap, artMap]);
  const ecarts = useMemo(() => Object.values(detailGeo).map((e) => ecartArticle(e, projet)), [detailGeo, projet]);
  const ecSorted = useMemo(() => [...ecarts].sort((x, y) => Math.abs(y.evTot) - Math.abs(x.evTot)), [ecarts]);
  const [selArt, setSelArt] = useState(null);
  const E = ecarts.find((x) => x.art.id === selArt) || ecSorted[0] || null;

  const total = besoins.reduce((a, b) => a + b.montant, 0);
  const poidsTotal = besoins.reduce((a, b) => a + b.poids, 0);
  const palettes = besoins.reduce((a, b) => a + (b.art.parPalette > 0 ? Math.ceil(b.colis / b.art.parPalette) : 0), 0);

  const exportBesoins = () => {
    const L = ["Article;Marque;Famille;Besoin;Unite;Colisage;A_commander;PU_HT;Montant_HT;Poids_kg;Zone;Niveau"];
    besoins.forEach((b) => L.push([b.art.des, b.art.marque, b.art.famille, csvN(b.qte), b.art.unite,
      pluriel(nomLot(b.art), b.colis), b.colis, csvN(b.art.prix, 3), csvN(b.montant), csvN(b.poids, 1), zone, niveau].join(";")));
    telecharger(`besoins_${projet.nom.replace(/\s+/g, "-")}_${zone}_${niveau}.csv`, L.join("\n"));
  };

  const creerCommande = () => {
    const cible = besoins.filter((b) => {
      const s = suivi.find((x) => x.art.id === b.art.id);
      return (s ? s.resteACommander : b.qte) > 0;
    });
    if (!cible.length) { alert("Rien à commander avec ces filtres : tout est déjà couvert."); return; }
    const nom = fourn !== "Tous" ? fourn : (fournisseurs[0]?.nom || "");
    const cde = {
      id: uid(), num: `CDE-${String((projet.commandes || []).length + 1).padStart(3, "0")}`,
      fourn: nom, date: today(), livraison: "", statut: "À passer",
      zone: zone === "Toutes" ? "" : zone, niveau: niveau === "Tous" ? "" : niveau,
      lignes: cible.map((b) => {
        const s = suivi.find((x) => x.art.id === b.art.id);
        const q = s ? Math.max(0, s.resteACommander) : b.qte;
        const colis = lotAchat(b.art) > 0 ? Math.ceil(q / lotAchat(b.art)) : 0;
        const f = (b.art.fournisseurs || []).find((x) => x.nom === nom);
        return { id: uid(), art: b.art.id, qte: colis * (lotAchat(b.art) || 1), colis, pu: f ? f.prix : b.art.prix, livre: 0, puFacture: 0 };
      }),
    };
    patchP({ commandes: [...(projet.commandes || []), cde] });
    setVue("commandes"); setOpenCde(cde.id);
  };

  const setCde = (id, p) => patchP({ commandes: projet.commandes.map((c) => (c.id === id ? { ...c, ...p } : c)) });
  const setLigneCde = (cid, lid, p) => setCde(cid, {
    lignes: projet.commandes.find((c) => c.id === cid).lignes.map((l) => (l.id === lid ? { ...l, ...p } : l)),
  });

  const exportCde = (c) => {
    const L = [`Bon de commande;${c.num}`, `Chantier;${projet.nom}`, `Fournisseur;${c.fourn}`,
    `Date;${c.date}`, `Livraison souhaitee;${c.livraison}`, `Zone;${c.zone};Niveau;${c.niveau}`, "",
      "Reference;Designation;Quantite;Unite;Colis;Nb_colis;PU_HT;Montant_HT"];
    let tot = 0;
    (c.lignes || []).forEach((l) => {
      const a = artMap[l.art]; if (!a) return;
      const m = (l.qte || 0) * (l.pu || 0); tot += m;
      const f = (a.fournisseurs || []).find((x) => x.nom === c.fourn);
      L.push([f?.ref || "", a.des, csvN(l.qte), a.unite, a.colis, l.colis || "", csvN(l.pu, 3), csvN(m)].join(";"));
    });
    L.push("", `TOTAL HT;;;;;;;${csvN(tot)}`);
    telecharger(`${c.num}_${c.fourn.replace(/\s+/g, "-")}.csv`, L.join("\n"));
  };

  /* Logistique par zone et niveau */
  const logistique = useMemo(() => {
    const g = {};
    besoins.forEach((b) => {
      Object.entries(b.detail).forEach(([k, q]) => {
        if (!g[k]) g[k] = { poids: 0, colis: 0, palettes: 0, montant: 0 };
        g[k].poids += q * (b.art.poids || 0);
        const colis = lotAchat(b.art) > 0 ? q / lotAchat(b.art) : 0;
        g[k].colis += colis;
        g[k].palettes += b.art.parPalette > 0 ? colis / b.art.parPalette : 0;
        g[k].montant += q * (b.art.prix || 0);
      });
    });
    return Object.entries(g).sort();
  }, [besoins]);

  if (!projet) return <div className="pad"><div className="card empty">Aucun projet ouvert. Crée un projet dans l'onglet Projets pour calculer les besoins.</div></div>;

  const appliquerPerte = (s) => {
    if (s.perteReelle === null) return;
    const t = Math.round(s.perteReelle * 10) / 10;
    if (!confirm(`Appliquer une perte de ${nf(t, 1)} % aux lignes de nomenclature utilisant « ${s.art.des} » ?\n\nCe taux devient une dérogation propre à cet article : les autres lignes gardent le taux de leur système.`)) return;
    setSystemes((ss) => ss.map((sys) => ({
      ...sys, lignes: sys.lignes.map((l) => (l.art === s.art.id ? { ...l, perte: Math.max(0, t) } : l)),
    })));
  };

  const totSuivi = suivi.reduce((a, s) => ({
    budget: a.budget + s.montant, commande: a.commande + s.commande * (s.art.prix || 0),
    reel: a.reel + s.montantReel, ecart: a.ecart + s.ecart,
  }), { budget: 0, commande: 0, reel: 0, ecart: 0 });

  return (
    <div className="pad">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <div className="chips">
          {[["besoins", "Besoins"], ["logistique", "Logistique"], ["commandes", "Commandes"], ["suivi", "Suivi et écarts"], ["ecart", "Écart expliqué"]].map(([k, lab]) => (
            <button key={k} className={`chip ${vue === k ? "on" : ""}`} onClick={() => setVue(k)}>{lab}</button>
          ))}
        </div>
        <span className="hint">Variante {projet.varianteActive || "Base"}</span>
      </div>

      {(vue === "besoins" || vue === "logistique") && (
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <div className="row">
            <label className="fld"><span>Zone</span>
              <select value={zone} onChange={(e) => setZone(e.target.value)} style={{ width: 130 }}>{zones.map((z) => <option key={z}>{z}</option>)}</select></label>
            <label className="fld"><span>Niveau</span>
              <select value={niveau} onChange={(e) => setNiveau(e.target.value)} style={{ width: 110 }}>{niveaux.map((n) => <option key={n}>{n}</option>)}</select></label>
            <label className="fld"><span>Famille</span>
              <select value={famille} onChange={(e) => setFamille(e.target.value)} style={{ width: 120 }}>
                <option>Toutes</option>{FAMILLES_ART.map((f) => <option key={f}>{f}</option>)}</select></label>
            <label className="fld"><span>Fournisseur</span>
              <select value={fourn} onChange={(e) => setFourn(e.target.value)} style={{ width: 150 }}>
                <option>Tous</option>{fournisseurs.map((f) => <option key={f.id}>{f.nom}</option>)}</select></label>
          </div>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn" onClick={exportBesoins}>Exporter</button>
            <button className="btn pri" onClick={creerCommande}>Créer une commande</button>
          </div>
        </div>
      )}

      {vue === "besoins" && (
        <>
          <div className="kpis" style={{ marginBottom: 14 }}>
            <div className="kpi"><span className="eyebrow">Références</span><b>{besoins.length}</b></div>
            <div className="kpi"><span className="eyebrow">Tonnage</span><b>{nf(poidsTotal / 1000, 2)} t</b></div>
            <div className="kpi"><span className="eyebrow">Palettes</span><b>{palettes}</b></div>
            <div className="kpi"><span className="eyebrow">Total achats HT</span><b style={{ color: "var(--acier)" }}>{eur(total)}</b></div>
          </div>
          <div className="card">
            <div className="card-h">
              <h3>Besoins matière — {projet.nom}</h3>
              <label className="row" style={{ gap: 6, fontSize: 12.5 }}>
                <input type="checkbox" checked={detail} onChange={(e) => setDetail(e.target.checked)} style={{ width: 14 }} />
                Détail par zone et niveau
              </label>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead><tr><th>Article</th><th>Marque</th><th className="r">Besoin</th><th className="r">À commander</th>
                  <th className="r">Poids</th><th className="r">P.U.</th><th className="r">Montant HT</th></tr></thead>
                <tbody>
                  {besoins.map((b) => (
                    <React.Fragment key={b.art.id}>
                      <tr>
                        <td>{b.art.des}</td><td className="hint">{b.art.marque}</td>
                        <td className="num">{nf(b.qte, 2)} <span className="hint">{b.art.unite}</span></td>
                        <td className="num" style={{ fontWeight: 600 }}>{nf(b.colis, 0)} <span className="hint" style={{ fontWeight: 400 }}>{pluriel(nomLot(b.art), b.colis)}</span></td>
                        <td className="num hint">{nf(b.poids, 0)} kg</td>
                        <td className="num hint">{eur(b.art.prix, 3)}</td>
                        <td className="num">{eur(b.montant)}</td>
                      </tr>
                      {detail && Object.entries(b.detail).sort().map(([k, q]) => {
                const nc = lotAchat(b.art) > 0 ? Math.ceil(q / lotAchat(b.art)) : 0;
                        return (
                          <tr key={b.art.id + k}>
                            <td colSpan={2} style={{ paddingLeft: 26 }} className="hint">↳ {k}</td>
                            <td className="num hint">{nf(q, 2)} {b.art.unite}</td>
                            <td className="num hint">{nc} {pluriel(nomLot(b.art), nc)}</td>
                            <td colSpan={3} />
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  {besoins.length === 0 && <tr><td colSpan={7} className="empty">Rien à commander avec ces filtres.</td></tr>}
                  <tr className="tot-row"><td colSpan={6}>Total fournitures HT</td><td className="num">{eur(total)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {vue === "logistique" && (
        <div className="card">
          <div className="card-h"><h3>Poids et palettes par zone et niveau</h3>
            <span className="hint">une plaque BA13 de 2,50 m pèse environ 25 kg</span></div>
          <table>
            <thead><tr><th>Zone · niveau</th><th className="r">Tonnage</th><th className="r">Colis</th>
              <th className="r">Palettes</th><th className="r">Montant HT</th></tr></thead>
            <tbody>
              {logistique.map(([k, g]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td className="num">{nf(g.poids / 1000, 2)} t</td>
                  <td className="num">{nf(g.colis, 0)}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{Math.ceil(g.palettes)}</td>
                  <td className="num hint">{eur(g.montant)}</td>
                </tr>
              ))}
              {logistique.length === 0 && <tr><td colSpan={5} className="empty">Aucun besoin calculé.</td></tr>}
              <tr className="tot-row"><td>Total</td><td className="num">{nf(poidsTotal / 1000, 2)} t</td>
                <td className="num">{nf(besoins.reduce((a, b) => a + b.colis, 0), 0)}</td>
                <td className="num">{palettes}</td><td className="num hint">{eur(total)}</td></tr>
            </tbody>
          </table>
          <p className="hint" style={{ padding: "10px 14px", margin: 0 }}>
            À croiser avec la capacité du monte-charge et les créneaux de livraison : c'est ce tableau qui dimensionne le fractionnement des commandes.
          </p>
        </div>
      )}

      {vue === "commandes" && (
        <>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <span className="eyebrow">{(projet.commandes || []).length} commande{(projet.commandes || []).length > 1 ? "s" : ""}</span>
            <button className="btn pri" onClick={() => setVue("besoins")}>Créer depuis les besoins</button>
          </div>
          {(projet.commandes || []).length === 0 && (
            <div className="card empty">Aucune commande. Filtre les besoins par zone, niveau ou fournisseur, puis clique sur « Créer une commande ».</div>
          )}
          {(projet.commandes || []).map((c) => {
            const totC = (c.lignes || []).reduce((a, l) => a + (l.qte || 0) * (l.pu || 0), 0);
            const totLiv = (c.lignes || []).reduce((a, l) => a + (l.livre || 0) * (l.puFacture || l.pu || 0), 0);
            const ouvert = openCde === c.id;
            return (
              <div className="card" key={c.id}>
                <div className="card-h">
                  <div className="row" style={{ gap: 10 }}>
                    <button className="btn sm" onClick={() => setOpenCde(ouvert ? null : c.id)}>{ouvert ? "−" : "+"}</button>
                    <b className="mono">{c.num}</b>
                    <span>{c.fourn}</span>
                    <span className="bdg">{c.statut}</span>
                    {c.zone && <span className="bdg">{c.zone}</span>}
                    {c.niveau && <span className="bdg">{c.niveau}</span>}
                  </div>
                  <div className="row">
                    <span className="num">{eur(totC)}</span>
                    <button className="btn sm" onClick={() => exportCde(c)}>Bon de commande</button>
                    <button className="btn sm danger" onClick={() => {
                      if (confirm(`Supprimer la commande ${c.num} ?`)) patchP({ commandes: projet.commandes.filter((x) => x.id !== c.id) });
                    }}>×</button>
                  </div>
                </div>
                {ouvert && (
                  <>
                    <div className="row" style={{ padding: 12, gap: 12 }}>
                      <label className="fld" style={{ width: 110 }}><span>N°</span>
                        <input className="mono" value={c.num} onChange={(e) => setCde(c.id, { num: e.target.value })} /></label>
                      <label className="fld" style={{ width: 160 }}><span>Fournisseur</span>
                        <SelectListe value={c.fourn} items={fournisseurs} onCreate={() => { }} libelle="fournisseur"
                          onChange={(v) => setCde(c.id, { fourn: v })} /></label>
                      <label className="fld" style={{ width: 130 }}><span>Date commande</span>
                        <input type="date" value={c.date} onChange={(e) => setCde(c.id, { date: e.target.value })} /></label>
                      <label className="fld" style={{ width: 130 }}><span>Livraison prévue</span>
                        <input type="date" value={c.livraison || ""} onChange={(e) => setCde(c.id, { livraison: e.target.value })} /></label>
                      <label className="fld" style={{ width: 120 }}><span>Statut</span>
                        <select value={c.statut} onChange={(e) => setCde(c.id, { statut: e.target.value })}>
                          {STATUTS_CDE.map((s) => <option key={s}>{s}</option>)}</select></label>
                      <label className="fld" style={{ width: 110 }}><span>Zone</span>
                        <select value={c.zone || ""} onChange={(e) => setCde(c.id, { zone: e.target.value })}>
                          <option value="">—</option>{(projet.zones || []).map((z) => <option key={z}>{z}</option>)}</select></label>
                      <label className="fld" style={{ width: 100 }}><span>Niveau</span>
                        <select value={c.niveau || ""} onChange={(e) => setCde(c.id, { niveau: e.target.value })}>
                          <option value="">—</option>{(projet.niveaux || []).map((n) => <option key={n}>{n}</option>)}</select></label>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table>
                        <thead><tr><th>Article</th><th className="r">Colis</th><th className="r">Quantité</th>
                          <th className="r">P.U. négocié</th><th className="r">Montant</th><th className="r">Livré</th>
                          <th className="r">P.U. facturé</th><th className="r">Écart</th><th /></tr></thead>
                        <tbody>
                          {(c.lignes || []).map((l) => {
                            const a = artMap[l.art];
                            const ecart = (l.puFacture || 0) > 0 ? ((l.puFacture - l.pu) / (l.pu || 1)) * 100 : null;
                            const alerte = ecart !== null && Math.abs(ecart) > (params.seuilAlerte || 5);
                            return (
                              <tr key={l.id}>
                                <td>{a?.des || "—"}</td>
                                <td style={{ width: 72 }}><Num className="bare" value={l.colis || 0} onChange={(v) => setLigneCde(c.id, l.id, { colis: v, qte: v * (a?.parColis || 1) })} /></td>
                                <td className="num">{nf(l.qte, 2)} <span className="hint">{a?.unite}</span></td>
                                <td style={{ width: 88 }}><Num className="bare" value={l.pu} onChange={(v) => setLigneCde(c.id, l.id, { pu: v })} /></td>
                                <td className="num">{eur((l.qte || 0) * (l.pu || 0))}</td>
                                <td style={{ width: 84 }}><Num className="bare" value={l.livre || 0} onChange={(v) => setLigneCde(c.id, l.id, { livre: v })} /></td>
                                <td style={{ width: 88 }}><Num className="bare" value={l.puFacture || 0} onChange={(v) => setLigneCde(c.id, l.id, { puFacture: v })} /></td>
                                <td className={`num ${ecart === null ? "hint" : alerte ? "neg" : "pos"}`}>
                                  {ecart === null ? "—" : `${ecart > 0 ? "+" : ""}${nf(ecart, 1)} %`}
                                </td>
                                <td className="r"><button className="btn sm danger" onClick={() => setCde(c.id, { lignes: c.lignes.filter((x) => x.id !== l.id) })} aria-label="Supprimer">×</button></td>
                              </tr>
                            );
                          })}
                          <tr className="tot-row"><td colSpan={4}>Total commandé</td><td className="num">{eur(totC)}</td>
                            <td colSpan={2} className="hint">livré et facturé</td><td className="num">{eur(totLiv)}</td><td /></tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="hint" style={{ padding: "10px 14px", margin: 0 }}>
                      Saisis les quantités livrées à réception et le prix facturé : l'écart signale les factures qui s'écartent du prix négocié de plus de {nf(params.seuilAlerte, 0)} %.
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </>
      )}

      {vue === "ecart" && (
        <>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <div className="row" style={{ gap: 12 }}>
              <label className="fld" style={{ width: 128 }}><span>Casse par défaut %</span>
                <Num value={projet.casseDef ?? 0} onChange={(v) => patchP({ casseDef: v })} /></label>
              <label className="fld" style={{ width: 148 }}><span>Reprises par défaut %</span>
                <Num value={projet.repriseDef ?? 0} onChange={(v) => patchP({ repriseDef: v })} /></label>
              <span className="hint" style={{ maxWidth: 420, paddingBottom: 4 }}>
                Taux appliqués à la quantité nette de chaque article, dérogeables ligne par ligne dans le panneau de droite.
              </span>
            </div>
            <button className="btn" style={{ marginTop: 14 }} onClick={() => {
              const L = ["Article;Famille;Nette;Chiffre;Coupe;Colis;Casse;Reprise;Residu;Consomme;Perte_theo_pc;Perte_reelle_pc;Ecart_pts;Ecart_qte;Ecart_prix;Ecart_total;Cause_dominante"];
              ecSorted.forEach((x) => L.push([x.art.des, x.art.famille, csvN(x.nette, 1), csvN(x.theo, 1),
                csvN(x.coupe, 1), csvN(x.condit, 1), csvN(x.casse, 1), csvN(x.reprise, 1), csvN(x.residu, 1),
                csvN(x.cons, 1), csvN(x.pTheo, 1), csvN(x.pReel, 1), csvN(x.dPerte, 1),
                csvN(x.evQte), csvN(x.evPrix), csvN(x.evTot), TX_CAUSE[x.dom]].join(";")));
              telecharger(`ecart-matiere_${projet.nom.replace(/\s+/g, "-")}.csv`, L.join("\n"));
            }}>Exporter</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 460px", gap: 14, alignItems: "start" }}>
            <div className="card">
              <div className="card-h">
                <h3>Écart matière expliqué</h3>
                <span className="hint">choisir une ligne pour l'expliquer</span>
              </div>
              <p className="hint" style={{ padding: "10px 14px 0", margin: 0 }}>
                Chaque ligne remonte de la quantité nette du métré à la quantité réellement consommée. Les causes se cumulent et bouclent exactement.
              </p>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr><th>Article</th><th className="r">Net</th><th className="r">Chiffré</th><th className="r">Consommé</th>
                      <th className="r">Théo. %</th><th className="r">Réel %</th><th className="r">Δ pts</th><th className="r">Écart total</th></tr>
                  </thead>
                  <tbody>
                    {ecSorted.map((x) => {
                      const actif = E && x.art.id === E.art.id;
                      const alerte = Math.abs(x.dPerte) > (params.seuilAlerte || 5);
                      return (
                        <tr key={x.art.id} onClick={() => setSelArt(x.art.id)} style={{
                          cursor: "pointer",
                          background: actif ? "var(--acier-l)" : undefined,
                          borderLeft: `2px solid ${actif ? "var(--acier)" : "transparent"}`,
                        }}>
                          <td>
                            <div style={{ fontWeight: actif ? 600 : 400 }}>{x.art.des}</div>
                            <div className="hint mono">{x.art.famille} · {TX_CAUSE[x.dom]}</div>
                          </td>
                          <td className="num hint">{nf(x.nette, 1)}</td>
                          <td className="num hint">{nf(x.theo, 1)}</td>
                          <td className="num" style={{ fontWeight: 500 }}>{nf(x.cons, 1)}{x.releve ? "" : <span className="hint"> *</span>}</td>
                          <td className="num hint">{nf(x.pTheo, 1)} %</td>
                          <td className="num">{nf(x.pReel, 1)} %</td>
                          <td className={`num ${alerte ? (x.dPerte > 0 ? "neg" : "pos") : "hint"}`} style={{ fontWeight: 600 }}>
                            {x.dPerte >= 0 ? "+" : ""}{nf(x.dPerte, 1)}
                          </td>
                          <td className={`num ${x.evTot > 0 ? "neg" : "pos"}`}>{x.evTot >= 0 ? "+" : ""}{eur(x.evTot, 0)}</td>
                        </tr>
                      );
                    })}
                    {ecSorted.length === 0 && <tr><td colSpan={8} className="empty">Aucun ouvrage dans cette variante.</td></tr>}
                  </tbody>
                </table>
              </div>
              <p className="hint" style={{ padding: "10px 14px", margin: 0 }}>
                Δ pts = perte réelle − perte chiffrée. Les lignes marquées d'un astérisque n'ont pas de relevé de consommation :
                la quantité consommée retenue est alors la somme des causes, et le résidu est nul.
              </p>
            </div>

            {E && (
              <div className="card">
                <div className="card-h" style={{ display: "block" }}>
                  <span className="eyebrow">Pourquoi la perte réelle dépasse le chiffrage</span>
                  <h3 style={{ fontSize: 16, marginTop: 4 }}>{E.art.des}</h3>
                  <p className="hint mono" style={{ margin: "2px 0 0" }}>{E.art.famille} · {E.art.marque}</p>
                  <div className="row" style={{ gap: 22, marginTop: 12, alignItems: "flex-end" }}>
                    <div><span className="eyebrow">Perte chiffrée</span>
                      <b className="mono" style={{ display: "block", fontSize: 21, fontWeight: 500, color: "var(--ink2)" }}>{nf(E.pTheo, 1)} %</b></div>
                    <div><span className="eyebrow">Perte réelle</span>
                      <b className="mono" style={{ display: "block", fontSize: 21, fontWeight: 500, color: "var(--acier)" }}>{nf(E.pReel, 1)} %</b></div>
                    <div style={{ marginLeft: "auto", textAlign: "right" }}><span className="eyebrow">Écart</span>
                      <b className="mono" style={{
                        display: "block", fontSize: 21, fontWeight: 600,
                        color: E.dPerte > (params.seuilAlerte || 5) ? "var(--rouge)" : E.dPerte < 0 ? "var(--acier)" : "var(--ink)",
                      }}>{E.dPerte >= 0 ? "+" : ""}{nf(E.dPerte, 1)} pts</b></div>
                  </div>
                </div>

                <div style={{ padding: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 92px 58px", gap: 10 }} className="eyebrow">
                    <div>Cause</div><div style={{ textAlign: "right" }}>Quantité</div><div style={{ textAlign: "right" }}>Part du net</div>
                  </div>
                  {(() => {
                    const u = " " + E.art.unite;
                    const wf = [
                      { k: "nette", lab: "Quantité nette (métré)", note: "mesuré · longueur × hauteur, sans aucune chute", v: E.nette, base: true },
                      { k: "coupe", lab: TX_CAUSE.coupe, note: "calculé · géométrie de la coupe", v: E.coupe },
                      { k: "condit", lab: TX_CAUSE.condit, note: `calculé · ${nomLot(E.art)} de ${nf(E.pcl, 2)}${u}`, v: E.condit },
                      { k: "casse", lab: TX_CAUSE.casse, note: `saisi · ${nf(E.tCasse, 2)} % du net`, v: E.casse },
                      { k: "reprise", lab: TX_CAUSE.reprise, note: `saisi · ${nf(E.tReprise, 2)} % du net`, v: E.reprise },
                      { k: "residu", lab: TX_CAUSE.residu, note: "solde", v: E.residu },
                    ];
                    const mx = Math.max(...wf.map((r) => Math.abs(r.v)), 0.0001);
                    return wf.map((r) => (
                      <div key={r.k} style={{ padding: "9px 0 8px", borderBottom: "1px solid var(--line2)" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 92px 58px", gap: 10, alignItems: "baseline" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: r.base ? 500 : 400 }}>
                              <span className="hint mono">{r.base ? "" : r.v >= 0 ? "+" : "−"}</span> {r.lab}
                            </div>
                            <div className="hint mono" style={{ marginTop: 2 }}>{r.note}</div>
                          </div>
                          <div className="num" style={{ fontWeight: r.base ? 500 : 400 }}>
                            {r.base || r.v >= 0 ? "" : "−"}{nf(Math.abs(r.v), 1)}{u}
                          </div>
                          <div className="num hint">{r.base ? "100,0 %" : nf(Math.abs(r.v / Math.max(E.nette, 1e-9)) * 100, 1) + " %"}</div>
                        </div>
                        <div className="bar" style={{ marginTop: 6 }}>
                          <i style={{
                            width: `${Math.max(1.5, Math.round((Math.abs(r.v) / mx) * 100))}%`,
                            background: r.base ? "var(--ink3)" : r.k === "residu" ? "var(--line)" : r.v >= 0 ? "var(--rouge)" : "var(--acier)",
                          }} />
                        </div>
                      </div>
                    ));
                  })()}

                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 92px 58px", gap: 10, alignItems: "baseline", padding: "11px 0 0", borderTop: "1px solid var(--acier)", marginTop: 2 }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>= Quantité consommée</div>
                      <div className="hint mono" style={{ marginTop: 2 }}>
                        {E.releve ? `relevé de chantier · ${nf(E.colisSaisis, 0)} ${pluriel(nomLot(E.art), E.colisSaisis)}` : "non relevée · somme des causes"}
                      </div>
                    </div>
                    <div className="num" style={{ fontWeight: 600, color: "var(--acier)" }}>{nf(E.cons, 1)} {E.art.unite}</div>
                    <div className="num hint">{nf(E.nette > 0 ? (E.cons / E.nette) * 100 : 0, 1)} %</div>
                  </div>

                  <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginTop: 12, padding: "9px 12px", background: "var(--panel2)", borderRadius: 3 }}>
                    <div>
                      <div style={{ fontSize: 12.5, color: "var(--ink2)" }}>Quantité chiffrée</div>
                      <div className="hint mono">provision de perte de {nf(E.pTheo, 1)} % appliquée au devis</div>
                    </div>
                    <div className="num">{nf(E.theo, 1)} {E.art.unite}</div>
                  </div>

                  <div className="sep" />
                  <div className="eyebrow">Casse et reprises de cet article</div>
                  <div className="row" style={{ gap: 10, marginTop: 6, alignItems: "flex-end" }}>
                    <label className="fld" style={{ width: 104 }}><span>Casse %</span>
                      <Num className={ecartHerite(projet, E.art.id, "casse") ? "inherit" : ""} value={E.tCasse}
                        onChange={(v) => patchP({ ecartArt: { ...(projet.ecartArt || {}), [E.art.id]: { ...((projet.ecartArt || {})[E.art.id] || {}), casse: v } } })} /></label>
                    <label className="fld" style={{ width: 104 }}><span>Reprises %</span>
                      <Num className={ecartHerite(projet, E.art.id, "reprise") ? "inherit" : ""} value={E.tReprise}
                        onChange={(v) => patchP({ ecartArt: { ...(projet.ecartArt || {}), [E.art.id]: { ...((projet.ecartArt || {})[E.art.id] || {}), reprise: v } } })} /></label>
                    {(!ecartHerite(projet, E.art.id, "casse") || !ecartHerite(projet, E.art.id, "reprise")) && (
                      <button className="btn sm" style={{ marginBottom: 1 }} title="Revenir aux taux du projet"
                        onClick={() => {
                          const m = { ...(projet.ecartArt || {}) };
                          delete m[E.art.id];
                          patchP({ ecartArt: m });
                        }}>↺ Taux du projet</button>
                    )}
                  </div>

                  <div className="sep" />
                  <div className="eyebrow">Géométrie de la coupe</div>
                  <div className="kpis" style={{ marginTop: 8 }}>
                    <div className="kpi"><span className="eyebrow">Hauteur à couvrir</span><b style={{ fontSize: 15 }}>{nf(E.Hmoy, 2)} m</b></div>
                    <div className="kpi"><span className="eyebrow">Longueur commerciale</span><b style={{ fontSize: 15 }}>{E.Lc ? nf(E.Lc, 2) + " m" : "—"}</b></div>
                    <div className="kpi"><span className="eyebrow">Chute géométrique</span><b style={{ fontSize: 15, color: "var(--acier)" }}>{nf(E.fracCoupePc, 1)} %</b></div>
                  </div>
                  <p style={{ margin: "10px 0 0", fontSize: 12.5, lineHeight: 1.55, color: "var(--ink2)" }}>
                    {(() => {
                      const L = E.art.long || 0, W = E.art.larg || 0, k = L > 0 ? Math.ceil(E.Hmoy / L) : 0;
                      const chute = L > 0 ? k * L - E.Hmoy : 0;
                      if (E.modeCoupe === "surface" && L) return TX_GEO_SURFACE
                        .replace("{l}", nf(L, 2)).replace("{w}", nf(W, 2)).replace("{h}", nf(E.Hmoy, 2))
                        .replace("{k}", nf(k, 0)).replace("{c}", nf(chute, 2));
                      if (E.modeCoupe === "hauteur" && L) return TX_GEO_HAUTEUR
                        .replace("{l}", nf(L, 2)).replace("{h}", nf(E.Hmoy, 2)).replace("{c}", nf(chute, 2));
                      if (E.modeCoupe === "longueur" && L) return TX_GEO_LONGUEUR.replace("{l}", nf(L, 2));
                      return TX_GEO_NONE;
                    })()}
                  </p>

                  <div className="sep" />
                  <div className="eyebrow">Impact en valeur</div>
                  <p className="hint" style={{ margin: "6px 0 10px" }}>
                    Ce que l'écart coûte, ou rapporte, par rapport au devis.
                    Un montant <span className="neg">en rouge</span> est un surcoût, un montant <span className="pos">en bleu</span> une économie.
                  </p>

                  <div style={{ padding: "8px 0", borderBottom: "1px solid var(--line2)" }}>
                    <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
                      <div style={{ fontSize: 13 }}>Écart sur quantité</div>
                      <div className={`num ${E.evQte > 0 ? "neg" : "pos"}`} style={{ fontWeight: 500 }}>{E.evQte >= 0 ? "+" : "−"}{eur(Math.abs(E.evQte), 0)}</div>
                    </div>
                    <div className="hint mono" style={{ marginTop: 2 }}>
                      ({nf(E.cons, 1)} consommé − {nf(E.theo, 1)} chiffré) × {eur(E.pRef, 3)} / {E.art.unite}
                      {" = "}{E.cons - E.theo >= 0 ? "+" : "−"}{nf(Math.abs(E.cons - E.theo), 1)} {E.art.unite}
                    </div>
                    <div className="hint" style={{ marginTop: 3 }}>
                      {E.evQte > 0
                        ? `Il a fallu ${nf(E.cons - E.theo, 1)} ${E.art.unite} de plus que prévu au devis.`
                        : E.evQte < 0
                          ? `Il a fallu ${nf(E.theo - E.cons, 1)} ${E.art.unite} de moins que prévu au devis.`
                          : "La consommation tombe exactement sur la quantité chiffrée."}
                    </div>
                  </div>

                  <div style={{ padding: "8px 0", borderBottom: "1px solid var(--line2)" }}>
                    <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
                      <div style={{ fontSize: 13 }}>Écart sur prix</div>
                      <div className={`num ${E.evPrix > 0 ? "neg" : E.evPrix < 0 ? "pos" : "hint"}`} style={{ fontWeight: 500 }}>
                        {E.pFact === E.pRef ? "—" : `${E.evPrix >= 0 ? "+" : "−"}${eur(Math.abs(E.evPrix), 0)}`}
                      </div>
                    </div>
                    <div className="hint mono" style={{ marginTop: 2 }}>
                      {E.pFact === E.pRef
                        ? `prix de référence ${eur(E.pRef, 3)} / ${E.art.unite}`
                        : `${nf(E.cons, 1)} × (${eur(E.pFact, 3)} facturé − ${eur(E.pRef, 3)} de référence)`}
                    </div>
                    <div className="hint" style={{ marginTop: 3 }}>
                      {E.pFact === E.pRef
                        ? "Aucun prix facturé saisi pour cet article : l'écart de prix ne peut pas être calculé. Il se renseigne dans Commandes, colonne « P.U. facturé »."
                        : E.evPrix > 0
                          ? "Le fournisseur a facturé plus cher que le prix retenu au chiffrage."
                          : "Le fournisseur a facturé moins cher que le prix retenu au chiffrage."}
                    </div>
                  </div>

                  <div style={{ padding: "10px 0 0" }}>
                    <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>Écart total sur cet article</div>
                      <div className={`num ${E.evTot > 0 ? "neg" : "pos"}`} style={{ fontSize: 16, fontWeight: 600 }}>
                        {E.evTot >= 0 ? "+" : "−"}{eur(Math.abs(E.evTot), 0)}
                      </div>
                    </div>
                    <div className="hint" style={{ marginTop: 4 }}>
                      {E.evTot > 0
                        ? `Cet article a coûté ${eur(E.evTot, 0)} de plus que ce qui a été chiffré au devis.`
                        : E.evTot < 0
                          ? `Cet article a coûté ${eur(Math.abs(E.evTot), 0)} de moins que ce qui a été chiffré au devis : c'est une marge gagnée.`
                          : "Cet article tombe exactement sur le chiffrage."}
                    </div>
                  </div>

                  <div className="sep" />
                  <div className="eyebrow">Lecture</div>
                  <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.6 }}>
                    {E.dPerte < 0 ? TX_GAIN
                      : (TX_LECTURE[E.dom] || "").replace("{v}", nf(E.domPc, 1)).replace("{p}", nf(E.pTheo, 1)).replace("{c}", E.art.colis)}
                  </p>
                  {E.dPerte > (params.seuilAlerte || 5) && (
                    <button className="btn sm" style={{ marginTop: 12 }} onClick={() => {
                      const t = Math.round(E.pReel * 10) / 10;
                      if (!confirm(`Porter une perte de ${nf(t, 1)} % sur les lignes de nomenclature utilisant « ${E.art.des} » ?\n\nCe taux devient une dérogation propre à cet article.`)) return;
                      setSystemes((ss) => ss.map((sys) => ({
                        ...sys, lignes: sys.lignes.map((l) => (l.art === E.art.id ? { ...l, perte: Math.max(0, t) } : l)),
                      })));
                    }}>↥ Caler la provision sur la perte réelle</button>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {vue === "suivi" && (
        <>
          <div className="kpis" style={{ marginBottom: 14 }}>
            <div className="kpi"><span className="eyebrow">Budget matière</span><b>{eur(totSuivi.budget)}</b></div>
            <div className="kpi"><span className="eyebrow">Commandé</span><b>{eur(totSuivi.commande)}</b></div>
            <div className="kpi"><span className="eyebrow">Facturé</span><b>{eur(totSuivi.reel)}</b></div>
            <div className="kpi"><span className="eyebrow">Écart sur facturé</span>
              <b className={totSuivi.ecart > 0 ? "neg" : "pos"}>{totSuivi.ecart > 0 ? "+" : ""}{eur(totSuivi.ecart)}</b></div>
          </div>
          <div className="card">
            <div className="card-h">
              <h3>Commandé, livré, consommé</h3>
              <span className="hint">saisis le consommé relevé sur le chantier</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead><tr><th>Article</th><th className="r">Besoin</th><th className="r">Commandé</th>
                  <th className="r">Livré</th><th className="r">Reliquat</th><th className="r">Consommé</th>
                  <th className="r">Reste à commander</th><th className="r">Perte constatée</th><th /></tr></thead>
                <tbody>
                  {suivi.filter((s) => s.qte > 0).map((s) => (
                    <tr key={s.art.id}>
                      <td>{s.art.des}</td>
                      <td className="num">{nf(s.qte, 1)} <span className="hint">{s.art.unite}</span></td>
                      <td className="num">{nf(s.commande, 1)}</td>
                      <td className="num">{nf(s.livre, 1)}</td>
                      <td className={`num ${s.reliquat > 0 ? "hint" : ""}`}>{nf(s.reliquat, 1)}</td>
                      <td style={{ width: 92 }}>
                        <Num className="bare" value={(projet.conso || {})[s.art.id] || 0}
                          onChange={(v) => patchP({ conso: { ...(projet.conso || {}), [s.art.id]: v } })} />
                      </td>
                      <td className={`num ${s.resteACommander > 0 ? "neg" : "pos"}`}>{nf(s.resteACommander, 1)}</td>
                      <td className="num">
                        {s.perteReelle === null ? <span className="hint">—</span>
                          : <span className={s.perteReelle > 12 ? "neg" : "pos"}>{nf(s.perteReelle, 1)} %</span>}
                      </td>
                      <td className="r">
                        {s.perteReelle !== null && (
                          <button className="btn sm" title="Reporter ce taux dans les nomenclatures" onClick={() => appliquerPerte(s)}>↥ biblio</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {suivi.length === 0 && <tr><td colSpan={9} className="empty">Aucun besoin calculé pour cette variante.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="hint" style={{ padding: "10px 14px", margin: 0 }}>
              La perte constatée compare le consommé réel à la quantité nette théorique, hors chutes prévues. Le bouton « ↥ biblio » reporte ce taux
              dans toutes les nomenclatures utilisant l'article : c'est ce retour qui fiabilise les chiffrages suivants.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
