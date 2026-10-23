# Analyse de fond des comptes principaux : conception

Quand le joueur a choisi ses comptes principaux, l'app récupère et analyse elle-même ses N dernières parties, sur n'importe quelle page, tant que Stockfish ne sert pas à autre chose. Ses analyses et ses entraînements deviennent alors instantanés. Décision résumée dans [decisions.md](decisions.md) (2026-10-23).

État : implémenté le 2026-10-23 (`features/background/`, `lib/activity.ts`). S'appuie sur le [magasin des parties](game-store.md) et le [cache des analyses](analysis-cache.md).

## Ce que le joueur choisit (réglages)

- **Ses comptes principaux** : un pseudo Lichess, un pseudo Chess.com, ou les deux. Vérifiés à l'enregistrement (un compte inexistant est refusé).
- **Combien de parties suivre** : 50, 200, 500 ou 1000, **les N dernières toutes plateformes confondues** (comme la recherche « N dernières parties »). Par défaut 500 sur ordinateur, 50 sur téléphone. Chaque option affiche une estimation du calcul pour cet appareil (`estimate.ts`).
- **Analyse approfondie** (cochée par défaut) : une fois la première analyse de toutes les parties finie, évaluer chaque position à 1 M de nœuds, pas seulement autour des coups suspects. Les positions déjà profondes sont sautées, une position commune à plusieurs parties n'est calculée qu'une fois. L'estimation de chaque option compte alors cette passe (environ 6 fois plus long).
- Enregistré dans le `localStorage` (`craftyourchess:main-profile`), déclaré sur `/legal`, effacé par `clearLocalData()`.

Sans comptes principaux, rien ne tourne : choisir ses comptes vaut consentement.

## Ce que fait l'app

Une boucle, lancée au chargement de n'importe quelle page :

1. **Synchroniser** : les N dernières parties des comptes principaux par le magasin des parties (`findGames` avec le magasin), donc seulement les nouvelles après la première fois.
2. **Analyser** celles qui ne le sont pas encore, de la plus récente à la plus ancienne, par lots de 5 parties (la barre avance aussi pendant un lot) (`analyzeGames`, mêmes deux passes, critères enregistrés du joueur). Une partie compte comme analysée quand le cache des analyses a son entrée `games` avec la version d'analyse et le moteur actuels : un changement de moteur ou d'`ANALYSIS_VERSION` relance donc naturellement l'analyse des N parties.
3. **Approfondir** (option cochée) : les positions de ces parties encore évaluées rapidement, de la partie la plus récente à la plus ancienne, par lots de 2 parties (`deepenPositions`).
4. **À jour** : attendre, puis recommencer toutes les 10 minutes et quand la page redevient visible (une nouvelle partie jouée entre-temps).

**La fenêtre glisse** : chaque nouvelle partie y entre, la plus ancienne en sort. Elle reste dans le magasin et le cache, mais n'est plus suivie. Les parties gardées s'accumulent donc (500 suivies, peut-être 3 000 enregistrées après des mois, environ 20 Ko chacune avec ses analyses) : les réglages montrent ce total pour les comptes principaux, avec l'avancement des dernières (« 1 027 parties enregistrées · dernières 235 / 500 analysées »). Une partie plus ancienne que le joueur cherche à la main est gardée comme toute autre, jamais mise à jour automatiquement. Les comptes principaux ne sont jamais évincés du magasin des parties.

## Priorité au joueur

Le travail de fond **cède la place** dès que le joueur a besoin de Stockfish ou des plateformes :

- une analyse ou « Approfondir » ;
- un entraînement, **tant que son moteur existe** (de la première position jusqu'à la fermeture de l'onglet) : il doit répondre tout de suite à chaque coup ;
- une recherche de parties (Lichess ou Chess.com), y compris l'onglet Parties.

