# Organisation du code

Trois couches. Un module ne dépend que d'une couche inférieure : c'est ce qui rend
impossible les erreurs d'ordre d'initialisation rencontrées sur le fichier unique.

## src/domaine — calcul pur, aucune ligne de React, testable

| Module | Contenu |
|---|---|
| `format.js` | `uid`, `today`, `semaineISO`, `pluriel`, `eur`, `nf`, `csvN`, `telecharger` |
| `referentiel.js` | `FAMILLES` et `familleDe`, `CATEGORIES`, `CARAC`, `CLASSES_EAU`, `ENTRAXES`, `MARCHE_DEF`, `ENTREPRISE_DEF`, `DEVIS_DEF`, `DEFAULT_PARAMS` |
| `articles.js` | catalogue d'articles, dimensions, colisage, `lotAchat`, `contenance` |
| `systemes.js` | `DEFS`, `CARAC_SYS`, `BUILDERS`, `PERTE_ART`, `SANS_PERTE`, `HAUTEURS_LIMITES`, `hauteursSysteme`, `hauteurMax` |
| `projets.js` | projet de démonstration |
| `moteur.js` | `coefEntreprise`, `coutSysteme`, `perteOf`, `qteLigne`, écart matière, situation, rendement, stock |
| `facettes.js` | facettes et colonnes par famille, `filtrer`, compteurs |
| `photos.js` | photothèque, une clé de stockage par visuel |

## src/ui — un écran par fichier

`base.jsx` (champs, vignettes, coupes), `Bibliotheque`, `SystemeDrawer`, `Articles`,
`Portefeuille`, `Projet`, `Achats`, `Depot`, `Parametres`.

## src/App.jsx — coquille

État, persistance, migration (`normaliser`), navigation.

---

## Contrôles

```
npm test        # 10 contrôles d'identité du moteur, puis rendu des 9 écrans
npm run verif   # aucun identifiant employé sans être importé ni déclaré
```

Le test de rendu est le garde-fou décisif : il attrape les imports manquants qui,
sinon, ne se manifestent qu'à l'ouverture de l'écran chez l'utilisateur.

## Fichier unique

`chiffrage-platrerie.jsx` est une **sortie**, pas une source. Après toute modification
de `src/` :

```
npm run fusion
```

Ne jamais modifier le fichier unique directement : la fusion l'écrase.
`outils/decouper.py` fait le chemin inverse, il n'a servi qu'à la migration initiale.

## Points ouverts

- `HAUTEURS_LIMITES` contient des valeurs d'amorçage, à recaler sur les mémentos
  fabricants. Tant qu'un système n'a pas été confronté à sa fiche technique, il
  conserve `verif: true` et le badge « à vérifier ».
- Les caractéristiques semées pour `ps`, `bib` et `bar` sont des ordres de grandeur.
- Le facteur de massiveté et la température critique ne sont pas encore reliés à un
  calcul de protection : ce sont pour l'instant des champs de saisie.
