# Journal des décisions

Chaque décision structurante est notée ici, avec sa raison et les alternatives écartées. On la révise quand le contexte change : ajouter une entrée datée plutôt que réécrire l'historique.

---

## 2026-10-04 : choix fondateurs

### Architecture : local-first, 100 % navigateur, sans backend

L'API Lichess est publique, ne demande pas d'authentification et accepte les appels directs depuis le navigateur (CORS). Le navigateur importe donc tout l'historique une fois, en flux NDJSON, le stocke dans IndexedDB, puis fait une synchro incrémentale (`since`).

- **Pour** : gratuit, pas de serveur à maintenir, pas de données personnelles stockées côté serveur (donc pas de RGPD), tout est instantané une fois l'import fait.
- **Contre** : les données restent dans un seul navigateur (il faut réimporter sur chaque appareil), et le navigateur peut effacer IndexedDB (à limiter avec `navigator.storage.persist()`).
- **On réévaluera** si on ajoute des comptes, une synchro entre appareils, Chess.com à grande échelle ou des analyses lourdes. Piste : Hono + SQLite/Postgres.

### Framework : React (plutôt que Svelte)

Écosystème plus large, shadcn et TanStack pensés d'abord pour React, acquis réutilisable ailleurs. SvelteKit était plus léger mais avec un écosystème plus petit. chessground n'étant lié à aucun framework, ce point n'a pas pesé dans le choix.

### Stack

| Rôle              | Choix                                                  | Alternatives écartées                                                                         |
| ----------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Build             | Vite                                                   | —                                                                                             |
| Routing           | TanStack Router (routes sous forme de fichiers)        | React Router : moins typé                                                                     |
| Données distantes | TanStack Query                                         | —                                                                                             |
| UI                | Tailwind v4 + shadcn/ui (Radix, preset Nova, Lucide)   | —                                                                                             |
| Échiquier         | `@lichess-org/chessground`                             | `chessground` (ancien nom, abandonné sur npm), react-chessboard                               |
| Règles / PGN      | chessops                                               | chess.js : moins bien intégré à chessground, PGN annoté moins complet                         |
| Stockage local    | Dexie                                                  | idb : plus bas niveau                                                                         |
| Graphiques        | ECharts                                                | Observable Plot : plus statique, alors qu'on veut zoom, infobulles et brush sur la courbe Elo |
| Stats lourdes     | **reporté** (DuckDB-WASM si besoin)                    | Pèse plusieurs Mo, alors que de simples calculs JS suffisent jusqu'à environ 50 000 parties   |
| Moteur            | Stockfish WASM lite mono-thread, plusieurs Web Workers | APIs tierces : fragiles et limitées                                                           |
| Tests             | Vitest + Testing Library + fake-indexeddb              | —                                                                                             |
| Qualité           | oxlint (fourni par le template Vite) + Prettier        | ESLint : plus lent, rien de plus pour nos besoins                                             |
| Paquets           | pnpm                                                   | —                                                                                             |

**Licence** : chessground et chessops sont sous GPL-3, le projet doit donc rester open source. Pour un produit commercial au code fermé, il faudrait passer à react-chessboard et chess.js.

### Bureau et mobile : PWA (plutôt qu'Electron)

Le but est de pouvoir épingler l'application sur le bureau du PC ou l'écran d'accueil du téléphone.

