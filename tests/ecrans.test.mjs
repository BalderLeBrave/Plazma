/* Rendu de chaque écran : un identifiant non importé lève ici, pas chez l'utilisateur. */
import { strict as assert } from "node:assert";
import React from "react";
import { renderToStaticMarkup as rendu } from "react-dom/server";
import { SEED_SYSTEMES } from "../src/domaine/systemes.js";
import { SEED_ARTICLES } from "../src/domaine/articles.js";
import { SEED_PROJETS } from "../src/domaine/projets.js";
import { DEFAULT_PARAMS, MARQUES_SEED, FOURNISSEURS_SEED } from "../src/domaine/referentiel.js";
import { Bibliotheque } from "../src/ui/Bibliotheque.jsx";
import { SystemeDrawer } from "../src/ui/SystemeDrawer.jsx";
import { Articles } from "../src/ui/Articles.jsx";
import { Portefeuille } from "../src/ui/Portefeuille.jsx";
import { Projet } from "../src/ui/Projet.jsx";
import { Achats } from "../src/ui/Achats.jsx";
import { Depot } from "../src/ui/Depot.jsx";
import { Parametres } from "../src/ui/Parametres.jsx";
import App from "../src/App.jsx";

const sysMap = Object.fromEntries(SEED_SYSTEMES.map((s) => [s.id, s]));
const artMap = Object.fromEntries(SEED_ARTICLES.map((a) => [a.id, a]));
const p = DEFAULT_PARAMS;
const projets = SEED_PROJETS;
const rien = () => { };
const commun = {
  systemes: SEED_SYSTEMES, setSystemes: rien, articles: SEED_ARTICLES, setArticles: rien,
  artMap, sysMap, params: p, setParams: rien, projets, setProjets: rien,
  marques: MARQUES_SEED, setMarques: rien, addMarque: rien,
  fournisseurs: FOURNISSEURS_SEED, setFournisseurs: rien, addFournisseur: rien,
  photos: {}, setPhoto: rien, data: {}, importer: rien, reset: rien,
  projet: projets[0], patchP: rien, retour: rien, ouvrir: rien,
  depot: { mouvements: [] }, setDepot: rien,
};

let n = 0;
const essai = (nom, el) => {
  const html = rendu(el);
  assert(html.length > 100, nom + " : rendu vide");
  n++; console.log("  ✓", nom);
};

essai("Application", React.createElement(App));
essai("Bibliothèque", React.createElement(Bibliotheque, commun));
essai("Fiche système", React.createElement(SystemeDrawer, {
  ...commun, sys: SEED_SYSTEMES[0], patch: rien, onClose: rien, onDup: rien, onDel: rien,
}));
essai("Articles et prix", React.createElement(Articles, commun));
essai("Portefeuille", React.createElement(Portefeuille, commun));
essai("Projet", React.createElement(Projet, commun));
essai("Achats", React.createElement(Achats, commun));
essai("Dépôt", React.createElement(Depot, commun));
essai("Paramètres", React.createElement(Parametres, commun));

console.log(`\n${n} écrans rendus sans erreur.`);