Mécanique, dans `lib/activity.ts` : chaque usage du joueur s'annonce (`beginActivity`) et se termine. Le travail de fond, lui, ne s'annonce pas : à la première activité, il **abandonne** ce qu'il fait (signal d'arrêt), et repart quelques secondes après la dernière. Rien n'est perdu : les positions évaluées sont dans le cache, les parties reçues dans le magasin. Repartir coûte le démarrage des moteurs (une seconde ou deux).

Les exports Lichess et les archives Chess.com s'annoncent dans leurs clients (`lib/lichess/client.ts`, `lib/chesscom/client.ts`), sauf ceux du travail de fond : la règle « une seule requête Lichess à la fois » tient, puisque le fond lâche sa requête dès qu'une autre commence.

## Plusieurs onglets

- **Un seul onglet fait le travail de fond** : il tient un verrou (`navigator.locks`, `craftyourchess:background`). Les autres attendent qu'il se libère.
- **L'onglet qu'on regarde travaille.** L'onglet qui travaille donne signe de vie toutes les 5 s (`BroadcastChannel`, rien n'est stocké), avec son avancement et s'il est affiché. Un onglet affiché qui attend reprend le verrou (`steal`) si l'onglet qui travaille est caché ou muet depuis 15 s. C'est indispensable : Chrome gèle un onglet caché qui use le processeur, et un onglet gelé garde son verrou sans rien faire (constaté le 2026-10-23, tous les autres onglets attendaient). L'onglet dépossédé s'arrête et se remet à attendre.
- **Les onglets qui attendent montrent l'avancement** de celui qui travaille (« En cours dans un autre onglet : 165 / 500 »).
- Une demande de verrou annulée juste après avoir été faite peut arriver trop tard au navigateur et rester en file : une fois accordée, elle est rendue aussitôt (sinon l'onglet se volerait le verrou à lui-même toutes les 15 s).
- **Les activités du joueur se voient d'un onglet à l'autre** : chacune tient aussi un verrou partagé (`craftyourchess:foreground`), que l'onglet du fond consulte toutes les deux secondes. Un verrou se libère tout seul quand son onglet se ferme.
- Sans `navigator.locks` (navigateurs anciens) : chaque onglet ne voit que ses propres activités.
- Choisir ou retirer ses comptes dans un onglet est suivi par les autres (événement `storage`) : leur travail de fond démarre ou s'arrête aussitôt.

## Ce qu'on voit

Un indicateur dans l'en-tête, à côté de la roue dentée, seulement quand des comptes principaux sont choisis : une icône et « 120 / 500 ». Au clic : l'état en clair (« Analyse de vos parties : 120 / 500 », « En pause : Stockfish est utilisé ailleurs », « À jour », « Lichess demande d'attendre une minute »), un bouton **Pause / Reprendre** (pour la session), et un lien vers les réglages.

## Les limites

- **Onglet ouvert seulement.** Rien ne tourne app fermée. Un onglet caché est gelé sur téléphone ; sur ordinateur, le travail continue.
- **Le calcul est long** : environ 15 s par partie avec tous les moteurs sur un ordinateur, 3 à 5 fois plus sur téléphone. 500 parties ≈ 2 h la première fois, puis quelques secondes par nouvelle partie.
- **Limite de débit** : sur un 429, la synchro attend 60 s ; l'analyse des parties déjà là continue.

## Tests

- Les activités : début, fin, abandon du fond, reprise après la dernière.
- La boucle (moteurs et plateformes simulés) : ne réanalyse pas une partie à jour, s'arrête dès qu'une activité commence, reprend ensuite, attend après un 429.
- Les réglages : lecture, valeurs par défaut selon l'appareil, effacement.

## Plus tard

- Montrer le résultat du travail de fond : sur son propre profil, les N dernières parties déjà analysées, puis des courbes d'évolution (erreurs par phase et par thème, mois après mois).
- Un nombre de moteurs plus discret pour le fond, au choix.
