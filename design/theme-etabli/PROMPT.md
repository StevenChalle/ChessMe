# Prompt à coller dans Claude Code

> Copie ce dossier `craftyourchess-theme-etabli/` à la racine du dépôt (par exemple dans `design/theme-etabli/`), puis colle le texte ci-dessous.

---

Je veux appliquer un nouveau thème visuel, « L'Établi », à toute l'app CraftYourChess. Aujourd'hui `index.css` copie le thème sombre de Lichess. Je veux le remplacer par ce thème sans changer aucune fonctionnalité.

Le dossier `design/theme-etabli/` contient tout ce qu'il faut :
- `THEME.md` : la spécification (règles, palette, typographie, composant par composant, échiquier). C'est la référence : lis-la en entier avant de commencer.
- `etabli.css` : les variables CSS (rôles CraftYourChess `--cyc-*`, branchement shadcn/ui, `@theme inline` Tailwind v4, `@font-face`, utilitaires de signature).
- `fonts/` : Noto Sans et Noto Sans Mono en woff2 (SIL OFL), avec leurs licences.
- `reference/` : captures du résultat attendu (planche du thème, écran profil ordinateur + téléphone, échiquier, icône du logo). Regarde-les.

Fais-le dans cet ordre, sur une nouvelle branche `theme/etabli` :

1. **Explore d'abord** : `index.css`, la config shadcn (`components.json`), `src/components/ui/*`, les écrans (accueil, profil, parties, analyse, entraînement, contact), l'en-tête, le pied de page, le bandeau de nouvelle version, l'échiquier et la façon dont le jeu de pièces est choisi. Fais-moi une liste courte de tout ce qui contient des couleurs, des polices, des rayons ou des ombres codés en dur (hex, rgb, classes Tailwind de couleur brute comme `bg-zinc-800`, valeurs Lichess). Montre-moi cette liste avant de modifier quoi que ce soit.
2. **Fondations** : copie les polices dans `public/fonts/` (avec les licences) et l'icône `reference/logo-icone-512.png` là où l'app range ses images si le logo n'y est pas déjà, intègre `etabli.css` (importé après `@import "tailwindcss"`), supprime les anciennes variables Lichess. Aucune requête vers Google Fonts ou un autre service tiers.
3. **Composants shadcn** (`src/components/ui`) : Button, Input, Textarea, Tabs, Table, Card, Badge, DropdownMenu, Checkbox, Progress… selon la section 4 de `THEME.md`. Ajoute les variantes manquantes plutôt que de styler au cas par cas dans les écrans.
4. **Écrans** : remplace toutes les couleurs codées en dur par des tokens. Applique les composants maison : en-tête (filet or, icône du logo, logotype Noto Sans avec « Your » en vert), tuile de statistique, badge de titre argent, étiquette de plateforme neutre, ligne de résultat (`1`/`0`/`½` + mot), barre de progression pleine, onglets à trait continu, bandeau de version.
5. **Échiquier** : cases et marques depuis les tokens, flèches `primary`/`loss`, simple filet, jeu de pièces par défaut **mpchess** (les autres jeux restent dans les réglages).
6. **Vérifications** :
   - `grep` : plus aucune couleur hex/rgb ni classe de couleur Tailwind brute dans `src/` hors `index.css` / `etabli.css`.
   - Contraste : le texte respecte WCAG AA (les paires de `THEME.md` sont déjà validées, ne les modifie pas).
   - Chiffres en Noto Sans Mono sur tous les classements, compteurs et dates.
   - Aucune barre ni onglet segmenté ; bordures d'encadrés discrètes, contours des champs nets.
   - Teste chaque écran en **français et en anglais**, sur ordinateur (1280 px) et téléphone (390 px) : rien ne déborde, aucun libellé tronqué sauf la colonne Ouverture.
   - Lance le build, les tests et le lint.
7. Fais des commits par étape (fondations, composants ui, écrans, échiquier), puis résume ce qui a changé et ce que tu n'as pas pu appliquer.

Contraintes : ne change pas le comportement ni les textes de l'app (sauf si une traduction déborde : signale-le). Pas de nouvelle dépendance sans me demander. Si un point de `THEME.md` est ambigu ou entre en conflit avec le code existant, demande-moi au lieu de deviner.