- **PWA** (vite-plugin-pwa) : installable depuis Chrome ou Edge sur Windows (fenêtre dédiée, icône dans la barre des tâches et le menu Démarrer), et depuis Android et iOS (écran d'accueil). Une seule base de code, aucun magasin d'applications, mises à jour automatiques. Elle fonctionne hors ligne une fois les parties importées, ce qui va très bien avec le local-first.
- **Electron, écarté** : plus de 100 Mo par installation, aucune version mobile, et aucun gain tant qu'on n'a pas besoin d'API système.
- **Plan B : Tauri v2**, si un jour on a besoin du natif (système de fichiers, Stockfish natif plus rapide que le WASM, distribution dans les magasins d'applications). Tauri enveloppe la même application Vite et cible le bureau et le mobile. La stack actuelle n'aurait rien à changer.

Limite connue : sur iOS, le stockage d'une PWA peut être effacé si l'application n'est pas utilisée pendant plusieurs semaines. Ce n'est pas grave, car les parties se réimportent depuis Lichess.

### Hébergement : Render (site statique)

Site en ligne : https://chessme-k8py.onrender.com/. La configuration est versionnée dans [`render.yaml`](../render.yaml) (un Blueprint Render) :

- branche `main`, avec `autoDeployTrigger: checksPass` : chaque push sur `main` redéploie le site, **mais seulement une fois la CI GitHub verte** ;
- build : `corepack pnpm install --frozen-lockfile && corepack pnpm build`. corepack utilise le pnpm épinglé dans `packageManager`, et Node 24 est fixé par `.node-version` ;
- dossier publié : `dist`, avec une réécriture `/* → /index.html` pour le routing côté client (les fichiers existants sont servis tels quels) ;
- en-têtes : cache permanent pour `/assets/*` (noms de fichiers hachés), `no-cache` pour `sw.js` et `index.html` afin que les PWA installées reçoivent les mises à jour, plus `nosniff` et `Referrer-Policy`.

Pour Stockfish multi-thread, il faudra ajouter dans `render.yaml` (et dans `server.headers` de Vite) les en-têtes `Cross-Origin-Opener-Policy: same-origin` et `Cross-Origin-Embedder-Policy: credentialless`.

Workflow git : on développe sur `develop`, et un merge sur `main` met le site en ligne.

### Design : thème sombre de Lichess

Voir [design.md](design.md).

---

## 2026-10-04 : profil croisé Lichess + Chess.com

- **Même pseudo sur les deux plateformes**, recherché en parallèle (Lichess et Chess.com sont deux hôtes différents, la règle « une requête à la fois » s'applique par API). Chaque source est indépendante : un compte absent (404), fermé ou en erreur d'un côté ne casse pas l'autre. Les fonctions de requête renvoient `null` pour « pas de compte », ce n'est pas une erreur.
- **Limite connue** : un même pseudo peut appartenir à deux personnes différentes. Exemple : `alireza2003` est le GM sur Lichess, mais sur Chess.com c'est un compte avec 1 partie jouée en 2012. **Piste** : permettre de saisir un pseudo différent par plateforme et associer manuellement les comptes.
- **Couche de normalisation** (`src/features/player/summary.ts`) : chaque source est convertie en un `AccountSummary` commun, testé unitairement. Les vues combinées ne lisent que ce format.
- **Ce qu'on additionne** : uniquement les données de même nature, c'est-à-dire les compteurs de parties, le bilan victoires/nulles/défaites et les dates (ancienneté, dernière activité). **Ce qu'on n'additionne jamais** : les Elo. Les deux systèmes de classement ne sont pas comparables, on affiche donc l'Elo courant des deux sites côte à côte, sans conversion.
- Les comptes fermés sont affichés (« Compte fermé ») mais exclus des totaux.
- **Navigation** : trois onglets, sous forme de routes imbriquées, donc chaque onglet a sa propre URL partageable (remplacé le même jour, voir ci-dessous).
- Couleurs d'identité : bleu pour Lichess, vert pour Chess.com (tokens `bg-lichess` et `bg-chesscom`).

---

## 2026-10-04 : un pseudo par plateforme

Remplace l'hypothèse du « même pseudo partout ».

- **URL** : `/player?lichess=<pseudo>&chesscom=<pseudo>`, avec les onglets `/player/lichess` et `/player/chesscom`. Chaque paramètre est facultatif, il en faut au moins un. Les liens des onglets conservent les paramètres (`search: true`).
- **Pourquoi des paramètres d'URL plutôt que des segments de chemin** : un compte peut manquer d'un côté, et l'ordre des comptes n'a pas de sens. L'URL reste partageable et se met en favori.
- **Formulaire** : un champ par plateforme, avec un raccourci « Même pseudo ». Sur l'accueil, un seul bouton, sur le champ Chess.com, recopie le pseudo Lichess (un second bouton sur le champ Lichess a été essayé puis retiré : il encombrait le formulaire). Dans l'en-tête, un seul bouton placé entre les champs recopie depuis le dernier champ modifié, et sa flèche (→ ou ←) indique le sens (`copySource` dans `search.ts`). La version complète est sur l'accueil ; une version compacte dans l'en-tête, pré-remplie avec les comptes affichés, permet de modifier le lien depuis le profil.
- Une plateforme sans pseudo est « non liée » : pas de requête (`skipToken`), pas d'onglet, une carte « Aucun compte lié » sur la vue d'ensemble, pas de colonne dans le tableau des Elo.
- Les paramètres d'URL sont validés dans `features/player/search.ts`. TanStack Router lit les valeurs comme du JSON, donc un pseudo numérique arrive sous forme de nombre : on le reconvertit en texte.
- L'ancienne route `/player/$username` est supprimée, sans redirection, puisque rien n'a encore été déployé.

---

## 2026-10-04 : internationalisation anglais / français

- **Paraglide JS 2** (inlang), plutôt que react-i18next ou Lingui. Les messages sont compilés en fonctions typées : une clé inexistante est une erreur TypeScript, et chaque page n'embarque que les messages qu'elle utilise. L'intégration se fait par un simple plugin Vite (Lingui demande un plugin Babel ou SWC).
- **Langue initiale = langue du navigateur.** Stratégie Paraglide : `localStorage` (le choix de l'utilisateur), puis `preferredLanguage` (langue du navigateur si elle est prise en charge), puis `baseLocale` (anglais). Un essai « anglais pour tout le monde » a été fait puis abandonné : la détection est plus naturelle.
- **Changer de langue recharge la page**, comme le recommande Paraglide : pas d'état de langue réactif dans React, et tout est cohérent après le rechargement (`<html lang>`, formats `Intl`). Contrepartie : les données Lichess et Chess.com sont redemandées, ce qui est acceptable pour une action rare.
- Les traductions sont dans `messages/{en,fr}.json`. `src/paraglide/` est généré et git-ignoré. `pnpm typecheck` lance `pnpm i18n` pour que `tsc` trouve les types en CI et sur Render.
- **Dépendance réseau au build** : Paraglide télécharge son plugin de format de messages depuis jsDelivr (`project.inlang/settings.json`) et le met en cache dans `project.inlang/cache` (git-ignoré). Un build sans réseau, et sans ce cache, échoue.
- Formats (`lib/format.ts`) : les objets `Intl` suivent la langue courante et sont mis en cache par langue. Les listes « a ou b » passent par `Intl.ListFormat`, les guillemets par un message (`“…”` en anglais, `« … »` en français).
- Le manifeste PWA et la balise meta description sont en anglais. `<html lang>` est mis à jour au démarrage.

---

## 2026-10-04 : recherches récentes

- L'accueil affiche les **3 dernières recherches**. Un clic rouvre le profil, et une croix retire une entrée. Jusqu'à 10 recherches sont conservées, pour pouvoir afficher plus tard une liste plus longue.
- **Stockage : `localStorage`** (`chessme:recent-searches`), et non Dexie. C'est une petite préférence propre à chaque navigateur, lue sans délai, donc pas d'état de chargement ni de clignotement sur l'accueil. Dexie reste réservé aux données volumineuses (parties importées). Le code tolère un stockage absent ou corrompu, et les onglets restent synchronisés grâce à l'événement `storage`.
- **Enregistrement depuis la page profil, une fois au moins un compte trouvé.** On ne garde que les comptes trouvés, avec la casse officielle du pseudo : une faute de frappe n'est jamais enregistrée, et une paire avec un mauvais pseudo Chess.com est mémorisée sans lui. Les visites par lien ou favori comptent aussi.
- Les doublons sont détectés sans tenir compte de la casse, sur la paire (Lichess, Chess.com). Une recherche répétée remonte en tête de liste.

---

## 2026-10-04 : analyse des 10 dernières parties (Stockfish WASM)

Un bouton sur le profil ouvre une modale : récupération des 10 dernières parties classées (Lichess et Chess.com confondus), analyse, puis une table avec le nombre d'erreurs du joueur par partie. Code : `src/features/review/` et `src/lib/engine/`.

### Notion d'erreur

Définie dans `src/features/review/errors.ts` (`isError`, `ERROR_MIN_DROP`, testée). **Toute évolution de cette règle doit être reportée ici.**

**Révisée le 2026-10-04** : d'abord « perte ≥ 1 pion, sauf partie décidée (au-delà de ±4 du même côté) ». Cette clause créait une marche brutale à ±4 (à +4,1, un coup qui restait à +4 passait quelle que soit la perte). On raisonne désormais en **chances de gain**, comme Lichess.

Pour chaque coup du joueur, évaluations avant et après, de son point de vue, converties en chances de gain :

```
gain%(cp) = 50 + 50 × (2 / (1 + e^(−0,00368208 × cp)) − 1)     (modèle de Lichess)
perte = gain%(avant) − gain%(après)
erreur ⇔ perte ≥ 10 points
```

- **10 points** ≈ 1,1 pion depuis l'équilibre (0 → −1,2), mais bien plus en position décidée : de +6 à +4,5 (−6 points) ou de −5 à −8, ce n'est pas une erreur, car l'issue ne change guère. La tolérance grandit progressivement, sans marche.
- **Mats** : un mat vaut ±10 000 cp, soit 100 % ou 0 %. Rater un mat en restant écrasant (+9) n'est pas une erreur ; le rater en retombant à +3, si.
- **Positions finales** (mat, pat, matériel insuffisant) : évaluées exactement par chessops, sans moteur.
- Un seul niveau (« erreur ») : pas de distinction imprécision / erreur / gaffe. Pour mémoire, Lichess compte une imprécision à 10 points, une erreur à 20, une gaffe à 30. Les flags `judgment` de Lichess sont **ignorés** : seul notre seuil compte, pour que les deux plateformes soient comptées pareil.
- La passe profonde de l'analyse réexamine les coups qui perdent au moins **6 points** en passe rapide (`DEEP_CHECK_MIN_DROP`, marge sous le seuil).

### Moteur

- **Stockfish 19 lite, mono-thread** (paquet npm `stockfish`, GPL-3, environ 1,8 Mo) : pas de `SharedArrayBuffer`, donc **pas d'en-têtes COOP/COEP** et rien ne casse côté hébergement. Le plugin `stockfishEngine` de `vite.config.ts` sert `node_modules/stockfish/bin/` sous `/engine/` en dev et le copie dans `dist/engine/` au build. Hors du précache PWA : téléchargé au premier usage puis mis en cache (CacheFirst).
- **Parallélisme : plusieurs moteurs mono-thread** (`hardwareConcurrency − 1`, entre 1 et 4), un par Web Worker, chacun sur des parties entières. Pour une analyse en lot, c'est plus rapide qu'un moteur multi-thread, et sans contrainte d'en-têtes. Le multi-thread reste une piste pour un futur plateau d'analyse en direct.
- **Deux passes, budget en nœuds** (pas en temps, pour un résultat identique sur tous les appareils) : 100 000 nœuds sur chaque position sans évaluation, puis 1 000 000 nœuds sur les positions autour des coups du joueur qui perdent au moins 6 points de chances de gain en première passe (marge sous le seuil d'erreur de 10).
- **Évaluations Lichess réutilisées** quand la partie a été analysée par Lichess : pas de moteur pour ces positions.
- `pnpm` 11 bloque le `postinstall` du paquet (il crée seulement des alias `stockfish.js`) : refusé dans `pnpm-workspace.yaml`.

### Périmètre et comportement

- **Deux boutons sur le profil** : « Analyser les 10 dernières parties » et « Analyser la dernière partie ». Même modale, même pipeline, paramétré par le nombre de parties (`count`, 10 ou 1) : la table n'a alors qu'une ligne, et l'entraînement ne porte que sur cette partie.

- Parties **classées, variante standard** (Chess960 et variantes exclus), toutes cadences, y compris les parties très courtes. Les parties Lichess annulées (`aborted`, `noStart`) sont exclues : elles n'ont pas été jouées.
- On prend les 10 plus récentes de chaque plateforme, puis les 10 plus récentes au total (date de fin de partie). Chess.com : archives mensuelles parcourues à rebours, en série, jusqu'à 10 parties.
- **Aucune persistance** pour l'instant (ni Dexie ni cache) : tout est recalculé à chaque ouverture, pour éprouver le système. **Fermer la modale annule tout** (requêtes et Workers).
- Si une plateforme échoue, la table s'affiche avec l'autre, et un message signale l'échec.
- **Étapes affichées dès le départ** (`ReviewSteps`) : récupération, analyse rapide, vérification approfondie, chacune avec une phrase d'explication. Les étapes terminées sont cochées avec un résumé (« 10 parties », « 908 positions »), l'étape en cours a sa barre, les suivantes sont grisées. Voir ce qui reste à faire rend l'attente plus supportable. Le démarrage du moteur, d'abord une étape à part, est fondu dans l'analyse rapide : il ne dure qu'un instant et n'apprend rien à l'utilisateur.
- **Chrono discret** en bas de la modale : temps écoulé depuis l'ouverture, figé à la fin pour garder la durée totale sous les résultats.
- **Progression par étape** : une barre par passe, égale à « positions évaluées / positions à évaluer » dans cette passe. Les deux totaux sont exacts (celui de la passe profonde est connu à la fin de la passe rapide), donc la barre ne recule jamais : elle repart de zéro à chaque étape. Une première version estimait la passe profonde à l'avance (5 % des positions) sur une barre unique, qui reculait brutalement quand le vrai total tombait.
- Temps restant **de l'étape en cours** = nœuds restants de la passe / débit mesuré depuis le début de l'analyse (nœuds par seconde), affiché après 3 s de mesure.

**Mesure** (PC 20 cœurs, donc 4 Workers, Chromium headless) : environ 1 minute pour 10 parties de blitz de Hikaru, soit à peu près 980 positions dont une centaine en passe profonde, sans aucune analyse Lichess réutilisable. Reste à mesurer sur mobile.

---

## 2026-10-04 : rejouer ses erreurs

Depuis la table des résultats, le bouton « Rejouer mes erreurs (N) » lance un entraînement (sur les 10 dernières parties, ou sur la dernière seule selon le bouton choisi sur le profil) : chaque erreur détectée (voir « Notion d'erreur ») réapparaît sur un échiquier jouable, **dans un ordre aléatoire**, toutes parties confondues. Code : `src/features/training/`.

### Notion de coup valide

Définie dans `src/features/review/errors.ts` (`isValidMove`, `VALID_MAX_DROP`, testée). **Toute évolution de cette règle doit être reportée ici.**

**Révisée le 2026-10-04** : d'abord « perte < 0,5 pion par rapport au meilleur coup, ou position qui reste ≥ +4 ». Même problème de marche que pour les erreurs : un coup passant de +6 à +4,5 était accepté. Passée en chances de gain, avec le même modèle que les erreurs.

Évaluations du point de vue du joueur : `meilleur` = après le meilleur coup du moteur, `après` = après le coup proposé.

```
valide ⇔ gain%(meilleur) − gain%(après) < 5 points
```

- **5 points** ≈ un demi-pion depuis l'équilibre (0 → −0,5 accepté, 0 → −0,6 refusé), plus tolérant quand la partie est décidée : +4 → +3,3 accepté, +4 → +3 refusé, +10 → +7,5 accepté, mat → +10 accepté, mat → +5 refusé.
- Paire cohérente avec les erreurs : **valide sous 5 points, erreur à partir de 10**, et une zone grise entre les deux (coup ni bon ni fautif).
- **Le coup joué dans la partie est toujours refusé**, même si la nouvelle recherche le trouvait limite. Un coup qui termine la partie (mat, pat) est évalué exactement par chessops.
- **Évaluations comparables** : la référence est une recherche MultiPV 5 (1,5 M nœuds partagés). Un coup du top 5 est jugé sur sa ligne. Un coup hors du top 5 est évalué depuis la même position de départ, en restreignant la recherche à ce coup (`searchmoves`), avec le budget d'une ligne (300 k nœuds). Avant, il était évalué à part, depuis la position d'après et avec un autre budget : un décalage de profondeur pouvait fausser la comparaison.
- L'écart affiché sous chaque coup reste en pions (`+2,0 → +1,4 (−0,6)`), plus parlant ; sa couleur (vert / rouge) suit cette règle.

### Déroulé

- **Mode puzzle** : avant l'essai, on ne montre que la position (orientation du joueur, trait, dernier coup adverse surligné). Le coup joué en partie n'est révélé qu'après, avec l'adversaire, la date et un lien.
- Coup refusé : « {coup} n'est pas assez bon », avec **Réessayer** ou **Voir la solution**. Coup validé : « Bon coup ! », plus le meilleur coup s'il était différent. Flèches : meilleur coup en vert, coup de la partie en rouge, coup du joueur en bleu.
- **Essayer un autre coup** : une fois la position trouvée (ou la solution affichée), un bouton permet de jouer d'autres coups pour voir ce qu'ils donnent. Le résultat de la position est figé au premier verdict (`outcome` dans le reducer) : explorer ne change jamais le bilan, et « Position suivante » reste disponible pendant l'exploration, même après un essai raté.
- **Évaluations affichées côté blancs**, selon la convention des échecs (`+` avantage blanc, `-` avantage noir), quelle que soit la couleur du joueur ; une première version les affichait du point de vue du joueur, ce qui inversait tout quand il avait les noirs. Les calculs (erreur, coup valide) restent du point de vue du joueur, et la couleur de l'écart (vert / rouge) dit si c'est bon ou mauvais pour lui. Les évaluations apparaissent après chaque essai, sous forme de transition : `+4,1 → -5,2 (-9,4)`, soit l'évaluation de la position (celle du meilleur coup), l'évaluation après le coup, puis l'écart (vert si le coup serait valide, rouge sinon). Même présentation pour le coup essayé, le meilleur coup et le coup de la partie (ce dernier reprend l'évaluation de l'analyse). Les mats s'affichent `+#` (les blancs matent) / `-#` (les noirs matent), sans écart. **L'évaluation de la position reste affichée sous la consigne** dès le premier verdict (jamais avant : ce serait un indice).
- **Cache temporaire** des évaluations par coup essayé (dans le `Coach`, vidé à la sortie de l'entraînement) : rejouer le même mauvais coup ne relance pas Stockfish.
- **Ressenti** : le trait en grand, puis un bloc de retour teinté avec icône (« Pas tout à fait » en rouge, « Bien joué ! » en vert, « La solution » en bleu) qui apparaît en fondu, et un liseré de la même couleur autour de l'échiquier. Seules les informations utiles restent : pas d'adversaire ni de date, juste un lien « Voir la partie ».
- Indicateur « Erreur 3 / 29 · 27 restantes ». Bilan final : totaux seulement (trouvées du premier coup, après plusieurs essais, solution affichée), puis **Terminer** revient à la table. **Quitter** est possible à tout moment.
- **La riposte après un raté** : le moteur montre comment le coup est puni. C'est le deuxième coup de la variante principale de la ligne qui a évalué le coup (top 5 ou recherche `searchmoves`), sans recherche supplémentaire. Il est affiché en flèche rouge sur l'échiquier (position après le coup essayé) et en toutes lettres (« Le moteur répond Cxf4 »).
- **Coups valides (top 5 du moteur)** : la recherche de référence d'une position est en MultiPV 5 (`REFERENCE_LINES`, budget `REFERENCE_NODES` = 1,5 M nœuds partagés entre les lignes). Les coups valides sont les lignes qui passent `isValidMove`, sauf le coup de la partie, plus tout coup valide trouvé par le joueur hors de ce top 5. Si les 5 lignes sont toutes valides, on affiche « 5+ coups valides ». Le compte apparaît quand la solution est connue (coup trouvé ou solution demandée) ; la liste s'ouvre au survol (souris) ou au toucher. Bonus : jouer l'un de ces 5 coups donne un verdict instantané, sans recherche. Écarté : évaluer tous les coups légaux (liste exacte, mais budget dilué et recherche bien plus longue).
- **Itération complète uniquement** : une recherche arrêtée en cours d'itération mélange deux profondeurs dans les lignes MultiPV (un même coup peut alors apparaître deux fois). `Stockfish.evaluate` ne garde que la dernière itération complète (`completeLines`), et le meilleur coup est pris dans cette même itération.
- **Lien « Analyser sur Lichess »** dès le premier verdict : l'outil d'analyse de Lichess sur la position du problème, quelle que soit la plateforme de la partie (voir apis.md).
- **Moteur** : un seul Stockfish pendant l'entraînement (`Coach`), recherches en file, une à la fois. La recherche de référence d'une position démarre dès son affichage, pendant que le joueur réfléchit : si le joueur joue le meilleur coup, la réponse est immédiate, sinon environ 1 s (PC) pour évaluer son coup.
- **Promotions** : toujours en dame (v1), chessground n'ayant pas de sélecteur de pièce.
- Toujours sans persistance : fermer la modale perd l'analyse et l'entraînement.
- **Une seule recherche à la fois par moteur, garanti à deux niveaux** : envoyer une position pendant une recherche fait planter le WASM (`RuntimeError: unreachable`). `Stockfish` refuse donc toute commande pendant une requête en cours, et le `Coach` abandonne les recherches mises en file avant un `terminate()` (compteur de génération). Le cas s'est produit en dev : le StrictMode de React monte, démonte et remonte l'entraînement, et une recherche orpheline démarrait sur le nouveau moteur en même temps que la suivante. Tester aussi en `pnpm dev`, pas seulement sur le build.
- `Board.tsx` annule la sélection en cours quand la position change : sinon chessground garde la pièce sélectionnée (et ses destinations) de la position précédente.

---

## 2026-10-04 : historique des parties

Un onglet **Parties** sur le profil (`/player/history`) liste toutes les parties des comptes liés, de la plus récente à la plus ancienne, toutes plateformes, cadences et variantes confondues (parties amicales comprises). Code : `src/features/history/`.

- **Pas de stockage** (choix de l'utilisateur) : rien n'est enregistré, les parties sont récupérées à la demande. **Pages de 30**, avec boutons « plus récentes » / « plus anciennes ». Une page déjà vue ne refait pas de requête (cache TanStack Query, `useInfiniteQuery`). **Mettre à jour** repart de la première page (`resetQueries`).
- **Fusion par date** (`feed.ts`, testé avec de faux clients) : chaque plateforme a un curseur et un tampon de parties récupérées mais pas encore affichées. Lichess : export paginé par `until` (date de début), 30 parties par requête, sans les coups. Chess.com : archives mensuelles, de la plus récente à la plus ancienne. Une page prend les 30 parties les plus récentes des deux tampons, en les remplissant au besoin. Une plateforme en échec est signalée et la liste continue avec l'autre.
- **Colonne Elo** (au lieu du nombre d'erreurs) : l'Elo du joueur après la partie et la variation. Lichess donne la variation (`ratingDiff`) et l'Elo d'avant ; Chess.com donne l'Elo d'après mais pas la variation, calculée par différence avec la partie précédente de la même cadence et variante (`withChessComRatingDiffs`), sur tout ce qui est déjà chargé, tampon compris. La toute première partie connue d'une cadence n'a donc pas de variation. Les parties amicales affichent « Amicale ».
- **Normalisation partagée** (`src/features/games/normalize.ts`) : le résumé d'une partie (`GameSummary` : plateforme, date, cadence, variante, couleur, Elo, adversaire, résultat) sert à la fois à l'analyse et à l'historique, et la table (`GamesTable`) est la même, avec une dernière colonne au choix (erreurs ou Elo).
- Limite connue : Lichess pagine sur la date de **début** et la liste est triée sur la date de **fin** ; une partie par correspondance très longue peut apparaître un peu plus loin que sa date de fin.
