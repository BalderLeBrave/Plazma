import React, { useState, useEffect, useRef } from "react";
import { nf } from "../domaine/format.js";
import { margeVersMarque, marqueVersMarge } from "../domaine/moteur.js";
import { importerPhoto } from "../domaine/photos.js";


export function Num({ value, onChange, className = "", ...rest }) {
  const [raw, setRaw] = useState(String(value ?? ""));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setRaw(String(value ?? "")); }, [value]);
  return (
    <input
      {...rest} type="text" inputMode="decimal" className={`inp-mono ${className}`} value={raw}
      onFocus={() => (focused.current = true)}
      onChange={(e) => {
        setRaw(e.target.value);
        const p = parseFloat(e.target.value.replace(",", "."));
        onChange(Number.isFinite(p) ? p : 0);
      }}
      onBlur={() => {
        focused.current = false;
        const p = parseFloat(raw.replace(",", "."));
        setRaw(String(Number.isFinite(p) ? p : 0));
      }}
    />
  );
}


/* Saisie d'un taux au choix en marge (sur achat) ou en marque (sur vente) */
export function TauxMarge({ valeur, onChange, compact = false }) {
  const v = valeur || { mode: "marque", taux: 0 };
  const autre = v.mode === "marge" ? margeVersMarque(v.taux) : marqueVersMarge(v.taux);
  return (
    <div className="row" style={{ gap: 5, flexWrap: "nowrap" }}>
      <select value={v.mode} onChange={(e) => {
        const mode = e.target.value;
        const taux = mode === v.mode ? v.taux : (mode === "marque" ? margeVersMarque(v.taux) : marqueVersMarge(v.taux));
        onChange({ mode, taux: Math.round(taux * 100) / 100 });
      }} style={{ width: compact ? 82 : 104 }}>
        <option value="marge">Marge</option>
        <option value="marque">Marque</option>
      </select>
      <Num className="bare" style={{ width: 62 }} value={v.taux} onChange={(t) => onChange({ ...v, taux: t })} />
      <span className="hint mono" title={v.mode === "marge" ? "équivaut en taux de marque" : "équivaut en taux de marge"}>
        % → {nf(autre, 1)} %
      </span>
    </div>
  );
}


