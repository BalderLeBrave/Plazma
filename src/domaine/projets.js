import { uid } from "./format.js";
import { DEVIS_DEF, MARCHE_DEF } from "./referentiel.js";
import { A } from "./articles.js";


export const SEED_PROJETS = [
  {
    id: "prj-1", nom: "Tour A", client: "Bouygues Bâtiment IdF", statut: "Étude",
    zones: ["Zone A", "Zone B"], niveaux: ["R+1", "R+2", "R+3", "R+4"],
    variantes: ["Base"], varianteActive: "Base", situationNum: 1,
    marche: { ...MARCHE_DEF }, pointages: [], ts: [], histoSit: [], devis: { ...DEVIS_DEF },
    postes: [
      { id: "po-1", code: "3.1.1", des: "Cloisons de distribution 98/48", unite: "m²", qte: 390 },
      { id: "po-2", code: "3.1.2", des: "Cloisons séparatives acoustiques", unite: "m²", qte: 64 },
      { id: "po-3", code: "3.2.1", des: "Doublages thermiques de façade", unite: "m²", qte: 120 },
      { id: "po-4", code: "3.3.1", des: "Plafonds circulations", unite: "m²", qte: 85 },
    ],
    fraisChantier: [
      { id: uid(), des: "Installation de chantier et cantonnement", montant: 3200 },
      { id: uid(), des: "Location lift-plaque et échafaudage roulant", montant: 1850 },
      { id: uid(), des: "Nettoyage et remise en état", montant: 900 },
    ],
    ouvrages: [
      { id: uid(), sys: "s-p9848", zone: "Zone A", niveau: "R+3", local: "Logements T2", variante: "Base", poste: "po-1", mode: "detail", nb: 1, long: 72, hsp: 2.5, deduc: 0, qte: 180, avPrec: 0, avAct: 0 },
      { id: uid(), sys: "s-p12270d", zone: "Zone A", niveau: "R+3", local: "Séparatifs", variante: "Base", poste: "po-2", mode: "direct", qte: 64, avPrec: 0, avAct: 0 },
      { id: uid(), sys: "s-pm80", zone: "Zone A", niveau: "R+3", local: "Façade", variante: "Base", poste: "po-3", mode: "direct", qte: 120, avPrec: 0, avAct: 0 },
      { id: uid(), sys: "s-f530", zone: "Zone A", niveau: "R+3", local: "Circulations", variante: "Base", poste: "po-4", mode: "direct", qte: 85, avPrec: 0, avAct: 0 },
      { id: uid(), sys: "s-p9848", zone: "Zone B", niveau: "R+4", local: "Logements T3", variante: "Base", poste: "po-1", mode: "direct", qte: 210, avPrec: 0, avAct: 0 },
      { id: uid(), sys: "s-gt9848", zone: "Zone B", niveau: "R+4", local: "Gaines palières", variante: "Base", poste: "", mode: "direct", qte: 26, avPrec: 0, avAct: 0 },
    ],
    commandes: [],
    conso: {},
    casseDef: 1.0, repriseDef: 1.2, ecartArt: {},
  },
];
