
export const uid = () => Math.random().toString(36).slice(2, 9);

export const today = () => new Date().toISOString().slice(0, 10);

/* Semaine ISO au format 2026-S32, utilisée pour le pointage */
export function semaineISO(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const debut = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const n = Math.ceil(((t - debut) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-S${String(n).padStart(2, "0")}`;
}


export const pluriel = (mot, n) => {
  if (!mot) return "";
  if (n <= 1) return mot;
  if (/(s|x|z)$/i.test(mot)) return mot;
  if (/(eau|au|eu)$/i.test(mot)) return mot + "x";
  if (/al$/i.test(mot)) return mot.replace(/al$/i, "aux");
  return mot + "s";
};


export const eur = (n, d = 2) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: d, maximumFractionDigits: d })
    .format(Number.isFinite(n) ? n : 0);


export const nf = (n, d = 2) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d })
    .format(Number.isFinite(n) ? n : 0);


export const csvN = (n, d = 2) => nf(n, d).replace(/\u202f|\u00a0|\s/g, "");


/* ================================================================== */
/*  4. Composants de base                                              */
/* ================================================================== */

export function telecharger(nom, contenu, type = "text/csv;charset=utf-8;") {
  const blob = new Blob([type.includes("csv") ? "\uFEFF" + contenu : contenu], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nom; a.click();
  URL.revokeObjectURL(url);
}
