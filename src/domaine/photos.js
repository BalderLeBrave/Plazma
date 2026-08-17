

/* ------------------------------------------------------------------ */
/*  Photographies des systèmes                                          */
/*  Stockées à part de la base de travail : une sauvegarde de projet    */
/*  ne doit pas transporter plusieurs mégaoctets d'images.              */
/* ------------------------------------------------------------------ */

export const PHOTO_KEY = "chiffrage-photos-v1";      /* ancienne clé unique, reprise au chargement */

export const PHOTO_PREFIX = "photo:";                /* une clé par visuel : pas de plafond global */


export async function chargerPhotos() {
  const out = {};
  try {
    const r = await window.storage.list(PHOTO_PREFIX);
    for (const k of r?.keys || []) {
      try { const v = await window.storage.get(k); out[k.slice(PHOTO_PREFIX.length)] = v.value; }
      catch { /* clé illisible, on continue */ }
    }
  } catch { /* aucun visuel */ }
  try {                                        /* reprise de l'ancien format */
    const anc = await window.storage.get(PHOTO_KEY);
    if (anc?.value) {
      const m = JSON.parse(anc.value);
      for (const [id, url] of Object.entries(m)) {
        if (!out[id] && url) { out[id] = url; await window.storage.set(PHOTO_PREFIX + id, url); }
      }
      await window.storage.delete(PHOTO_KEY).catch(() => { });
    }
  } catch { /* rien à reprendre */ }
  return out;
}

export const PHOTO_LARGEUR = 1000;   /* redimensionnement à l'import */

export const PHOTO_QUALITE = 0.72;

export const PHOTO_ALERTE = 4 * 1024 * 1024;


/* Redimensionne et recompresse avant stockage : une photo de fabricant
   fait 2 à 5 Mo, ce qui saturerait le stockage en une dizaine de fiches. */
export function importerPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) { reject(new Error("Le fichier n'est pas une image.")); return; }
    const lecteur = new FileReader();
    lecteur.onerror = () => reject(new Error("Lecture impossible."));
    lecteur.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Image illisible."));
      img.onload = () => {
        const ech = Math.min(1, PHOTO_LARGEUR / img.width);
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * ech);
        cv.height = Math.round(img.height * ech);
        const ctx = cv.getContext("2d");
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        resolve(cv.toDataURL("image/jpeg", PHOTO_QUALITE));
      };
      img.src = String(lecteur.result);
    };
    lecteur.readAsDataURL(file);
  });
}


export const poidsPhotos = (photos) => Object.values(photos || {}).reduce((a, v) => a + (v ? v.length * 0.75 : 0), 0);
