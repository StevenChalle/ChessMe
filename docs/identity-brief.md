# Identité visuelle : brief pour Claude Design

> Document de travail, à supprimer une fois l'identité choisie et intégrée. Les choix finaux iront dans [design.md](design.md) et [decisions.md](decisions.md).

## 1. Comment s'y prendre

Claude Design (claude.ai/design) produit des maquettes sur un canevas, à partir d'une description et des fichiers que tu lui donnes. Tu affines ensuite en discutant, en commentant directement sur une maquette, ou en modifiant toi-même. Il peut aussi lire un dépôt de code pour en tirer un design system : couleurs, typographie, composants.

### À préparer

| Quoi                                                                                                                                                                                   | Pourquoi                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Le prompt de la partie 2                                                                                                                                                               | Le contexte, les envies, les contraintes                                                         |
| Des **captures d'écran** des pages principales, avec de vraies données (ton propre pseudo) : accueil, profil, liste des parties, analyse (filtres et résultats), entraînement, contact | Il voit les vrais écrans, leur densité et leur contenu, plutôt que d'inventer une app imaginaire |
| Une capture **sur téléphone** de deux ou trois de ces pages                                                                                                                            | L'app est une PWA, beaucoup l'utiliseront sur mobile                                             |
| `src/index.css`                                                                                                                                                                        | Les tokens actuels : la structure à respecter pour que je puisse brancher le résultat            |
| `docs/design.md`                                                                                                                                                                       | Les principes actuels, pour qu'il sache ce qu'il doit faire évoluer                              |
| Le lien du dépôt GitHub (https://github.com/StevenChalle/CraftYourChess), si l'interface le propose                                                                                    | Il peut lire les composants réels (shadcn/ui, Tailwind) et proposer des maquettes réalistes      |
| Optionnel : 3 à 5 captures de sites ou d'apps dont tu aimes l'ambiance, échecs ou pas                                                                                                  | Rien ne guide mieux qu'un « j'aime ça » concret                                                  |

### La démarche, en trois temps

1. **Explorer large.** Demande 4 directions très différentes, chacune sur une planche « charte » : palette, typographie, composants, échiquier et un écran clé. Toutes doivent montrer **le même écran** (le profil d'un joueur, par exemple) pour pouvoir les comparer côte à côte.
2. **Choisir, mélanger, approfondir.** Garde-en une ou deux, ou combine-les (« la palette de B avec la typographie de C »). Fais-la appliquer à 4 ou 5 vrais écrans, sur ordinateur et sur téléphone, avec les états difficiles : chargement, compte inexistant, erreur, tableau vide, analyse en cours.
3. **Formaliser.** Demande la palette finale sous forme de **variables CSS** qui reprennent les rôles des tokens existants (partie 2, « Livrables »). Exporte ensuite le résultat (HTML, ZIP, ou transmission à Claude Code) et ramène-le ici : je l'intègre dans `src/index.css` et les composants, puis je mets à jour `docs/design.md`.

### Pour en tirer le maximum

- **Commente sur le canevas** plutôt que de tout réexpliquer dans le chat : « trop chargé », « ce vert fait trop casino », « j'adore ces onglets ».
- **Juge sur de vrais contenus** : des tableaux de 30 parties, des noms de joueurs longs, le français (plus long que l'anglais). Une charte qui ne marche que sur une maquette vide ne sert à rien.
- **Regarde en petit et sur téléphone**, pas seulement en grand sur ordinateur.
- **Une chose à la fois.** L'identité visuelle d'abord. Les nouvelles fonctionnalités et la réorganisation des pages pourront venir plus tard, sinon tout se mélange.
- **Laisse le logo à part** (il est exploré de son côté avec [logo-prompt.md](logo-prompt.md)). Demande seulement un emplacement prévu pour lui dans l'en-tête, et éventuellement comment chaque direction pourrait l'inspirer.
- **Garde une trace** : quand une direction te plaît, demande-lui d'en résumer les règles en quelques lignes. Ça m'aidera à les appliquer fidèlement.

## 2. Le prompt à coller

---

Je veux explorer plusieurs **identités visuelles** pour mon application web, CraftYourChess, comme autant de chartes graphiques possibles. Je m'en servirai ensuite pour faire évoluer le design de l'app. Sois audacieux sur les directions, mais garde-les réalistes pour un vrai outil utilisé tous les jours.

### Le produit

**CraftYourChess** (https://craftyourchess.com) est une application web gratuite et open source pour **progresser aux échecs à partir de ses propres parties**. On saisit son pseudo Lichess et/ou Chess.com. L'app réunit les parties des deux sites, les analyse avec le moteur Stockfish directement dans le navigateur, retrouve les erreurs qui coûtent vraiment des points et les fait rejouer comme exercices. À terme : un plan d'entraînement personnel, construit et ajusté à partir de ses données, qui mesure si l'on progresse.

Sa philosophie :

- **Tes parties, tes erreurs, ton jeu.** Un entraînement sur mesure, pas des puzzles ni des leçons génériques.
- **Honnête et respectueux** : sans compte, sans publicité, sans traçage, tout reste dans le navigateur. Chaque recommandation est accompagnée de ses preuves.
- **Simple et rapide** : peu de fonctionnalités, toutes utiles. Un outil, pas un réseau social ni un jeu.
- **Fait par une seule personne, avec passion**, développeur et joueur d'échecs débutant.

Le nom : « Craft your chess », **façonner son propre jeu** comme un artisan façonne une pièce : patiemment, à la main, en corrigeant ses erreurs. Une progression personnelle et méritée.

Public : joueurs de club et en ligne, du débutant à l'amateur confirmé, qui prennent leur progression au sérieux tout en jouant pour le plaisir.

### Où en est le design aujourd'hui

L'app copie volontairement le **thème sombre de Lichess** (voir les captures et `index.css`) :

- **Ce que j'aime** : sombre et reposant, lisible, dense en information sans être chargé, l'impression d'un outil propre et sérieux, l'échiquier et les données au centre.
- **Ce qui ne va pas** : c'est **un peu froid**, et surtout **trop proche de Lichess**. L'app n'a pas d'identité propre : on dirait une page de Lichess.

Je cherche donc une identité **à elle**, plus chaleureuse et avec plus de caractère, qui garde les qualités d'un bon outil : lisibilité, densité, sobriété, calme.

### Les écrans de l'app

- **Accueil** : un champ pour un pseudo Lichess, un autre pour un pseudo Chess.com, les recherches récentes.
- **Profil d'un joueur** : les deux comptes côte à côte, classements par cadence (bullet, blitz, rapide, classique…), compteurs de parties, titres (GM, IM…). Les classements des deux plateformes ne s'additionnent jamais, ils restent séparés.
- **Parties** : un tableau paginé des parties des deux plateformes (adversaire, résultat, cadence, ouverture, date).
- **Analyse** : des filtres (cadence, nombre de parties…), une progression pendant que le moteur travaille, puis la liste des erreurs trouvées, classées par thème (pièce laissée en prise, mat raté, avantage gâché…).
- **Entraînement** : un échiquier où l'on rejoue la position de son erreur pour trouver le bon coup, un retour du moteur sur le coup joué, une progression (« erreur 3 / 12 »).
- **Contact** : un texte de présentation, un formulaire de retours.
- Éléments transverses : en-tête avec le nom de l'app et un emplacement pour le logo (le logo est exploré à part, ne le dessine pas), sélecteur de langue EN / FR, menu de réglages, bandeau « nouvelle version disponible », pied de page avec le lien vers le code source.

### Ce que je te demande

**4 directions d'identité visuelle bien distinctes**, plus éventuellement une 5e totalement inattendue. Quelques pistes, libre à toi d'en proposer d'autres :

- **L'atelier** : bois, établi, matières naturelles, le côté artisan du nom.
- **Le carnet du joueur** : un carnet de notes ou de coach, l'encre, le papier, les annotations de parties.
- **Le club** : l'ambiance d'un club d'échecs, feutre, laiton, bois sombre, mais en moderne.
- **L'outil chaleureux** : une version personnelle de ce qui marche aujourd'hui, dense et sobre, mais réchauffée et reconnaissable au premier coup d'œil.

Pour chaque direction, une planche avec :

1. **Un nom et une intention** en deux phrases.
2. **La palette**, avec le rôle de chaque couleur (voir « Contraintes »).
3. **La typographie** : titres, texte courant, chiffres.
4. **Les composants clés** : boutons (principal, secondaire, fantôme), champ de saisie, onglets, ligne de tableau, tuile de statistique, badge de titre (GM), bandeau, formulaire.
5. **L'échiquier** : couleurs des cases et jeu de pièces (voir « Contraintes »).
6. **Le même écran clé dans les 4 directions** : le profil d'un joueur, sur ordinateur et sur téléphone.

Commence par ces planches. Je choisirai ensuite une direction (ou un mélange) à appliquer à tous les écrans.

### Contraintes

- **Thème sombre d'abord.** Un thème clair pourra venir plus tard : montre-le en option si la direction s'y prête.
- **Des couleurs qui ont un sens, et rares** : une couleur principale pour les actions et les liens, une pour les victoires et les progrès, une pour les défaites et les erreurs, une pour les titres (GM, IM…), un accent ponctuel, et 5 couleurs distinctes pour les séries de graphiques. Le reste en neutres.
- **Lisibilité** : contraste suffisant (WCAG AA) pour le texte, chiffres tabulaires (alignés) pour les classements et les compteurs, des tableaux denses qui restent lisibles.
- **Typographie** : uniquement des polices sous licence libre (SIL Open Font License), car elles seront hébergées avec l'app, sans appel à Google Fonts (pas de service tiers, pour la vie privée). Elles doivent couvrir les accents français.
- **Échiquier** : les cases peuvent prendre n'importe quelles couleurs, mais les pièces doivent rester parmi les jeux libres déjà inclus : cburnett (celles de Lichess par défaut), merida, chessnut, mpchess. Ne dessine pas de nouveau jeu de pièces.
- **Bilingue** : l'interface existe en anglais et en français, et le français est souvent 20 à 30 % plus long. Les maquettes doivent supporter les deux.
- **Stack** : React, Tailwind CSS v4 et composants shadcn/ui (Radix). Tout passe par des tokens : aucune couleur codée en dur dans les composants. Les rayons, ombres et bordures sont aussi des choix d'identité.
- **Pas de ressemblance** avec les identités de Lichess ou de Chess.com.
- **À éviter** : le look casino ou jeu vidéo, les dégradés néon, le glassmorphism, les ombres lourdes, l'arrondi « app grand public », le kitsch médiéval.

### Livrables, une fois la direction choisie

- La palette sous forme de **variables CSS**, pour les rôles : fond de page, panneaux, champs et lignes alternées de tableau, menus et boutons secondaires, bordures, texte courant, texte atténué, texte mis en avant, principal, victoire et progrès, défaite et erreur, titres, accent ponctuel, 5 couleurs de graphiques, couleurs des cases de l'échiquier.
- La typographie (polices, tailles, graisses), les rayons, les bordures et les ombres.
- Les règles de la direction en quelques lignes, pour pouvoir l'appliquer à de nouveaux écrans.

---
