import React, { useState, useMemo, useRef } from "react";
import { eur, nf, uid } from "../domaine/format.js";
import { CAT_MAP, FAMILLES, FAMILLE_MAP, ENTRAXES } from "../domaine/referentiel.js";
import { hauteurMax } from "../domaine/systemes.js";
import { coutSysteme } from "../domaine/moteur.js";
import { facettesDe, colonnesDe, triParDefaut, filtrer, valeursDe, bornesDe } from "../domaine/facettes.js";
import { importerPhoto } from "../domaine/photos.js";
import { CatVisuel } from "./base.jsx";
import { SystemeDrawer } from "./SystemeDrawer.jsx";

/* Une valeur de facette : case cochable et compteur. Une valeur sans résultat
   est grisée mais reste affichée, sinon sa disparition est incompréhensible. */
function Valeur({ lab, n, actif, aide, onClick }) {
  return (
    <button className={`chip ${actif ? "on" : ""}`} onClick={onClick} disabled={!n && !actif}
      title={aide || ""} style={{ justifyContent: "space-between", width: "100%", opacity: !n && !actif ? 0.45 : 1 }}>
      <span style={{ textAlign: "left" }}>{lab}</span>
      <span className="mono hint">{n}</span>
    </button>
  );
}

function Facette({ f, base, sels, setSel, compteurs, ctx }) {
  const [ouvert, setOuvert] = useState(true);
  const sel = sels[f.id];

  if (f.type === "seuil" || f.type === "plage") {
    const [min, max] = bornesDe(f, base, ctx);
    if (max <= 0) return null;
    if (f.type === "seuil") {
      return (
        <div style={{ marginBottom: 14 }}>
          <div className="eyebrow">{f.lab}</div>
          <div className="row" style={{ gap: 8, marginTop: 5, flexWrap: "nowrap" }}>
            <input type="range" min={0} max={max} step={f.pas} value={sel || 0}
              onChange={(e) => setSel(f.id, parseFloat(e.target.value) || undefined)} style={{ flex: 1 }} />
            <span className="mono" style={{ width: 74, textAlign: "right" }}>
              {sel ? `${nf(sel, f.pas < 1 ? 2 : 0)} ${f.unite}` : "—"}
            </span>
          </div>
        </div>
      );
    }
    const b = sel || [min, max];
    return (
      <div style={{ marginBottom: 14 }}>
        <div className="eyebrow">{f.lab}</div>
        <div className="row" style={{ gap: 6, marginTop: 5, flexWrap: "nowrap" }}>
          <input type="range" min={min} max={max} step={f.pas} value={b[0]}
            onChange={(e) => setSel(f.id, [Math.min(parseFloat(e.target.value), b[1]), b[1]])} style={{ flex: 1 }} />
          <input type="range" min={min} max={max} step={f.pas} value={b[1]}
            onChange={(e) => setSel(f.id, [b[0], Math.max(parseFloat(e.target.value), b[0])])} style={{ flex: 1 }} />
        </div>
        <div className="hint mono" style={{ marginTop: 2 }}>{nf(b[0], 0)} – {nf(b[1], 0)} {f.unite}</div>
      </div>
    );
  }

  const valeurs = valeursDe(f, base, ctx);
  if (valeurs.length <= 1 && f.type !== "liste") return null;
  const c = compteurs[f.id] || {};
  const actifs = f.type === "liste" ? (sel ? [sel] : []) : (sel || []);

  return (
    <div style={{ marginBottom: 14 }}>
      <button className="crumb" onClick={() => setOuvert(!ouvert)} style={{ textDecoration: "none" }}>
        <span className="eyebrow">{f.lab}{actifs.length ? ` · ${actifs.length}` : ""}</span>
      </button>
      {ouvert && (
        <div className="chips" style={{ flexDirection: "column", alignItems: "stretch", gap: 3, marginTop: 5 }}>
          {valeurs.map((v) => (
            <Valeur key={v.id} lab={f.type === "paliers" ? v.lab : (f.fmt ? f.fmt(v.id) : v.lab)} n={c[v.id] || 0}
              actif={actifs.includes(v.id)} aide={f.aide ? f.aide(v.id) : ""}
              onClick={() => {
                if (f.type === "liste") setSel(f.id, sel === v.id ? undefined : v.id);
                else {
                  const a = actifs.includes(v.id) ? actifs.filter((x) => x !== v.id) : [...actifs, v.id];
                  setSel(f.id, a.length ? a : undefined);
                }
              }} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Bibliotheque({ systemes, setSystemes, articles, artMap, params, projets, setProjets, marques, addMarque, photos, setPhoto }) {
  const [famille, setFamille] = useState(null);
  const [sels, setSels] = useState({});
  const [entraxe, setEntraxe] = useState(0.6);
  const [q, setQ] = useState("");
  const [vue, setVue] = useState("tableau");
  const [tri, setTri] = useState(null);
  const [sens, setSens] = useState(-1);
  const [panneau, setPanneau] = useState(true);
  const [sel, setSel] = useState(null);
  const lotRef = useRef(null);

  const ctx = { artMap, params, entraxe };
  const compte = useMemo(() => {
    const c = {};
    systemes.forEach((s) => {
      const f = FAMILLES.find((x) => x.cats.includes(s.cat));
      if (f) c[f.id] = (c[f.id] || 0) + 1;
    });
    return c;
  }, [systemes]);

  const { base, resultats, compteurs, suggestion, facettes } = useMemo(
    () => (famille ? filtrer(systemes, famille, sels, ctx)
      : { base: [], resultats: [], compteurs: {}, suggestion: null, facettes: [] }),
    [systemes, famille, sels, artMap, params, entraxe]);

  const colonnes = famille ? colonnesDe(famille) : [];
  const triActif = tri || (famille ? triParDefaut(famille) : null);

  const listes = useMemo(() => {
    const t = q.trim().toLowerCase();
    const l = resultats.filter((s) => !t || s.nom.toLowerCase().includes(t) || (s.code || "").toLowerCase().includes(t));
    const col = colonnes.find((c) => c.id === triActif);
    if (col) l.sort((a, b) => {
      const va = col.val(a, ctx), vb = col.val(b, ctx);
      return typeof va === "string" ? sens * String(vb).localeCompare(String(va), "fr") : sens * (va - vb);
    });
    return l;
  }, [resultats, q, triActif, sens, colonnes, artMap, params, entraxe]);

  const patch = (id, p) => setSystemes((ss) => ss.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const selSys = systemes.find((s) => s.id === sel) || null;
  const setUn = (id, v) => setSels((x) => ({ ...x, [id]: v }));
  const nbFiltres = Object.values(sels).filter((v) => v !== undefined && v !== null && (!Array.isArray(v) || v.length)).length;

  /* Import en lot : le nom du fichier est rapproché du code puis du nom du système.
     cloison1.png ne désigne rien de précis, on le laisse à l'utilisateur. */
  const importerLot = async (files) => {
    const sansAccent = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
    let places = 0;
    const restants = [];
    for (const f of Array.from(files || [])) {
      const base = sansAccent(f.name.replace(/\.[^.]+$/, ""));
      const cible = systemes.find((x) => base === sansAccent(x.code))
        || systemes.find((x) => sansAccent(x.code) && base.includes(sansAccent(x.code)))
        || systemes.find((x) => base.includes(sansAccent(x.nom).slice(0, 14)));
      if (!cible) { restants.push(f.name); continue; }
      try { setPhoto(cible.id, await importerPhoto(f)); places++; } catch { restants.push(f.name); }
    }
    alert(`${places} visuel${places > 1 ? "s" : ""} rattaché${places > 1 ? "s" : ""}.` +
      (restants.length ? `\n\nNon rattachés, à déposer à la main dans la fiche du système :\n${restants.join("\n")}` : ""));
  };


  const creer = () => {
    const cat = FAMILLE_MAP[famille]?.cats[0] || "cd";
    const n = {
      id: uid(), code: "NOUV", nom: "Nouveau système", marque: "Interne", cat, type: "cloison",
      unite: "m²", ep: 98, dB: 0, feu: "—", hmax: 0, mo: 0.5, repart: null, verif: false,
      entraxe: 0.6, hsp: 2.5, materiel: 0.3, dechetsSup: 0.15, perteDef: 8,
      coupe: { pA: 1, pB: 1, oss: 48, isol: false }, notes: "", lignes: [], carac: { hauteurs: {} },
    };
    setSystemes((ss) => [n, ...ss]); setSel(n.id);
  };

  /* ── Accueil : une tuile par famille ── */
  if (!famille) {
    return (
      <div className="pad">
        <p className="hint" style={{ margin: "0 0 14px", maxWidth: "78ch" }}>
          Sélectionner une famille d'ouvrage. Les sous-catégories deviennent ensuite des filtres à l'intérieur
          de la famille : elles affinent la recherche, elles ne la cloisonnent pas.
        </p>
        <div className="tiles">
          {FAMILLES.map((f) => (
            <button key={f.id} className="tile" onClick={() => { setFamille(f.id); setSels({}); setTri(null); }}>
              <div className="tile-img"><CatVisuel cat={f.cats[0]} /></div>
              <div className="tile-b">
                <h4>{f.nom} <span className="tile-n">{compte[f.id] || 0}</span></h4>
                <p>{f.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ── Résultats de la famille ── */
  return (
    <div className="pad">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <div className="row">
          <button className="crumb" onClick={() => { setFamille(null); setSels({}); setQ(""); }}>← Toutes les familles</button>
          <span className="eyebrow">{FAMILLE_MAP[famille]?.nom}</span>
          <span className="mono hint">{listes.length} sur {base.length}</span>
        </div>
        <div className="row">
          <button className={`btn ${panneau ? "pri" : ""}`} onClick={() => setPanneau(!panneau)}>
            Filtres{nbFiltres ? ` · ${nbFiltres}` : ""}
          </button>
          <div className="chips">
            {[["tableau", "Tableau"], ["cartes", "Cartes"]].map(([k, lab]) => (
              <button key={k} className={`chip ${vue === k ? "on" : ""}`} onClick={() => setVue(k)}>{lab}</button>
            ))}
          </div>
          <input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 170 }} />
          <button className="btn" onClick={() => lotRef.current?.click()}>Importer des visuels</button>
          <button className="btn pri" onClick={creer}>+ Système</button>
        </div>
      </div>

      {nbFiltres > 0 && (
        <div className="row" style={{ gap: 6, marginBottom: 12 }}>
          {facettes.map((f) => {
            const v = sels[f.id];
            if (v === undefined || v === null || (Array.isArray(v) && !v.length)) return null;
            const texte = f.type === "seuil" ? `${f.lab} ≥ ${nf(v, f.pas < 1 ? 2 : 0)} ${f.unite}`
              : f.type === "plage" ? `${f.lab} ${nf(v[0], 0)} – ${nf(v[1], 0)} ${f.unite}`
                : f.type === "liste" ? `${f.lab} : ${CAT_MAP[v]?.nom || v}`
                  : `${f.lab} : ${(Array.isArray(v) ? v : [v]).map((x) => (f.fmt ? f.fmt(x) : x)).join(", ")}`;
            return (
              <button key={f.id} className="chip on" onClick={() => setUn(f.id, undefined)} title="Retirer ce filtre">
                {texte} ×
              </button>
            );
          })}
          <button className="crumb" onClick={() => setSels({})}>Effacer tout</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: panneau ? "268px minmax(0,1fr)" : "minmax(0,1fr)", gap: 14, alignItems: "start" }}>
        {panneau && (
          <div className="card">
            <div className="card-h"><h3>Filtres</h3><span className="mono hint">{listes.length}</span></div>
            <div style={{ padding: 14 }}>
              {["cloisons", "contre", "gaines", "bib"].includes(famille) && (
                <div style={{ marginBottom: 14 }}>
                  <div className="eyebrow">Entraxe de référence</div>
                  <div className="chips" style={{ marginTop: 5 }}>
                    {ENTRAXES.map((e) => (
                      <button key={e} className={`chip ${entraxe === e ? "on" : ""}`} onClick={() => setEntraxe(e)}>
                        {nf(e, 2)} m
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {facettes.map((f) => (
                <Facette key={f.id} f={f} base={base} sels={sels} setSel={setUn} compteurs={compteurs} ctx={ctx} />
              ))}
            </div>
          </div>
        )}

        <div>
          {listes.length === 0 ? (
            <div className="card empty">
              Aucun système ne satisfait ces filtres.
              {suggestion && (
                <div style={{ marginTop: 10 }}>
                  <button className="btn" onClick={() => setUn(suggestion.facette.id, undefined)}>
                    Relâcher « {suggestion.facette.lab} » : {suggestion.regagnes} système{suggestion.regagnes > 1 ? "s" : ""} retrouvé{suggestion.regagnes > 1 ? "s" : ""}
                  </button>
                </div>
              )}
            </div>
          ) : vue === "tableau" ? (
            <div className="card">
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Système</th>
                      {colonnes.map((c) => (
                        <th key={c.id} className={c.num ? "r" : ""} style={{ cursor: "pointer" }}
                          onClick={() => { if (triActif === c.id) setSens(-sens); else { setTri(c.id); setSens(-1); } }}>
                          {c.lab}{triActif === c.id ? (sens < 0 ? " ▾" : " ▴") : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {listes.map((s) => (
                      <tr key={s.id} onClick={() => setSel(s.id)} style={{ cursor: "pointer" }}>
                        <td>
                          <div className="row" style={{ gap: 9, flexWrap: "nowrap" }}>
                            {photos[s.id] && <img src={photos[s.id]} alt="" style={{ width: 46, height: 34, objectFit: "cover", border: "1px solid var(--ln2)", flex: "none" }} />}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600 }}>{s.nom}</div>
                              <div className="hint mono">
                                {s.code} · {s.marque} · {CAT_MAP[s.cat]?.nom}{s.verif ? " · à vérifier" : ""}
                              </div>
                            </div>
                          </div>
                        </td>
                        {colonnes.map((c) => (
                          <td key={c.id} className={c.num ? "num" : ""} style={c.prix ? { fontWeight: 600 } : undefined}>
                            {c.badge && s.feu && s.feu !== "—"
                              ? <span className="bdg feu">{c.aff(s, ctx)}</span>
                              : c.aff(s, ctx)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid">
              {listes.map((s) => {
                const c = coutSysteme(s, artMap, params);
                return (
                  <button key={s.id} className="syscard" onClick={() => setSel(s.id)}>
                    {photos[s.id] && (
                      <div style={{ height: 132, background: "var(--in)", borderBottom: "1px solid var(--ln2)", overflow: "hidden" }}>
                        <img src={photos[s.id]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      </div>
                    )}
                    <div className="syscard-h">
                      <span className="mono" style={{ fontSize: 11, fontWeight: 600 }}>{s.code}</span>
                      <span className="eyebrow">{s.marque}</span>
                    </div>
                    <div className="syscard-b">
                      <p className="sysnom">{s.nom}</p>
                      <div className="row" style={{ gap: 5 }}>
                        {s.feu && s.feu !== "—" && <span className="bdg feu">{s.feu}</span>}
                        {(s.carac?.dnt || s.dB) > 0 && <span className="bdg db">{nf(s.carac?.dnt || s.dB, 0)} dB</span>}
                        {s.ep > 0 && <span className="bdg">{s.ep} mm</span>}
                        {hauteurMax(s, entraxe) > 0 && <span className="bdg">H ≤ {nf(hauteurMax(s, entraxe), 2)} m</span>}
                      </div>
                    </div>
                    <div className="syscard-f">
                      <span>
                        <span className="eyebrow">Déboursé sec</span>
                        <span className="price" style={{ display: "block" }}>{eur(c.ds)}</span>
                      </span>
                      <span className="hint mono">PV {eur(c.pv)} / {s.unite}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <input ref={lotRef} type="file" accept="image/*" multiple style={{ display: "none" }}
        onChange={(e) => { importerLot(e.target.files); e.target.value = ""; }} />

      {selSys && (
        <SystemeDrawer
          sys={selSys} patch={patch} articles={articles} artMap={artMap} params={params}
          marques={marques} addMarque={addMarque} photos={photos} setPhoto={setPhoto}
          onClose={() => setSel(null)}
          onDup={() => {
            const n = { ...selSys, id: uid(), nom: `${selSys.nom} (copie)`, verif: false, lignes: selSys.lignes.map((l) => ({ ...l, id: uid() })) };
            setSystemes((ss) => [n, ...ss]); setSel(n.id);
          }}
          onDel={() => { setSystemes((ss) => ss.filter((x) => x.id !== selSys.id)); setSel(null); }}
          projets={projets} setProjets={setProjets} />
      )}
    </div>
  );
}