export function CatVisuel({ cat }) {
  const S = { st: "var(--i3)", ac: "var(--ac)", fill: "var(--coupe-plaque)", iso: "var(--coupe-isol)" };
  const V = (c) => <svg viewBox="0 0 200 96" width="100%" height="88" role="presentation">{c}</svg>;
  const studs = (x0, x1, y0, y1, n = 4) =>
    Array.from({ length: n }, (_, i) => {
      const x = x0 + ((x1 - x0) / (n + 1)) * (i + 1);
      return <line key={i} x1={x} y1={y0} x2={x} y2={y1} stroke={S.ac} strokeWidth="1.4" />;
    });
  switch (cat) {
    case "cd": return V(<><rect x="30" y="16" width="140" height="60" fill={S.fill} stroke={S.st} />{studs(30, 170, 16, 76, 5)}<path d="M30 76 h140" stroke={S.st} strokeWidth="2" /><path d="M120 30 l40 -10 v60 l-40 10 z" fill={S.iso} stroke={S.st} opacity=".9" /></>);
    case "cs": return V(<><rect x="24" y="16" width="70" height="60" fill={S.fill} stroke={S.st} /><rect x="106" y="16" width="70" height="60" fill={S.fill} stroke={S.st} />{studs(24, 94, 16, 76, 3)}{studs(106, 176, 16, 76, 3)}<rect x="94" y="16" width="12" height="60" fill={S.iso} stroke={S.st} strokeDasharray="3 2" /></>);
    case "csp": return V(<><rect x="30" y="16" width="140" height="60" fill={S.fill} stroke={S.st} />{studs(30, 170, 16, 76, 5)}<path d="M100 30 c14 12 20 20 20 27 a20 20 0 0 1 -40 0 c0 -7 6 -15 20 -27 z" fill={S.iso} stroke={S.ac} strokeWidth="1.4" /></>);
    case "cgh": return V(<><rect x="50" y="8" width="110" height="80" fill={S.fill} stroke={S.st} />{studs(50, 160, 8, 88, 4)}<line x1="34" y1="8" x2="34" y2="88" stroke={S.ac} strokeWidth="1.4" /><path d="M30 12 l4 -6 l4 6 M30 84 l4 6 l4 -6" fill="none" stroke={S.ac} strokeWidth="1.4" /></>);
    case "cc": return V(<><rect x="30" y="16" width="46" height="60" fill={S.iso} stroke={S.st} /><path d="M30 32 h46 M30 48 h46 M30 64 h46 M53 16 v16 M53 48 v16" stroke={S.st} strokeWidth=".8" /><rect x="96" y="16" width="10" height="60" fill={S.fill} stroke={S.st} />{studs(76, 96, 16, 76, 2)}<line x1="76" y1="16" x2="76" y2="76" stroke={S.st} strokeDasharray="3 2" /></>);
    case "dc": return V(<><rect x="30" y="16" width="60" height="60" fill={S.iso} stroke={S.st} /><path d="M30 36 h60 M30 56 h60 M60 16 v20 M60 56 v20" stroke={S.st} strokeWidth=".8" /><rect x="90" y="16" width="34" height="60" fill="var(--coupe-vide)" stroke={S.st} /><rect x="124" y="16" width="9" height="60" fill={S.fill} stroke={S.st} /><path d="M96 26 q10 6 20 0 M96 44 q10 6 20 0 M96 62 q10 6 20 0" stroke={S.ac} fill="none" strokeWidth="1" /></>);
    case "pnd": return V(<><path d="M24 30 L100 12 L176 30 L100 48 Z" fill={S.fill} stroke={S.st} /><path d="M24 30 v14 L100 62 v-14 M176 30 v14 L100 62" fill="var(--coupe-vide)" stroke={S.st} /><path d="M60 21 v-12 M100 12 v-8 M140 21 v-12" stroke={S.ac} strokeWidth="1.2" /><path d="M50 36 L120 18 M80 44 L150 26" stroke={S.ac} strokeWidth=".9" /></>);
    case "pand": return V(<><path d="M24 34 L100 16 L176 34 L100 52 Z" fill={S.fill} stroke={S.st} />{Array.from({ length: 18 }, (_, i) => { const c = i % 6, r = Math.floor(i / 6); return <circle key={i} cx={64 + c * 14 + r * 8} cy={30 + r * 6 - c * 2.2} r="1.8" fill={S.ac} />; })}<path d="M70 24 v-12 M130 24 v-12" stroke={S.ac} strokeWidth="1.2" /></>);
    case "pd": return V(<><path d="M24 34 L100 16 L176 34 L100 52 Z" fill={S.fill} stroke={S.st} /><path d="M62 25 L138 43 M100 16 L100 52 M138 25 L62 43" stroke={S.ac} strokeWidth="1.2" /><path d="M100 16 v-10 M62 25 v-8 M138 25 v-8" stroke={S.st} strokeWidth="1" /></>);
    case "gt": return V(<><rect x="70" y="14" width="60" height="64" fill={S.fill} stroke={S.st} /><path d="M70 14 l16 -8 h60 l-16 8 M130 14 l16 -8 v64 l-16 8" fill="var(--coupe-vide)" stroke={S.st} /><path d="M86 22 v52 M110 22 v52" stroke={S.ac} strokeWidth="1.2" strokeDasharray="4 3" /></>);
    case "ps": return V(<><rect x="84" y="8" width="32" height="80" fill={S.iso} stroke={S.st} /><path d="M84 8 h32 M84 88 h32" stroke={S.st} strokeWidth="2" /><rect x="66" y="16" width="68" height="64" fill="none" stroke={S.ac} strokeWidth="1.6" strokeDasharray="5 3" /><rect x="66" y="16" width="9" height="64" fill={S.fill} stroke={S.st} /><rect x="125" y="16" width="9" height="64" fill={S.fill} stroke={S.st} /><path d="M75 16 h50 M75 80 h50" stroke={S.st} strokeWidth=".8" /></>);
    case "bib": return V(<><rect x="26" y="10" width="148" height="78" fill="none" stroke={S.st} strokeDasharray="4 3" /><path d="M52 26 h96 v6 h-96 z" fill={S.fill} stroke={S.st} /><rect x="52" y="32" width="10" height="46" fill={S.fill} stroke={S.st} /><rect x="138" y="32" width="10" height="46" fill={S.fill} stroke={S.st} /><rect x="62" y="32" width="76" height="46" fill={S.iso} stroke="none" opacity=".5" />{studs(62, 138, 34, 78, 3)}<path d="M52 78 h96" stroke={S.ac} strokeWidth="1.8" /><path d="M57 24 v-6 M143 24 v-6" stroke={S.ac} strokeWidth="1.2" /></>);
    case "bar": return V(<><rect x="30" y="14" width="40" height="68" fill={S.iso} stroke={S.st} /><path d="M30 36 h40 M30 58 h40 M50 14 v22 M50 58 v24" stroke={S.st} strokeWidth=".8" />{studs(70, 100, 14, 82, 2)}<rect x="100" y="14" width="11" height="68" fill={S.fill} stroke={S.st} /><rect x="113" y="14" width="11" height="68" fill={S.fill} stroke={S.st} /><path d="M88 20 v56" stroke={S.ac} strokeWidth="1.2" strokeDasharray="4 3" /><path d="M132 22 l8 -6 M132 44 l8 -6 M132 66 l8 -6" stroke={S.ac} strokeWidth="1.2" /></>);
    default: return V(<rect x="30" y="16" width="140" height="60" fill={S.fill} stroke={S.st} />);
  }
}


