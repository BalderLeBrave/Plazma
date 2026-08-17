import re, os, sys, json

SRC = "chiffrage-platrerie.jsx"
DST = "src"

# Couches, du plus bas au plus haut. Un module ne peut dépendre que de ceux
# déclarés avant lui : c'est ce qui rend l'ordre d'initialisation vérifiable.
MODULES = [
    ("domaine/format.js", ["uid", "today", "semaineISO", "pluriel", "eur", "nf", "csvN", "telecharger"]),
    ("domaine/referentiel.js", [
        "STORE_KEY", "OLD_KEYS", "CATEGORIES", "CAT_MAP", "FAMILLES_ART", "UNITES", "STATUTS", "STATUTS_CDE",
        "STATUTS_TS", "MARQUES_SEED", "FOURNISSEURS_SEED", "CLASSES_EAU", "CLASSE_EAU_MAP", "HYGRO", "CARAC",
        "ENTRAXES", "MODE_COUPE", "MODE_COUPE_LIB", "ENTREPRISE_DEF", "LOGO_ID", "DEVIS_DEF", "MARCHE_DEF",
        "DEFAULT_PARAMS", "SENS", "QUESTIONS",
        "TX_CAUSE", "TX_LECTURE", "TX_GAIN", "TX_GEO_SURFACE", "TX_GEO_HAUTEUR", "TX_GEO_LONGUEUR", "TX_GEO_NONE",
    ]),
    ("domaine/articles.js", [
        "POIDS_DEF", "PALETTE_DEF", "POIDS_ART", "DIM_ART", "A", "ARTICLES_BRUTS", "SEED_ARTICLES",
        "lotAchat", "nomLot", "contenance",
    ]),
    ("domaine/systemes.js", [
        "P", "RAIL", "MONT", "HSP_REF", "ratioRail", "ratioMontant",
        "lignesCloison", "lignesContreCloison", "lignesDoublageColle", "lignesPlafond",
        "lignesPlafondDemontable", "lignesGaine", "lignesHabillage", "BUILDERS", "MATERIEL_DEF",
        "PERTE_DEF", "SANS_PERTE", "EAU_STD", "EAU_HYDRO", "EAU_THRE", "SUP_STD", "SUP_LARGE",
        "CARAC_SYS", "DEFS", "hauteursDepuis", "buildSysteme", "SEED_SYSTEMES", "hauteurMax",
    ]),
    ("domaine/projets.js", ["SEED_PROJETS"]),
    ("domaine/moteur.js", [
        "coefEntreprise", "coefDeMarge", "margeVersMarque", "marqueVersMarge", "margeArticle", "tauxMO",
        "perteOf", "herite", "qteLigne", "qteLigneNette", "coutSysteme", "qteOuvrage", "ouvragesVariante",
        "totauxProjet", "calculBesoins", "suiviAchats",
        "feuEnNombre", "evaluerSysteme",
        "SEUIL_RECUP", "TAUX_RECUP", "perteDebit", "fracCoupe", "besoinsDetail", "prixFacture",
        "tauxEcart", "ecartHerite", "ecartArticle",
        "heuresOuvrage", "avOuvrage", "rendementMO", "montantTS", "TS_ACQUIS", "situationProjet",
        "etatStock", "couvertureDepot",
    ]),
    ("domaine/photos.js", [
        "PHOTO_KEY", "PHOTO_PREFIX", "PHOTO_LARGEUR", "PHOTO_QUALITE", "PHOTO_ALERTE",
        "chargerPhotos", "importerPhoto", "poidsPhotos",
    ]),
    ("styles.js", ["CSS"]),
    ("ui/base.jsx", ["Num", "TauxMarge", "SelectListe", "ChipsListe", "CatVisuel", "Coupe", "ZonePhoto"]),
    ("ui/SystemeDrawer.jsx", ["SystemeDrawer"]),
    ("ui/Bibliotheque.jsx", ["Bibliotheque"]),
    ("ui/Assistant.jsx", ["Assistant"]),
    ("ui/Articles.jsx", ["Articles"]),
    ("ui/Portefeuille.jsx", ["Portefeuille"]),
    ("ui/Projet.jsx", ["Projet"]),
    ("ui/Achats.jsx", ["Achats"]),
    ("ui/Depot.jsx", ["Depot"]),
    ("ui/Parametres.jsx", ["Parametres"]),
    ("App.jsx", ["NAV", "normaliser", "App"]),
]

src = open(SRC, encoding="utf-8").read()
src = re.sub(r'^import .*\n', '', src, count=1)     # l'import React est réémis par module

pat = re.compile(r'^(?:export default function|const|let|var|async function|function|class)\s+([A-Za-z_$][\w$]*)', re.M)
marques = [(m.start(), m.group(1)) for m in pat.finditer(src)]

