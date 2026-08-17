import React, { useRef } from "react";
import { eur, nf, telecharger, today, uid } from "../domaine/format.js";
import { ENTREPRISE_DEF, FAMILLES_ART, LOGO_ID, UNITES } from "../domaine/referentiel.js";
import { coefEntreprise, tauxMO } from "../domaine/moteur.js";
import { poidsPhotos } from "../domaine/photos.js";
import { Num, TauxMarge, ZonePhoto } from "./base.jsx";
import { Articles } from "./Articles.jsx";


/* ================================================================== */
/*  10. Paramètres                                                     */
/* ================================================================== */

export function Parametres({ params, setParams, marques, setMarques, fournisseurs, setFournisseurs, articles, setArticles, data, photos, setPhoto, importer, reset }) {
  const jsonRef = useRef(null), csvRef = useRef(null);
  const E = { ...ENTREPRISE_DEF, ...(params.entreprise || {}) };
  const setE = (v) => setParams({ ...params, entreprise: { ...E, ...v } });
  const K = coefEntreprise(params);
  const exemple = 1000 * K;
  const marqueReelle = ((exemple - 1000) / exemple) * 100;

  const importCSV = (txt) => {
    const rows = txt.split(/\r?\n/).filter((l) => l.trim());
    if (rows.length < 2) { alert("Fichier vide ou sans ligne de données."); return; }
    const sep = rows[0].includes(";") ? ";" : ",";
    const head = rows[0].split(sep).map((h) => h.trim().toLowerCase());
    const col = (n) => head.findIndex((h) => h.startsWith(n));
    const iDes = col("des"), iMar = col("marq"), iFam = col("fam"), iUni = col("unit"),
      iPrix = col("prix"), iCol = col("colis"), iPar = col("qte"), iPoids = col("poids"), iFou = col("fourn"),
      iLong = col("long"), iLarg = col("larg"), iRef = col("code");
    if (iDes < 0 || iPrix < 0) { alert("Colonnes attendues : designation ; marque ; famille ; unite ; prix ; colisage ; qte_par_colis ; poids ; fournisseur"); return; }
    let maj = 0;
    const nouveaux = [];
    rows.slice(1).forEach((r) => {
      const c = r.split(sep);
      const g = (i, d = "") => (i >= 0 && c[i] !== undefined ? c[i].trim() : d);
      const des = g(iDes); if (!des) return;
      const prix = parseFloat(g(iPrix, "0").replace(",", ".")) || 0;
      const fournisseur = g(iFou, "");
      const exist = articles.find((a) => a.des.toLowerCase() === des.toLowerCase());
      if (exist) {
        maj++;
        setArticles((as) => as.map((a) => {
          if (a.id !== exist.id) return a;
          const fs = [...(a.fournisseurs || [])];
          if (fournisseur) {
            const i = fs.findIndex((x) => x.nom === fournisseur);
            if (i >= 0) fs[i] = { ...fs[i], prix, maj: today() };
            else fs.push({ id: uid(), nom: fournisseur, ref: g(iRef, ""), libelle: "", prix, maj: today() });
          }
          const histo = [...(a.histo || [])];
          if (!fournisseur && (!histo.length || histo[histo.length - 1].prix !== prix)) histo.push({ date: today(), prix });
          return { ...a, prix: fournisseur ? a.prix : prix, fournisseurs: fs, histo: histo.slice(-20) };
        }));
      } else {
        nouveaux.push({
          id: uid(), des, marque: g(iMar, "Interne"),
          famille: FAMILLES_ART.includes(g(iFam)) ? g(iFam) : "Accessoire",
          unite: UNITES.includes(g(iUni)) ? g(iUni) : "u",
          prix, colis: g(iCol, "unité"), parColis: parseFloat(g(iPar, "1").replace(",", ".")) || 1,
          poids: parseFloat(g(iPoids, "0").replace(",", ".")) || 0.3, parPalette: 24, marge: null,
          long: parseFloat(g(iLong, "0").replace(",", ".")) || 0,
          larg: parseFloat(g(iLarg, "0").replace(",", ".")) || 0,
          coupe: "aucune", paletteEntiere: false,
          fournisseurs: fournisseur ? [{ id: uid(), nom: fournisseur, ref: g(iRef, ""), libelle: "", prix, maj: today() }] : [],
          histo: [{ date: today(), prix }],
        });
      }
    });
    if (nouveaux.length) setArticles((as) => [...nouveaux, ...as]);
    const nvFourn = Array.from(new Set([...nouveaux.map((n) => n.fournisseurs[0]?.nom)].filter(Boolean)))
      .filter((f) => !fournisseurs.some((x) => x.nom === f));
    if (nvFourn.length) setFournisseurs((fs) => [...fs, ...nvFourn.map((nom) => ({ id: uid(), nom }))]);
    alert(`${nouveaux.length} article(s) créé(s), ${maj} prix mis à jour.`);
  };

  const usageMarque = (nom) => articles.filter((a) => a.marque === nom).length;

  return (
    <div className="pad" style={{ maxWidth: 860 }}>
      <div className="card">
        <div className="card-h"><h3>Identité de l'entreprise</h3>
          <span className="hint">reprise en tête de tous les documents émis</span></div>
        <div style={{ padding: 14 }}>
          <div className="row" style={{ gap: 16, alignItems: "flex-start" }}>
            <div style={{ width: 190, flex: "none" }}>
              <span className="eyebrow">Logo</span>
              <div style={{ marginTop: 4 }}>
                <ZonePhoto src={photos[LOGO_ID] || null} onChange={(v) => setPhoto(LOGO_ID, v)} hauteur={104} />
              </div>
            </div>
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10 }}>
              <label className="fld" style={{ gridColumn: "span 2" }}><span>Raison sociale</span>
                <input value={E.nom} onChange={(e) => setE({ nom: e.target.value })} /></label>
              <label className="fld"><span>Forme juridique</span>
                <input value={E.forme} placeholder="SARL, SAS…" onChange={(e) => setE({ forme: e.target.value })} /></label>
              <label className="fld"><span>Capital social</span>
                <input value={E.capital} placeholder="30 000 €" onChange={(e) => setE({ capital: e.target.value })} /></label>
              <label className="fld" style={{ gridColumn: "span 2" }}><span>Adresse</span>
                <input value={E.adresse} onChange={(e) => setE({ adresse: e.target.value })} /></label>
              <label className="fld"><span>Code postal</span>
                <input value={E.cp} onChange={(e) => setE({ cp: e.target.value })} /></label>
              <label className="fld"><span>Ville</span>
                <input value={E.ville} onChange={(e) => setE({ ville: e.target.value })} /></label>
              <label className="fld"><span>Téléphone</span>
                <input value={E.tel} onChange={(e) => setE({ tel: e.target.value })} /></label>
              <label className="fld"><span>Courriel</span>
                <input value={E.email} onChange={(e) => setE({ email: e.target.value })} /></label>
              <label className="fld"><span>Site</span>
                <input value={E.site} onChange={(e) => setE({ site: e.target.value })} /></label>
              <label className="fld"><span>SIRET</span>
                <input className="mono" value={E.siret} onChange={(e) => setE({ siret: e.target.value })} /></label>
              <label className="fld"><span>RCS</span>
                <input value={E.rcs} onChange={(e) => setE({ rcs: e.target.value })} /></label>
              <label className="fld"><span>TVA intracommunautaire</span>
                <input className="mono" value={E.tvaIntra} onChange={(e) => setE({ tvaIntra: e.target.value })} /></label>
              <label className="fld"><span>Code APE</span>
                <input className="mono" value={E.ape} onChange={(e) => setE({ ape: e.target.value })} /></label>
              <label className="fld"><span>Qualibat</span>
                <input value={E.qualibat} placeholder="4131" onChange={(e) => setE({ qualibat: e.target.value })} /></label>
              <label className="fld"><span>Assureur décennale</span>
                <input value={E.assureur} onChange={(e) => setE({ assureur: e.target.value })} /></label>
              <label className="fld"><span>N° de police</span>
                <input className="mono" value={E.police} onChange={(e) => setE({ police: e.target.value })} /></label>
              <label className="fld"><span>Banque</span>
                <input value={E.banque} onChange={(e) => setE({ banque: e.target.value })} /></label>
              <label className="fld" style={{ gridColumn: "span 2" }}><span>IBAN</span>
                <input className="mono" value={E.iban} onChange={(e) => setE({ iban: e.target.value })} /></label>
              <label className="fld"><span>BIC</span>
                <input className="mono" value={E.bic} onChange={(e) => setE({ bic: e.target.value })} /></label>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            <label className="fld"><span>Conditions générales de vente</span>
              <textarea rows={4} value={E.cgv} onChange={(e) => setE({ cgv: e.target.value })} /></label>
            <div style={{ display: "grid", gap: 10 }}>
              <label className="fld"><span>Conditions de paiement</span>
                <textarea rows={2} value={E.paiement} onChange={(e) => setE({ paiement: e.target.value })} /></label>
              <label className="fld"><span>Pénalités de retard</span>
                <textarea rows={2} value={E.penalites} onChange={(e) => setE({ penalites: e.target.value })} /></label>
            </div>
          </div>
          <label className="fld" style={{ marginTop: 10 }}><span>Médiateur de la consommation</span>
            <input value={E.mediateur} placeholder="obligatoire pour les marchés avec des particuliers" onChange={(e) => setE({ mediateur: e.target.value })} /></label>
          {(!E.nom || !E.siret) && (
            <p className="hint" style={{ margin: "10px 0 0" }}>
              Raison sociale et SIRET sont obligatoires sur un devis. L'assurance décennale et son assureur le sont aussi pour les travaux de bâtiment.
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-h"><h3>Politique de prix</h3></div>
        <div style={{ padding: 14 }}>
          <div className="row" style={{ gap: 12, alignItems: "flex-end" }}>
            <label className="fld" style={{ width: 250 }}><span>Frais généraux et bénéfice exprimés en</span>
              <select value={params.modeCoef} onChange={(e) => setParams({ ...params, modeCoef: e.target.value })}>
                <option value="ca">% du prix de vente (taux de marque)</option>
                <option value="deb">% du déboursé (taux de marge)</option>
              </select></label>
            {params.modeCoef === "ca" && (
              <label className="fld" style={{ width: 230 }}><span>Application</span>
                <select value={params.cumul} onChange={(e) => setParams({ ...params, cumul: e.target.value })}>
                  <option value="cumule">Dénominateur cumulé — 1 / (1 − FG − B)</option>
                  <option value="cascade">En cascade — 1 / (1 − FG) / (1 − B)</option>
                </select></label>
            )}
            <label className="fld" style={{ width: 110 }}><span>Frais généraux %</span>
              <Num value={params.fg} onChange={(v) => setParams({ ...params, fg: v })} /></label>
            <label className="fld" style={{ width: 130 }}><span>Bénéfice et aléas %</span>
              <Num value={params.benef} onChange={(v) => setParams({ ...params, benef: v })} /></label>
          </div>
          <div className="kpis" style={{ marginTop: 14 }}>
            <div className="kpi"><span className="eyebrow">Coefficient</span><b>{nf(K, 4)}</b></div>
            <div className="kpi"><span className="eyebrow">1 000 € de déboursé</span><b>{eur(exemple)}</b></div>
            <div className="kpi"><span className="eyebrow">Marge dégagée</span><b>{eur(exemple - 1000)}</b></div>
            <div className="kpi"><span className="eyebrow">Taux de marque réel</span><b>{nf(marqueReelle, 1)} %</b></div>
          </div>
          <p className="hint" style={{ marginBottom: 0 }}>
            En mode « % du prix de vente », 30 % de marque donnent un coefficient de 1,4286 : le déboursé est divisé par 0,70.
            En mode « % du déboursé », les mêmes 30 % ne dégagent que 23,1 % du chiffre d'affaires.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-h"><h3>Marge sur fournitures</h3></div>
        <div style={{ padding: 14 }}>
          <label className="fld" style={{ width: 320 }}><span>Origine de la marge sur fournitures</span>
            <select value={params.margeSource} onChange={(e) => setParams({ ...params, margeSource: e.target.value })}>
              <option value="globale">Coefficient d'entreprise appliqué au déboursé total</option>
              <option value="article">Taux propre à chaque article</option>
            </select></label>
          {params.margeSource === "article" && (
            <div className="row" style={{ gap: 20, marginTop: 12 }}>
              <div><span className="eyebrow">Taux par défaut des articles</span>
                <div style={{ marginTop: 4 }}>
                  <TauxMarge valeur={params.margeArtDefaut} onChange={(v) => setParams({ ...params, margeArtDefaut: v })} />
                </div></div>
              <div><span className="eyebrow">Taux sur la main d'œuvre</span>
                <div style={{ marginTop: 4 }}>
                  <TauxMarge valeur={params.margeMO} onChange={(v) => setParams({ ...params, margeMO: v })} />
                </div></div>
            </div>
          )}
          <p className="hint" style={{ marginBottom: 0, marginTop: 12 }}>
            En mode « taux par article », chaque article porte sa propre marge — modifiable dans l'onglet Articles — et le coefficient
            d'entreprise ne s'applique plus qu'au matériel, aux déchets et aux frais de chantier.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-h"><h3>Main d'œuvre</h3>
          <button className="btn sm" onClick={() => setParams({
            ...params, qualifs: [...params.qualifs, { id: uid(), nom: "Nouvelle qualification", taux: 35 }],
          })}>+ Qualification</button>
        </div>
        <table>
          <thead><tr><th>Qualification</th><th className="r">Taux horaire €/h</th><th className="r">Répartition par défaut %</th><th /></tr></thead>
          <tbody>
            {params.qualifs.map((q) => (
              <tr key={q.id}>
                <td><input className="bare" value={q.nom} onChange={(e) => setParams({
                  ...params, qualifs: params.qualifs.map((x) => x.id === q.id ? { ...x, nom: e.target.value } : x),
                })} /></td>
                <td style={{ width: 110 }}><Num className="bare" value={q.taux} onChange={(v) => setParams({
                  ...params, qualifs: params.qualifs.map((x) => x.id === q.id ? { ...x, taux: v } : x),
                })} /></td>
                <td style={{ width: 110 }}><Num className="bare" value={params.repartDefaut[q.id] || 0} onChange={(v) => setParams({
                  ...params, repartDefaut: { ...params.repartDefaut, [q.id]: v },
                })} /></td>
                <td className="r"><button className="btn sm danger" onClick={() => setParams({
                  ...params, qualifs: params.qualifs.filter((x) => x.id !== q.id),
                })} aria-label="Supprimer">×</button></td>
              </tr>
            ))}
            <tr className="tot-row">
              <td>Taux moyen pondéré</td>
              <td className="num">{nf(tauxMO(null, params))} €/h</td>
              <td className="num">{nf(Object.values(params.repartDefaut).reduce((a, b) => a + (b || 0), 0), 0)} %</td>
              <td />
            </tr>
          </tbody>
        </table>
        <p className="hint" style={{ padding: "10px 14px", margin: 0 }}>
          La répartition peut être ajustée système par système dans la fiche de chaque ouvrage. Un plafond mobilise plus de compagnons qualifiés qu'un doublage collé.
        </p>
      </div>

      <div className="card">
        <div className="card-h"><h3>Chantier</h3></div>
        <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          <label className="fld"><span>Évacuation déchets € / tonne</span>
            <Num value={params.prixBenne} onChange={(v) => setParams({ ...params, prixBenne: v })} /></label>
          <label className="fld"><span>Seuil d'alerte facture %</span>
            <Num value={params.seuilAlerte} onChange={(v) => setParams({ ...params, seuilAlerte: v })} /></label>
        </div>
      </div>

      <div className="card">
        <div className="card-h"><h3>Marques</h3>
          <button className="btn sm pri" onClick={() => {
            const nom = prompt("Nom de la marque ?");
            if (nom && nom.trim() && !marques.some((m) => m.nom === nom.trim())) setMarques((ms) => [...ms, { id: uid(), nom: nom.trim() }]);
          }}>+ Marque</button>
        </div>
        <table>
          <thead><tr><th>Nom</th><th className="r">Articles</th><th /></tr></thead>
          <tbody>
            {marques.map((m) => (
              <tr key={m.id}>
                <td><input className="bare" value={m.nom} onChange={(e) => {
                  const ancien = m.nom, nouveau = e.target.value;
                  setMarques((ms) => ms.map((x) => (x.id === m.id ? { ...x, nom: nouveau } : x)));
                  setArticles((as) => as.map((a) => (a.marque === ancien ? { ...a, marque: nouveau } : a)));
                }} /></td>
                <td className="num hint">{usageMarque(m.nom)}</td>
                <td className="r"><button className="btn sm danger" onClick={() => {
                  if (usageMarque(m.nom) > 0 && !confirm(`${usageMarque(m.nom)} article(s) utilisent « ${m.nom} ». Les basculer sur « Interne » ?`)) return;
                  setArticles((as) => as.map((a) => (a.marque === m.nom ? { ...a, marque: "Interne" } : a)));
                  setMarques((ms) => ms.filter((x) => x.id !== m.id));
                }}>Supprimer</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-h"><h3>Fournisseurs</h3>
          <button className="btn sm pri" onClick={() => {
            const nom = prompt("Nom du fournisseur ?");
            if (nom && nom.trim() && !fournisseurs.some((f) => f.nom === nom.trim())) setFournisseurs((fs) => [...fs, { id: uid(), nom: nom.trim() }]);
          }}>+ Fournisseur</button>
        </div>
        <table>
          <thead><tr><th>Nom</th><th className="r">Prix référencés</th><th /></tr></thead>
          <tbody>
            {fournisseurs.map((f) => {
              const n = articles.filter((a) => (a.fournisseurs || []).some((x) => x.nom === f.nom)).length;
              return (
                <tr key={f.id}>
                  <td><input className="bare" value={f.nom} onChange={(e) => {
                    const ancien = f.nom, nouveau = e.target.value;
                    setFournisseurs((fs) => fs.map((x) => (x.id === f.id ? { ...x, nom: nouveau } : x)));
                    setArticles((as) => as.map((a) => ({ ...a, fournisseurs: (a.fournisseurs || []).map((x) => x.nom === ancien ? { ...x, nom: nouveau } : x) })));
                  }} /></td>
                  <td className="num hint">{n}</td>
                  <td className="r"><button className="btn sm danger" onClick={() => {
                    if (n > 0 && !confirm(`${n} article(s) référencent ce fournisseur. Retirer ces prix ?`)) return;
                    setArticles((as) => as.map((a) => ({ ...a, fournisseurs: (a.fournisseurs || []).filter((x) => x.nom !== f.nom) })));
                    setFournisseurs((fs) => fs.filter((x) => x.id !== f.id));
                  }}>Supprimer</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-h"><h3>Sauvegarde et import</h3></div>
        <div style={{ padding: 14 }}>
          <div className="row">
            <button className="btn" onClick={() => telecharger(`chiffrage-platrerie-${today()}.json`, JSON.stringify(data, null, 2), "application/json")}>
              Exporter la base (JSON)
            </button>
            <button className="btn" onClick={() => telecharger(`chiffrage-platrerie-complet-${today()}.json`,
              JSON.stringify({ ...data, photos }, null, 2), "application/json")}>
              Exporter avec les visuels ({nf(poidsPhotos(photos) / 1024 / 1024, 1)} Mo)
            </button>
            <button className="btn" onClick={() => jsonRef.current?.click()}>Importer une base (JSON)</button>
            <button className="btn" onClick={() => csvRef.current?.click()}>Importer un tarif (CSV)</button>
            <button className="btn danger" onClick={reset}>Réinitialiser</button>
          </div>
          <p className="hint" style={{ marginBottom: 0 }}>
            Format CSV, séparateur point-virgule : designation ; marque ; famille ; unite ; prix ; colisage ; qte_par_colis ; poids ; fournisseur.
            Si la désignation existe déjà, seul le prix est mis à jour — sous le fournisseur indiqué si la colonne est renseignée.
          </p>
          <input ref={jsonRef} type="file" accept="application/json" style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0]; if (!f) return;
              const r = new FileReader();
              r.onload = () => { try { importer(JSON.parse(String(r.result))); } catch { alert("Fichier illisible : vérifie qu'il s'agit d'un export JSON de cet outil."); } };
              r.readAsText(f); e.target.value = "";
            }} />
          <input ref={csvRef} type="file" accept=".csv,text/csv" style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0]; if (!f) return;
              const r = new FileReader(); r.onload = () => importCSV(String(r.result));
              r.readAsText(f, "utf-8"); e.target.value = "";
            }} />
        </div>
      </div>
    </div>
  );
}
