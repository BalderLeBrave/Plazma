"""Reconstitue chiffrage-platrerie.jsx à partir des modules de src/.
   Les modules sont la source de vérité ; le fichier unique en est la sortie."""
import re, os, sys

SRC = "src"
DST = "chiffrage-platrerie.jsx"

# ordre des couches : identique à celui du découpage
ORDRE = [
    "domaine/format.js", "domaine/referentiel.js", "domaine/articles.js", "domaine/systemes.js",
    "domaine/projets.js", "domaine/moteur.js", "domaine/facettes.js", "domaine/photos.js", "styles.js",
    "ui/base.jsx", "ui/SystemeDrawer.jsx", "ui/Bibliotheque.jsx", "ui/Articles.jsx",
    "ui/Portefeuille.jsx", "ui/Projet.jsx", "ui/Achats.jsx", "ui/Depot.jsx", "ui/Parametres.jsx",
    "App.jsx",
]

TITRES = {
    "domaine/format.js": "Mise en forme et utilitaires",
    "domaine/referentiel.js": "Référentiel : familles, catégories, conditions de marché",
    "domaine/articles.js": "Articles, dimensions et conditionnement",
    "domaine/systemes.js": "Systèmes, nomenclatures et hauteurs limites",
    "domaine/projets.js": "Projet de démonstration",
    "domaine/moteur.js": "Moteur de calcul",
    "domaine/facettes.js": "Facettes et colonnes de la bibliothèque",
    "domaine/photos.js": "Photothèque",
    "styles.js": "Feuille de styles",
    "ui/base.jsx": "Composants de base",
    "ui/SystemeDrawer.jsx": "Fiche système",
    "ui/Bibliotheque.jsx": "Bibliothèque",
    "ui/Articles.jsx": "Articles et prix",
    "ui/Portefeuille.jsx": "Portefeuille de projets",
    "ui/Projet.jsx": "Projet",
    "ui/Achats.jsx": "Achats",
    "ui/Depot.jsx": "Dépôt",
    "ui/Parametres.jsx": "Paramètres",
    "App.jsx": "Application",
}

hooks = set()
morceaux = []
manquants = [m for m in ORDRE if not os.path.exists(os.path.join(SRC, m))]
if manquants:
    print("Modules absents :", manquants); sys.exit(1)

présents = set()
for root, _, files in os.walk(SRC):
    for f in files:
        rel = os.path.relpath(os.path.join(root, f), SRC).replace("\\", "/")
        if rel not in ("main.jsx", "storage.js"):
            présents.add(rel)
oubliés = présents - set(ORDRE)
if oubliés:
    print("Modules non repris dans l'ordre de fusion :", sorted(oubliés)); sys.exit(1)

for mod in ORDRE:
    txt = open(os.path.join(SRC, mod), encoding="utf-8").read()
    for m in re.finditer(r'import\s+React(?:\s*,\s*\{([^}]*)\})?\s+from\s+"react";', txt):
        if m.group(1):
            hooks.update(x.strip() for x in m.group(1).split(",") if x.strip())
    txt = re.sub(r'^import .*?;\s*$', '', txt, flags=re.M)          # les imports internes disparaissent
    txt = re.sub(r'^export default ', '', txt, flags=re.M)
    txt = re.sub(r'^export ', '', txt, flags=re.M)
    barre = "/* " + "=" * 66 + " */"
    morceaux.append(f"{barre}\n/*  {TITRES[mod]:<64}*/\n{barre}\n\n{txt.strip()}\n")

entete = ('import React, { ' + ", ".join(sorted(hooks)) + ' } from "react";\n\n') if hooks else 'import React from "react";\n\n'
corps = entete + "\n".join(morceaux)
corps = corps.rstrip() + "\n\nexport default App;\n"
open(DST, "w", encoding="utf-8").write(corps)
print(f"{len(ORDRE)} modules fusionnés → {len(corps)//1024} Ko, {corps.count(chr(10))} lignes")