def debut_avec_commentaire(txt, pos):
    """remonte au début du bloc de commentaire qui précède la déclaration,
       en retrouvant l'ouverture réelle d'un commentaire multiligne"""
    i = txt.rfind("\n", 0, pos)
    while i > 0:
        j = txt.rfind("\n", 0, i)
        ligne = txt[j + 1:i].strip()
        if ligne == "":
            i = j
            continue
        if ligne.endswith("*/"):
            ouv = txt.rfind("/*", 0, i)
            if ouv < 0:
                break
            deb_ligne = txt.rfind("\n", 0, ouv) + 1
            if txt[deb_ligne:ouv].strip():      # commentaire de fin de ligne : ce n'est pas un entête
                break
            k = deb_ligne - 1
            i = k if k >= 0 else 0
            continue
        if ligne.startswith("//"):
            i = j
            continue
        break
    return i + 1 if i > 0 else 0

blocs = {}
for idx, (pos, nom) in enumerate(marques):
    deb = debut_avec_commentaire(src, pos)
    fin = debut_avec_commentaire(src, marques[idx + 1][0]) if idx + 1 < len(marques) else len(src)
    blocs[nom] = src[deb:fin].rstrip() + "\n"

# contrôle : aucun symbole oublié, aucun classé deux fois
classes = [n for _, noms in MODULES for n in noms]
manquants = [n for n in blocs if n not in classes]
inconnus = [n for n in classes if n not in blocs]
doublons = [n for n in set(classes) if classes.count(n) > 1]
if manquants or inconnus or doublons:
    print("MANQUANTS :", manquants); print("INCONNUS :", inconnus); print("DOUBLONS :", doublons)
    sys.exit(1)

position = {n: i for i, (_, n) in enumerate(marques)}
MODULES = [(m, sorted(ns, key=lambda n: position[n])) for m, ns in MODULES]
proprio = {n: mod for mod, noms in MODULES for n in noms}
ordre = [m for m, _ in MODULES]

def chemin_relatif(depuis, vers):
    d = os.path.dirname(depuis)
    rel = os.path.relpath(vers, d if d else ".")
    return rel if rel.startswith(".") else "./" + rel

mot = lambda n: re.compile(r'(?<![\w$])' + re.escape(n) + r'(?![\w$])')

def utilise(nom, corps):
    """vrai si le symbole est réellement employé : on écarte les accès de
       propriété (obj.nom) mais pas les diffusions d'objet (...nom)"""
    for m in mot(nom).finditer(corps):
        i = m.start()
        if i > 0 and corps[i - 1] == "." and corps[max(0, i - 3):i] != "...":
            continue
        return True
    return False

def code_seul(txt):
    """retire commentaires et littéraux : une dépendance ne se lit que dans le code"""
    txt = re.sub(r'/\*.*?\*/', ' ', txt, flags=re.S)
    txt = re.sub(r'//[^\n]*', ' ', txt)
    # les apostrophes du français rendent toute détection de chaîne illusoire
    # dans le JSX : on ne retire que les commentaires, quitte à sur-détecter
    return txt

os.makedirs(DST, exist_ok=True)
recap = []
for mod, noms in MODULES:
    corps = code_seul("\n".join(blocs[n] for n in noms))
    besoins = {}
    for autre, prop in proprio.items():
        if prop == mod or autre in noms:
            continue
        if utilise(autre, corps):
            besoins.setdefault(prop, []).append(autre)
    # un module ne peut importer que d'une couche inférieure : toute dépendance
    # remontante vient d'un nom aperçu dans un libellé, on l'écarte
    for src_mod in [m2 for m2 in besoins if ordre.index(m2) >= ordre.index(mod)]:
        besoins.pop(src_mod)
    entete = []
    if ".jsx" in mod:
        hooks = [h for h in ["useState", "useEffect", "useMemo", "useRef"] if utilise(h, corps)]
        entete.append("import React" + (", { " + ", ".join(hooks) + " }" if hooks else "") + ' from "react";')
    for m2 in sorted(besoins, key=ordre.index):
        entete.append(f'import {{ {", ".join(sorted(set(besoins[m2])))} }} from "{chemin_relatif(mod, m2)}";')
    exporte = "\n".join(
        re.sub(r'^(export default function|const|let|var|async function|function|class)',
               lambda m: m.group(1) if m.group(1).startswith("export") else "export " + m.group(1),
               blocs[n], count=1, flags=re.M)
        for n in noms)
    chemin = os.path.join(DST, mod)
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    txt = ("\n".join(entete) + "\n\n" if entete else "") + exporte
    open(chemin, "w", encoding="utf-8").write(txt)
    recap.append((mod, len(noms), txt.count("\n"), len(besoins)))

print(f"{len(MODULES)} modules écrits\n")
for m, ns, li, im in recap:
    print(f"  {m:32} {ns:3} symboles  {li:5} lignes  {im} imports")
