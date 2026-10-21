# Thème « L'Établi » — spécification pour CraftYourChess

> Dense et sobre, graphite tiède, l'or du pion pour agir, Noto Sans comme le logotype. Tout est plein et net — barres, onglets, badges argent de l'artisan : la couleur reste à l'or.

Ce document décrit le thème à appliquer. Les valeurs sont toutes dans `etabli.css` ; ce fichier dit **où** et **comment** les utiliser. Les images de `reference/` montrent le résultat attendu (planche complète, écran profil ordinateur + téléphone, échiquier, icône du logo).

## 1. Règles générales (à respecter sur tout nouvel écran)

1. **Aucune couleur codée en dur** dans un composant : uniquement les utilitaires Tailwind issus des tokens (`bg-card`, `bg-field`, `text-muted-foreground`, `text-win`, `bg-title`…) ou `var(--cyc-*)`.
2. **Une seule couleur d'action : `primary`**, l'or du pion. Un seul bouton principal visible par écran.
3. **Surfaces par paliers** : `bg` (page) → `panel`/`card` (panneaux) → `field` (champs, tuiles, lignes paires) ou `raised` (menus, secondaire, survol). Les blocs se lisent par la différence de fond ; leurs bordures (`border`) sont **très discrètes**. Aucune ombre sur les panneaux.
4. **Seuls les contrôles gardent un contour net** : champs, cases à cocher, boutons secondaires en `border-strong` (≥ 3:1).
5. **`win` / `loss` / `title` sont des significations**, jamais de la décoration. `win`/`loss` toujours accompagnés d'un mot ou d'un signe (`Victoire`, `1` / `0` / `½`, `+14` / `−8`) — lisible pour les daltoniens.
6. **Tout est plein** : barres de progression continues, onglet actif souligné d'un trait continu. Aucun segment, aucun pointillé.
7. **Accent cyan (`highlight`) : une occurrence par écran au plus** — le bandeau « nouvelle version ».
8. **Chiffres en Noto Sans Mono** (`.num`) : classements, compteurs, cadences, dates. Milliers : espace fine insécable en FR (`1 748`, ` `), virgule en EN (`1,748`) — utiliser `Intl.NumberFormat`.
9. **Deux plateformes, jamais additionnées** : une carte par compte (côte à côte sur ordinateur, onglets sur téléphone). Étiquettes neutres « lichess.org » / « chess.com » (petit carré `Li` / `Cc` en `border-strong`), jamais leurs logos ni leurs couleurs.
10. **Le français est 20–30 % plus long** : aucun bouton ni onglet à largeur fixe ; seule la colonne « Ouverture » se tronque (`truncate` + `title` complet).
11. **Rayons** : 3 px contrôles (`rounded-sm`), 4 px panneaux (`rounded-lg`). Ombre seulement sur menus/dialogues (`shadow-pop`).

## 2. Palette et contraste

| Rôle | Token | Valeur | Remarque |
|---|---|---|---|
| Fond de page | `--cyc-bg` | `#121110` | |
| Panneaux | `--cyc-panel` | `#1c1a17` | |
| Champs, lignes alternées, tuiles | `--cyc-field` | `#24221e` | |
| Menus, boutons secondaires, survol | `--cyc-raised` | `#2d2a26` | |
| Bordures d'encadrés | `--cyc-border` | `#2a2724` | très discrète, décorative |
| Contour des contrôles | `--cyc-border-strong` | `#77716a` | ≥ 3:1 |
| Texte courant | `--cyc-text` | `#dcd8d2` | ≥ 4.5:1 |
| Texte atténué | `--cyc-text-muted` | `#a19b92` | ≥ 4.5:1 (aussi sur `raised`) |
| Texte mis en avant | `--cyc-text-strong` | `#f6f3ee` | ≥ 4.5:1 |
| Principal (or du pion) | `--cyc-primary` / `--cyc-on-primary` | `#e2a63c` / `#1d1303` | ≥ 4.5:1 |
| Victoires, progrès (vert de « Your ») | `--cyc-win` | `#8cc455` | ≥ 4.5:1 |
| Défaites, erreurs | `--cyc-loss` | `#f2796a` | ≥ 4.5:1 |
| Titres (argent) | `--cyc-title` / `--cyc-on-title` | `#d8d4cc` / `#1c1a17` | plaque pleine |
| Accent ponctuel (cyan) | `--cyc-accent` | `#66c9d8` | ≥ 3:1 |
| Séries Bullet → Corresp. | `--cyc-chart-1…5` | `#e2a63c` `#8cc455` `#c9a8f2` `#72aef0` `#ef8cab` | ≥ 3:1 |
| Cases claire / foncée / marque | `--cyc-square-*` | `#e6dcc6` `#a3865a` `#e2a63c` | |

Tous les textes passent 4.5:1 sur `bg`, `panel`, `field` et `raised`.

Note logo : les aplats du logo actuel (`#bf811d`, `#629924`, `#161512`, `#262421`) sont ceux de Lichess. Pour la cohérence, aligner à terme l'or et le vert du logo sur `#e2a63c` et `#8cc455`.

## 3. Typographie

Une seule famille, **Noto Sans** — celle du logotype — et **Noto Sans Mono** pour les chiffres.

