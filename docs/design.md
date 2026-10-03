# Design

## Intention

On s'inspire du **thème sombre de Lichess** : moderne, épuré, dense en information sans être chargé. L'échiquier et les données sont au centre, et l'interface s'efface autour.

Principes :

- **Fond chaud et sombre** (et non un gris neutre) : le `#161512` de Lichess, avec un léger dégradé brun en haut de page.
- **Surfaces en aplats** : des panneaux `bg-card` légèrement plus clairs que le fond, presque sans ombre ni bordure.
- **Texte gris clair, jamais blanc pur** : `#bababa` pour le corps, `#ddd` pour les titres et les chiffres importants.
- **Couleurs rares et porteuses de sens** : bleu pour les actions et les liens, vert pour les victoires et les progrès, rouge pour les défaites, or pour les titres (GM, IM…).
- **Rayons de bordure faibles** (4 px) : un style sobre, plutôt qu'arrondi « app grand public ».
- **Chiffres tabulaires** (`tabular-nums`) pour les classements et les compteurs.
- Police : **Noto Sans**, comme Lichess.
- Plateau : **brun avec les pièces cburnett**, le réglage par défaut de Lichess.

## Tokens

Tous définis dans [`src/index.css`](../src/index.css). La palette brute de Lichess est dans les variables `--lc-*`, et les tokens sémantiques de shadcn pointent dessus.

| Token Tailwind                            | Valeur                         | Usage                                           |
| ----------------------------------------- | ------------------------------ | ----------------------------------------------- |
| `bg-background`                           | `#161512`                      | fond de page                                    |
| `bg-card`                                 | `#262421`                      | panneaux, tuiles de stats                       |
| `bg-muted` / `bg-zebra`                   | `#2b2926`                      | champs de saisie, lignes alternées des tableaux |
| `bg-popover` / `bg-secondary`             | `#3c3934`                      | menus, popups, boutons secondaires              |
| `border-border`                           | `#404040`                      | séparateurs                                     |
| `text-foreground`                         | `#bababa`                      | texte courant                                   |
| `text-muted-foreground` / `text-font-dim` | `#999`                         | libellés, métadonnées                           |
| `text-font-clear`                         | `#ddd`                         | titres, valeurs mises en avant                  |
| `bg-primary` / `text-primary`             | `#3692e7`                      | actions, liens, focus                           |
| `text-good`                               | `#629924`                      | victoire, progression                           |
| `text-bad` / `destructive`                | `#cc3333`                      | défaite, erreur                                 |
| `text-brag`                               | `#bf811d`                      | titres FIDE et Lichess                          |
| `text-highlight`                          | `#d85000`                      | accent ponctuel (orange Lichess)                |
| `chart-1…5`                               | bleu, vert, orange, or, violet | séries de graphiques                            |

Règle : **pas de code hexadécimal dans les composants**. Pour une nouvelle couleur, ajouter un token.

## Thème clair

Il n'est pas prévu pour l'instant. Le jour où on le voudra, il suffira de redéfinir les variables `--lc-*` sous un sélecteur (`.light` ou `[data-theme]`), puisque les composants n'utilisent que les tokens.