export function Coupe({ sys }) {
  const c = sys.coupe || { pA: 1, pB: 1, oss: 48, isol: false };
  const W = 300, H = 96, y0 = 12, hh = 68, pw = 7;
  const ossW = Math.max(16, Math.min(78, (c.oss || 48) * 0.6));
  const total = c.pA * pw + ossW + c.pB * pw;
  let x = (W - total) / 2;
  const left = x, parts = [];
  for (let i = 0; i < c.pA; i++) { parts.push(<rect key={`a${i}`} x={x} y={y0} width={pw} height={hh} fill="var(--coupe-plaque)" stroke="var(--i3)" />); x += pw; }
  const ox = x;
  parts.push(<rect key="oss" x={ox} y={y0} width={ossW} height={hh} fill={c.isol ? "var(--coupe-isol)" : "var(--coupe-vide)"} stroke="var(--ln)" />);
  if (c.isol) for (let i = 0; i < 5; i++) {
    const yy = y0 + 8 + i * 13;
    parts.push(<path key={`i${i}`} d={`M${ox + 2} ${yy} q ${ossW / 4} -5 ${ossW / 2} 0 q ${ossW / 4} 5 ${ossW / 2 - 4} 0`} fill="none" stroke="var(--ac)" strokeOpacity=".55" />);
  }
  if (c.dbl) {
    parts.push(<path key="p1" d={`M${ox + 3} ${y0 + 4} h${ossW / 2 - 6} v${hh - 8} h${-(ossW / 2 - 6)}`} fill="none" stroke="var(--ac)" strokeWidth="1.6" />);
    parts.push(<path key="p2" d={`M${ox + ossW - 3} ${y0 + 4} h${-(ossW / 2 - 6)} v${hh - 8} h${ossW / 2 - 6}`} fill="none" stroke="var(--ac)" strokeWidth="1.6" />);
  } else {
    parts.push(<path key="p1" d={`M${ox + 3} ${y0 + 4} h${ossW - 6} v${hh - 8} h${-(ossW - 6)}`} fill="none" stroke="var(--ac)" strokeWidth="1.6" />);
  }
  x = ox + ossW;
  for (let i = 0; i < c.pB; i++) { parts.push(<rect key={`b${i}`} x={x} y={y0} width={pw} height={hh} fill="var(--coupe-plaque)" stroke="var(--i3)" />); x += pw; }
  return (
    <div className="coupe">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Coupe schématique — ${sys.nom}`}>
        {parts}
        <line x1={left} y1={y0 + hh + 12} x2={left + total} y2={y0 + hh + 12} stroke="var(--i3)" />
        <line x1={left} y1={y0 + hh + 8} x2={left} y2={y0 + hh + 16} stroke="var(--i3)" />
        <line x1={left + total} y1={y0 + hh + 8} x2={left + total} y2={y0 + hh + 16} stroke="var(--i3)" />
        <text x={W / 2} y={y0 + hh + 8} textAnchor="middle" fontSize="9" fill="var(--i3)" fontFamily="Sometype Mono, monospace">
          {sys.ep ? `${sys.ep} mm` : "plafond"}
        </text>
      </svg>
    </div>
  );
}


export function SelectListe({ value, onChange, items, onCreate, className = "", style, libelle = "élément" }) {
  return (
    <select className={className} style={style} value={value || ""} onChange={(e) => {
      if (e.target.value === "__new") {
        const nom = prompt(`Nom du nouveau ${libelle} ?`);
        if (nom && nom.trim()) { onCreate(nom.trim()); onChange(nom.trim()); }
        return;
      }
      onChange(e.target.value);
    }}>
      {value && !items.some((m) => m.nom === value) ? <option value={value}>{value}</option> : null}
      {items.map((m) => <option key={m.id} value={m.nom}>{m.nom}</option>)}
      <option value="__new">+ Nouveau…</option>
    </select>
  );
}


export function ChipsListe({ label, items, onChange, placeholder }) {
  return (
    <div>
      <span className="eyebrow">{label}</span>
      <div className="chips" style={{ marginTop: 4 }}>
        {items.map((it) => (
          <span key={it} className="chip" style={{ cursor: "default" }}>
            {it}
            <button className="crumb" style={{ marginLeft: 6, color: "var(--ink3)" }} aria-label={`Retirer ${it}`}
              onClick={() => onChange(items.filter((x) => x !== it))}>×</button>
          </span>
        ))}
        <button className="chip" onClick={() => {
          const v = prompt(placeholder);
          if (v && v.trim() && !items.includes(v.trim())) onChange([...items, v.trim()]);
        }}>+</button>
      </div>
    </div>
  );
}


/* Zone de dépôt et d'import, réutilisée dans la fiche système */
export function ZonePhoto({ src, onChange, hauteur = 150 }) {
  const ref = useRef(null);
  const [survol, setSurvol] = useState(false);
  const [err, setErr] = useState("");

  const traiter = async (file) => {
    if (!file) return;
    try { onChange(await importerPhoto(file)); setErr(""); }
    catch (e) { setErr(e.message); }
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => { e.preventDefault(); setSurvol(false); traiter(e.dataTransfer.files?.[0]); }}
        style={{
          height: hauteur, border: `1px ${src ? "solid" : "dashed"} ${survol ? "var(--i1)" : "var(--bd)"}`,
          background: src ? "var(--p2)" : "var(--in)", display: "flex", alignItems: "center",
          justifyContent: "center", overflow: "hidden", position: "relative",
        }}>
        {src
          ? <img src={src} alt="Photographie du système" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }} />
          : <span className="hint" style={{ textAlign: "center", padding: 12 }}>
              Déposer une photographie<br />ou choisir un fichier
            </span>}
      </div>
      <div className="row" style={{ gap: 6, marginTop: 6 }}>
        <button className="btn sm" onClick={() => ref.current?.click()}>{src ? "Remplacer" : "Choisir un fichier"}</button>
        {src && <button className="btn sm danger" onClick={() => onChange(null)}>Retirer</button>}
        {src && <span className="hint mono">{nf(src.length * 0.75 / 1024, 0)} Ko</span>}
        {err && <span className="hint neg">{err}</span>}
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => { traiter(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}