| Usage | Police | Taille / interligne | Graisse | Remarques |
|---|---|---|---|---|
| Titre de page, pseudo du joueur | Noto Sans | 26 / 32 px | 700 | |
| Titre de panneau | Noto Sans | 16 / 22 px | 700 | |
| Texte courant, cellules | Noto Sans | 13.5 / 20 px | 400 | tableaux en 12.5 px |
| Libellés, en-têtes de colonnes | Noto Sans Mono | 11 / 14 px | 500 | bas de casse, `text-muted-foreground` (`.label-etabli`) |
| Classements dans les tuiles | Noto Sans Mono | 26 / 30 px | 600 | `.tile-value` |
| Compteurs, cadences, dates | Noto Sans Mono | 12 px | 400–600 | `.num` |
| Boutons | Noto Sans | 13 px | 600 | casse normale |
| Logotype dans l'en-tête | Noto Sans | 21 px | 700 | « Craft » et « Chess » en `text`, « Your » en `win` (`.wordmark`) |

Licences SIL OFL 1.1 dans `fonts/` ; fichiers latin + latin-ext (pseudos d'adversaires).

## 4. Composants (shadcn/ui)

- **En-tête** : `.header-etabli` (fond `card`, 56 px, **filet or de 2 px en haut**) ; à gauche l'icône du logo en 30 px (`reference/logo-icone-512.png`, posée telle quelle) puis le logotype `.wordmark` ; nav 13.5 px `text-muted-foreground`, actif `text-text-strong` sur `bg-raised` ; sélecteur EN / FR segmenté (bordure `border-strong`, actif `bg-raised`) ; réglages en bouton fantôme icône.
- **Button** : `default` = `bg-primary text-primary-foreground` + `.btn-ring` ; `secondary` = `bg-raised text-text-strong border border-border-strong` ; `ghost` = `text-primary hover:bg-primary/10`. Hauteur `h-control` (32 px), `rounded-sm`, `px-4`, icônes 16 px, 13 px / 600. `sm` = 28 px. Raccourci clavier facultatif en `.kbd` (ex. « A » sur « Analyser mes parties »).
- **Input / Textarea** : `bg-field border-input rounded-sm h-control` ; focus `border-primary ring-1 ring-primary` ; erreur `border-loss` + message `text-loss` 12 px qui dit quoi faire. Libellé au-dessus en `.label-etabli`. Préfixe possible (`lichess.org/@/`) en mono, séparé par un filet.
- **Tabs** : `.tabs-etabli` / `.tab-etabli` — filet bas discret, onglet actif `text-text-strong` avec **trait or continu de 2 px**. Compteurs en `.num text-[11px] text-muted-foreground`. Sur téléphone, défilement horizontal.
- **Table** (parties) : en-têtes `.label-etabli` hauteur 30 px ; lignes `h-row` (30 px), `even:bg-field`, `hover:bg-raised`, filet bas `border-border`. Résultat : petit carré bordé (`1` / `0` / `½`, mono) + mot, en `text-win` / `text-loss` / `text-muted-foreground`. Adversaire en `text-text-strong`, Elo en `.num text-muted-foreground` 12 px. Date alignée à droite.
- **Tuile de statistique** : `.tile-etabli` ; libellé `.label-etabli`, valeur `.tile-value`, ligne du bas « 412 parties » en `text-muted-foreground` 12 px à gauche, tendance `+14` / `−8` en `.num text-win` / `text-loss` à droite ; pastille carrée 8 px de la couleur de série en haut à droite ; classement provisoire : `?` en exposant atténué.
- **Badge de titre** : `.title-badge` — **plaque argent pleine**, texte mono foncé. GM, IM, FM, CM, WGM, NM, BOT. Infobulle avec le titre complet.
- **Barre de progression** : `.progress-etabli` (pleine, arrondie, `win` sur `field`) avec un enfant `data-fill` en `width: %`. Barre victoires / nulles / défaites : trois segments pleins `win`, `text-muted`, `loss` de 6 px.
- **Bandeau « nouvelle version »** : pleine largeur au-dessus de l'en-tête, fond `card`, **filet cyan de 2 px en haut**, point cyan 8 px, texte en gras + sous-titre atténué, bouton principal `sm` « Recharger », fantôme « Plus tard ». Sur téléphone : sans sous-titre, fermer en icône.
- **Panneaux / Card** : `.panel-etabli`, padding 24 px (16 px sur téléphone).
- **Graphique d'évolution** : une courbe par cadence, couleurs `chart-1…5` dans l'ordre, trait 2 px, grille `border`, axes 10 px mono `text-muted-foreground`.
- **Pied de page** : 12 px `text-muted-foreground`, lien code source en `primary`.
- **Formulaire de contact** : onglets (Idée / Bug / Autre), e-mail « (facultatif) », message, case à cocher (`border-strong`, cochée `bg-primary`), phrase de confidentialité 12 px atténuée, bouton principal à droite.

## 5. Échiquier

- Cases : `--cyc-square-light` / `--cyc-square-dark` (sable et bronze) ; dernier coup et case sélectionnée : `--cyc-square-mark` à 50 % d'opacité par-dessus la case.
- Flèche « bon coup » du moteur en `primary` (opacité ~0.85) ; flèche « coup joué / erreur » en `loss`.
- Coordonnées 9 px mono, couleur de la case opposée. Cadre : `.board-frame` (simple filet).
- **Jeu de pièces par défaut : mpchess** (déjà inclus dans l'app). Garder cburnett, merida et chessnut dans les réglages.

## 6. Ce qu'il ne faut pas faire

Pas de barres ou d'onglets segmentés, pas de bordures d'encadrés marquées, pas d'ombres sur les panneaux, pas de dégradés ni de glassmorphism, pas de coins arrondis au-delà de 4 px, pas plus d'un bouton principal par écran, pas de lilas ou d'autre couleur vive pour les titres, pas de couleurs Lichess / Chess.com, ne jamais recolorer ni redessiner le logo.
