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
- Un seul niveau (« erreur ») : pas de distinction imprécision / erreur / gaffe. Pour mémoire, Lichess compte une imprécision à 5 points, une erreur à 10, une gaffe à 15 sur notre échelle (ses seuils 0,1 / 0,2 / 0,3 portent sur des chances de gain de −1 à +1, voir `Advice.scala`). **Corrigé le 2026-10-05** : ce paragraphe indiquait 10 / 20 / 30, par confusion d'échelle. Notre seuil de 10 correspond donc exactement à « erreur » chez Lichess. Les flags `judgment` de Lichess sont **ignorés** : seul notre seuil compte, pour que les deux plateformes soient comptées pareil.
- La passe profonde de l'analyse réexamine les coups qui perdent au moins **6 points** en passe rapide (marge de 4 sous le seuil, `deepCheckMinDrop` dans `criteria.ts`).
- **Depuis le 2026-10-05, ce seuil est réglable** dans l'analyse approfondie (voir plus bas). 10 reste la valeur par défaut, et le bouton « Analyser ma dernière partie » l'utilise toujours.

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
valide ⇔ gain%(meilleur) − gain%(après) ≤ 5 points
```

- **Depuis le 2026-10-05, ce seuil est réglable** dans l'analyse approfondie, toujours strictement inférieur au seuil d'erreur. 5 reste la valeur par défaut.

- **5 points** ≈ un demi-pion depuis l'équilibre (0 → −0,5 accepté, 0 → −0,6 refusé), plus tolérant quand la partie est décidée : +4 → +3,3 accepté, +4 → +3 refusé, +10 → +7,5 accepté, mat → +10 accepté, mat → +5 refusé.
- Paire cohérente avec les erreurs : **valide jusqu'à 5 points inclus, erreur à partir de 10**, et une zone grise entre les deux (coup ni bon ni fautif).
- **Révisée le 2026-10-05** : la règle était stricte (`< 5`). Elle est passée à `≤ 5` à la demande de l'utilisateur, pour l'analyse rapide comme pour la valeur par défaut de l'analyse approfondie. L'écart ne joue qu'à la frontière exacte.
- **Le coup joué dans la partie est toujours refusé**, même si la nouvelle recherche le trouvait limite. Un coup qui termine la partie (mat, pat) est évalué exactement par chessops.
- **Évaluations comparables** : la référence est une recherche MultiPV 5 (1,5 M nœuds partagés). Un coup du top 5 est jugé sur sa ligne. Un coup hors du top 5 est évalué depuis la même position de départ, en restreignant la recherche à ce coup (`searchmoves`), avec le budget d'une ligne (300 k nœuds). Avant, il était évalué à part, depuis la position d'après et avec un autre budget : un décalage de profondeur pouvait fausser la comparaison.
- L'écart affiché sous chaque coup reste en pions (`+2,0 → +1,4 (−0,6)`), plus parlant ; sa couleur (vert / rouge) suit cette règle.

### Déroulé

- **Mode puzzle** : avant l'essai, on ne montre que la position (orientation du joueur, trait, dernier coup adverse surligné). Le coup joué en partie n'est révélé qu'après, avec l'adversaire, la date et un lien.
- Coup refusé : « {coup} n'est pas assez bon », avec **Réessayer** ou **Voir la solution**. Coup validé : « Bon coup ! », plus le meilleur coup s'il était différent. Flèches : meilleur coup en vert, coup de la partie en rouge, coup du joueur en bleu.
- **Essayer un autre coup** : une fois la position trouvée (ou la solution affichée), un bouton permet de jouer d'autres coups pour voir ce qu'ils donnent. Le résultat de la position est figé au premier verdict (`outcome` dans le reducer) : explorer ne change jamais le bilan, et « Position suivante » reste disponible pendant l'exploration, même après un essai raté.
- **Évaluations affichées côté blancs**, selon la convention des échecs (`+` avantage blanc, `-` avantage noir), quelle que soit la couleur du joueur ; une première version les affichait du point de vue du joueur, ce qui inversait tout quand il avait les noirs. Les calculs (erreur, coup valide) restent du point de vue du joueur, et la couleur de l'écart (vert / rouge) dit si c'est bon ou mauvais pour lui. Les évaluations apparaissent après chaque essai, sous forme de transition : `+4,1 → -5,2 (-9,4)`, soit l'évaluation de la position (celle du meilleur coup), l'évaluation après le coup, puis l'écart (vert si le coup serait valide, rouge sinon). Même présentation pour le coup essayé, le meilleur coup et le coup de la partie (ce dernier reprend l'évaluation de l'analyse). Les mats s'affichent `+#` (les blancs matent) / `-#` (les noirs matent), sans écart. **L'évaluation de la position reste affichée sous la consigne** dès le premier verdict (jamais avant : ce serait un indice).
- **Cache temporaire** des évaluations par coup essayé (dans le `Coach`, vidé à la sortie de l'entraînement) : rejouer le même mauvais coup ne relance pas Stockfish.
- **Ressenti** : le trait en grand, puis un bloc de retour teinté avec icône (« Pas tout à fait » en rouge, « Bien joué ! » en vert, « La solution » en bleu) qui apparaît en fondu. Le liseré de la même couleur autour de l'échiquier a été retiré (2026-10-06) : trop appuyé. Seules les informations utiles restent : pas d'adversaire ni de date, juste un lien « Voir la partie ».
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

Un onglet **Parties** sur le profil (`/player/history`) liste les parties des comptes liés, de la plus récente à la plus ancienne, toutes plateformes et cadences confondues. Code : `src/features/history/`. (Au départ, il incluait aussi les parties amicales et les variantes : voir l'entrée suivante.)

- **Pas de stockage** (choix de l'utilisateur) : rien n'est enregistré, les parties sont récupérées à la demande. **Pages de 30**, avec boutons « plus récentes » / « plus anciennes ». Une page déjà vue ne refait pas de requête (cache TanStack Query, `useInfiniteQuery`). **Mettre à jour** repart de la première page (`resetQueries`).
- **Fusion par date** (`feed.ts`, testé avec de faux clients) : chaque plateforme a un curseur et un tampon de parties récupérées mais pas encore affichées. Lichess : export paginé par `until` (date de début), 30 parties par requête, sans les coups. Chess.com : archives mensuelles, de la plus récente à la plus ancienne. Une page prend les 30 parties les plus récentes des deux tampons, en les remplissant au besoin. Une plateforme en échec est signalée et la liste continue avec l'autre.
- **Colonne Elo** (au lieu du nombre d'erreurs) : l'Elo du joueur après la partie et la variation. Lichess donne la variation (`ratingDiff`) et l'Elo d'avant ; Chess.com donne l'Elo d'après mais pas la variation, calculée par différence avec la partie précédente de la même cadence et variante (`withChessComRatingDiffs`), sur tout ce qui est déjà chargé, tampon compris. La toute première partie connue d'une cadence n'a donc pas de variation.
- **Normalisation partagée** (`src/features/games/normalize.ts`) : le résumé d'une partie (`GameSummary` : plateforme, date, cadence, variante, couleur, Elo, adversaire, résultat) sert à la fois à l'analyse et à l'historique, et la table (`GamesTable`) est la même, avec une dernière colonne au choix (erreurs ou Elo).
- Limite connue : Lichess pagine sur la date de **début** et la liste est triée sur la date de **fin** ; une partie par correspondance très longue peut apparaître un peu plus loin que sa date de fin.

---

## 2026-10-04 : mises à jour de la PWA

Constat sur Android : l'app installée ne recevait pas les nouvelles versions. Le service worker ne cherchait une mise à jour qu'au chargement d'une page, or rouvrir l'app depuis l'écran d'accueil reprend souvent la page en mémoire sans la recharger ; et une version trouvée ne s'appliquait qu'au chargement suivant.

- **Enregistrement manuel** (`src/lib/registerServiceWorker.ts`, `registerType: 'prompt'`, `injectRegister: false`, dépendance `workbox-window`) : recherche de mise à jour au retour de l'app au premier plan (`visibilitychange`) et toutes les heures.
- **Au lancement** : une nouvelle version trouvée dans les 10 premières secondes est appliquée tout de suite (rechargement), puisque rien n'a encore été commencé.
- **Plus tard** : un bandeau « Une nouvelle version de ChessMe est disponible · Mettre à jour » (`UpdateBanner`), plutôt qu'un rechargement forcé qui ferait perdre une analyse ou un entraînement en cours (rien n'est stocké).
- **Cache du moteur limité aux fichiers de Stockfish** (2026-10-05) : la règle `url.pathname.includes('/engine/')` (CacheFirst) attrapait aussi, en dev, les modules sources servis par Vite (`/src/lib/engine/stockfish.ts`, `uci.ts`, `pool.ts`). Ils restaient figés dans le cache : un navigateur de dev exécutait un vieux `stockfish.ts` avec un `coach.ts` récent, d'où « Impossible de démarrer Stockfish » à chaque coup (en réalité `TypeError: lines.map` sur l'ancien `evaluate()`), seulement en dev. La règle ne vise plus que `/engine/` à la racine du site (`startsWith`, même origine). Le cache s'appelle désormais `stockfish`, et l'ancien (`engine`) est supprimé au démarrage. La fonction `urlPattern` doit rester autonome : Workbox recopie son texte dans `sw.js`.
- Une page jamais contrôlée par le service worker (première visite) ne reçoit pas l'événement de prise de contrôle : un rechargement simple suit au bout de 2 s si besoin.

---

## 2026-10-04 : licence, mentions légales et confidentialité

En vue d'un partage public :

- **Fichier `LICENSE` (GPL-3.0)**, texte officiel de gnu.org. Comme le JavaScript et le WASM sont envoyés aux visiteurs, c'est une distribution au sens de la GPL : le code source doit leur être accessible. Le pied de page affiche donc « Code source (GPL-3.0) », un lien vers le dépôt public, et `main` correspond à la version déployée.
- **Pied de page** : « Projet indépendant, sans lien avec Lichess ou Chess.com ». On cite les marques sans utiliser leurs logos.
- **Page `/legal`** (en anglais et en français) :
  - **éditeur** : site personnel non professionnel, donc anonyme comme l'autorise la LCEN (art. 6), avec contact par les issues GitHub ;
  - **hébergeur** : Render Services, Inc. ;
  - **confidentialité** : aucun compte, cookie, mesure d'audience ni publicité ; liste de ce qui est stocké localement ; liste des services tiers appelés (lichess.org, api.chess.com, images.chesscomfiles.com) et journaux de l'hébergeur ;
  - **bouton « Supprimer mes données locales »** ;
  - **licence et crédits** : chessground et chessops, Stockfish, pièces cburnett, Noto Sans, API.
- Si on ajoute un jour de la publicité ou de la mesure d'audience : bannière de consentement et politique de confidentialité à revoir entièrement.

---

## 2026-10-05 : l'historique liste les mêmes parties que la revue

Constat : une partie amicale toute récente apparaissait dans l'historique, mais « Analyser ma dernière partie » prenait la partie classée d'avant, ce qui donnait l'impression d'un bug.

- **Choix de l'utilisateur** : la revue reste limitée aux **parties classées en échecs standard**, et l'historique s'aligne dessus. Plus de parties amicales, ni de variantes (Chess960, partie depuis une position…), ni de parties contre l'ordinateur (toujours amicales sur Lichess).
- **Une seule règle** : `isRatedStandardGame` (`src/features/games/normalize.ts`), utilisée par la revue (`fromLichessGame`) et par l'historique (`feed.ts`). Toute évolution du périmètre se fait là.
- L'export Lichess de l'historique demande directement `rated=true` et `perfType` (cadences standard), comme la revue, pour ne pas télécharger des parties écartées ensuite. Côté Chess.com, le filtre est appliqué mois par mois, et un mois sans partie retenue fait passer au précédent.
- Le libellé « Amicale » est supprimé, et le message vide devient « Aucune partie classée trouvée ».

---

## 2026-10-05 : analyse approfondie paramétrable

Le bouton « Analyser les 10 dernières parties » devient **« Analyse approfondie »**. Le bouton « Analyser ma dernière partie » ne change pas : dernière partie, seuils par défaut, lancement immédiat. Code : `src/features/review/` (`criteria.ts`, `selection.ts`, `fetch.ts`, `estimate.ts`, `settings.ts`, composants `ReviewSetup`, `ReviewRecap`, `ReviewDialog`).

### Déroulé en deux étapes

**Réglages → « Trouver les parties » → récapitulatif → « Lancer l'analyse »**. Le récapitulatif donne le nombre exact de parties, leur répartition (plateforme, cadence) et une estimation de durée **pour l'appareil utilisé**, calculée sur les vraies parties. Ensuite, l'analyse se déroule comme avant (étapes, progression, résultats, entraînement).

### Filtres

- **Plateformes** : les comptes trouvés, cochés par défaut.
- **Parties** : les N dernières (de 1 à « ≈ total des parties classées du profil », avec raccourcis 10 / 25 / 50 / 100), ou une **période** (dernière semaine, dernier mois, 3 derniers mois, dernière année, ou dates personnalisées). Une période choisie par raccourci est retenue comme raccourci : « dernière semaine » reste la dernière semaine à la prochaine ouverture.
- **Cadences**, **couleur**, **résultat**, **longueur minimale** (en coups ; 0 = toutes).
- Les API filtrent ce qu'elles savent filtrer : Lichess les cadences (l'UltraBullet compte comme bullet), la couleur et les dates de **début** ; Chess.com les mois. `matchesSelection` revérifie tout, et la période porte sur la date de **fin**. Côté Lichess, une marge de 60 jours avant le début de la période couvre les parties par correspondance.
- **« N dernières » avec des filtres que Lichess ne connaît pas** (résultat, longueur) : pagination à rebours par pages de 100 jusqu'à obtenir N parties retenues. Sans ces filtres, on demande exactement N parties à Lichess (le bouton rapide en demande 1).
- **Pas de plafond** (choix de l'utilisateur), mais un **avertissement à partir de 100 parties** : les analyses ne sont pas encore enregistrées.

### Seuils

- Un curseur « erreur » (3 à 30, défaut 10), avec les repères de Lichess : imprécision 5, erreur 10, gaffe 15.
- Un curseur « coup valide » (1 à 29, défaut 5). Il reste **strictement sous le seuil d'erreur** (`normalizeCriteria`) : déplacer l'un pousse l'autre. Sinon, un coup pourrait être à la fois une erreur et un coup valide.
- Un coup valide perd **au plus** le seuil (`perte ≤ seuil`, affiché « au plus X % »), comme dans l'analyse rapide.
- Le seuil de la passe approfondie suit le seuil d'erreur (`deepCheckMinDrop` = seuil − 4, au minimum 1). Un seuil bas allonge nettement l'analyse, et l'estimation en tient compte.
- L'entraînement utilise le seuil de coup valide de l'analyse (`Coach`, et un contexte React pour la couleur des écarts). Les seuils utilisés sont rappelés au-dessus des résultats.

### Estimation de durée

`estimate.ts` : positions sans évaluation Lichess × 100 000 nœuds, plus une part de positions en passe approfondie × 1 000 000 nœuds, divisé par le débit de l'appareil. Une seule partie n'occupe qu'un moteur.

- **Une seule estimation, celle de l'appareil** : « Temps estimé : ≈ 7 min ». Sur téléphone ou tablette, une ligne de plus : « Environ N fois plus rapide sur un ordinateur » (`desktopSpeedup`, comparé à un ordinateur type de 4 moteurs, sur les mêmes parties ; rien si le gain est sous 1,5×). Historique : d'abord les deux durées côte à côte, puis « sur cet ordinateur / ce téléphone » ; simplifié à la demande de l'utilisateur.
- **Type d'appareil** (`lib/device.ts`, `detectDevice`) : les Client Hints quand le navigateur en a (`navigator.userAgentData.mobile` : Chrome, Edge, Android), sinon le user agent. Un Mac tactile est un iPad (les iPad récents se présentent comme des Mac).
- **Moteurs** : le nombre réel de moteurs que l'analyse lancera sur l'appareil (`defaultPoolSize`, selon les cœurs), et non une hypothèse.
- **Vitesse d'un moteur** (`ENGINE_SPEED`) : ordinateur environ 825 000 nœuds/s, tirés de la mesure (environ 198 M de nœuds en 60 s avec 4 moteurs). Vérifié le 2026-10-05 : 21 parties de bullet estimées à environ 2 min, analysées en 128 s. Téléphone environ 250 000 nœuds/s, **hypothèse à mesurer** sur un vrai téléphone.
- Part de positions en passe approfondie : environ 10 % au seuil par défaut (mesuré), plus quand le seuil baisse (tableau approximatif dans `deepShare`).

### Résultats et entraînement

- Table **paginée par 20** (`TablePagination`).
- **Rejouer une seule partie** : un bouton bleu par ligne (le style des boutons principaux, pour le repérer), à côté du nombre d'erreurs, grisé sans erreur. Le bouton global reste.
- « Modifier les filtres » revient aux réglages.

### Protections pendant l'analyse

Rien n'étant enregistré, fermer la modale pendant une recherche ou une analyse **demande confirmation**. Pendant l'analyse, l'écran reste allumé (Screen Wake Lock, si le navigateur le permet) et quitter la page déclenche un avertissement (`useKeepAwake`). La vraie solution, mettre les évaluations en cache, reste une piste (`docs/vision.md`).

### Réglages mémorisés

Dans le `localStorage` (`chessme:review-settings`), avec une lecture tolérante (chaque champ invalide reprend sa valeur par défaut) et versionnée. Déclarés sur la page `/legal`, et effacés par « Supprimer mes données locales ».

---

## 2026-10-05 : l'analyse quitte la modale pour une page à onglets

La modale enchaînait réglages, récapitulatif, progression, résultats et entraînement : le parcours devenait confus après les réglages. L'analyse a maintenant sa **page**, `/analysis?lichess=…&chesscom=…`, sur le squelette du profil. Remplace les parties « Déroulé » et « Protections pendant l'analyse » de l'entrée précédente, qui décrivaient la modale.

- **En-tête** : celui du joueur, inchangé et à la même place. Le nom ramène au profil. À droite : « Analyser ma dernière partie » et « Rejouer mes erreurs (N) », à la place de « Analyse approfondie ». Dessous, le titre « Analyse approfondie », puis les onglets.
- **Onglets** (routes `src/routes/analysis/`) :
  - **Filtres et options** (`/analysis`), toujours présent. « Trouver les parties » affiche le récapitulatif sous les réglages, avec « Lancer l'analyse ». Modifier un réglage fait disparaître le récapitulatif : il faut relancer la recherche, pour ne pas analyser autre chose que ce qui est affiché.
  - **Analyse** (`/analysis/run`), dès qu'une analyse existe : la progression, puis les résultats (pagination, rejeu par partie, chrono).
  - **Entraînement** (`/analysis/training`), dès qu'un entraînement est lancé. On passe des résultats à l'entraînement et inversement sans perdre la session : `TrainingView` est rendu par la mise en page, masqué hors de son onglet. « Quitter » ferme la session (l'onglet disparaît) et ramène aux résultats.
- **Bouton rapide** (profil ou page d'analyse) : même page, directement sur l'onglet Analyse, avec les filtres « dernière partie, seuils par défaut », visibles dans l'onglet Filtres mais **non mémorisés**. Depuis le profil, il passe par `?start=last`, retiré de l'adresse aussitôt l'analyse démarrée (un rechargement ne la relance pas). L'état « en cours » est posé dès le premier rendu : les effets des onglets passent avant celui de la mise en page, et l'onglet Analyse ne doit jamais croire qu'il n'y a rien.
- **L'analyse continue** quand on revient aux filtres. Recherche, analyse et entraînement sont **indépendants** (`AnalysisSessionProvider`, `session.tsx`, avec un `AbortController` chacun) : on peut chercher d'autres parties pendant qu'une analyse tourne.
- **« Revenir aux filtres de l'analyse en cours »** apparaît quand les réglages diffèrent de ceux de l'analyse en cours (`sameSettings`).
- **Confirmations** (modales `ConfirmDialog` / `useConfirm`) : remplacer l'analyse en cours (ce qui arrête aussi son entraînement), arrêter l'entraînement en cours pour en lancer un autre, quitter la page pendant une analyse ou un entraînement (`useBlocker` de TanStack Router ; changer d'onglet n'est jamais bloqué ; fermer ou recharger l'onglet déclenche l'avertissement natif).
- **Accès direct** à `/analysis/run` ou `/analysis/training` sans rien en mémoire (rechargement, lien partagé) : retour à l'onglet Filtres.
- Le chrono utilise les heures de début et de fin stockées dans la session : il ne repart pas de zéro quand on change d'onglet.

---

## 2026-10-05 : parties non classées, formulaire réorganisé, clics sur l'échiquier

### Parties classées et non classées

**Révise « l'historique liste les mêmes parties que la revue »** : à la demande de l'utilisateur, les parties **non classées** reviennent, dans l'historique comme dans l'analyse (bouton rapide compris). Seules les variantes restent exclues.

- Règle commune : `isStandardGame` (remplace `isRatedStandardGame`), c'est-à-dire échecs standard, classés ou non.
- Nouveau filtre de l'analyse : **Type de partie**, « Classées » et « Non classées », les deux actifs par défaut (`selection.ratings`). Lichess le filtre lui-même (`rated=true/false`, omis pour les deux) ; Chess.com est filtré ici.
- L'historique affiche de nouveau « Amicale » dans la colonne Elo pour les parties non classées. Les parties contre l'ordinateur (Lichess) ont pour adversaire « Stockfish niveau N » au lieu de « ? ».

### Formulaire

- Plateformes, cadences et type de partie : des **pastilles** activables, toutes actives par défaut (les plateformes étaient des cases à cocher).
- Ordre des rangées : plateformes / cadences / type de partie, puis couleur / résultat / longueur minimale, puis **Parties**, puis les seuils.
- **Parties** : « Dernières parties » et « Période » côte à côte, **toujours visibles**. L'option inactive garde ses dernières valeurs, atténuée, et s'active dès qu'on l'utilise. « Dernières parties » : un champ numérique et des raccourcis 10 / 25 / 50 / 100. Un curseur a été essayé puis retiré : sur des comptes de dizaines de milliers de parties, il ne permettait pas de régler finement. La période gagne le raccourci **Aujourd'hui** (depuis minuit, heure locale).
- **« Revenir aux filtres de l'analyse en cours »** est toujours affiché, désactivé tant que les réglages n'ont pas changé.
- Le bouton rapide n'apparaît plus sur la page d'analyse : l'en-tête n'y garde que « Rejouer mes erreurs (N) ». Le nom du joueur est un lien vers le profil partout, y compris sur le profil.

### Bug : les clics sur l'échiquier d'entraînement tombaient à côté

chessground garde en cache la position du plateau à l'écran, et ne la rafraîchit qu'au redimensionnement de la fenêtre ou au défilement. Sur la page d'analyse, l'échiquier était mesuré sous la table des résultats, puis remontait quand l'onglet changeait : les clics étaient calculés 242 px trop bas. Corrigé à deux niveaux :

- l'entraînement est rendu **avant** le contenu de l'onglet, pour que l'échiquier ne bouge plus ;
- `Board` **oublie la position en cache à chaque appui** (`state.dom.bounds.clear()`) et se redessine quand sa taille change (`ResizeObserver`, pour un échiquier créé dans un onglet masqué).

Le message « Couldn't start Stockfish » signalé n'a pas été reproduit après cette correction (coups joués et verdicts obtenus dans tous les enchaînements testés). Les échecs du moteur pendant l'entraînement sont désormais écrits dans la console, pour diagnostiquer s'il revient. Aussi : quitter l'entraînement ramène bien aux résultats (la redirection « pas d'entraînement » de l'onglet passait avant la navigation).

---

## 2026-10-05 : filtres en sections dépliables, recherche automatique

**Révise le formulaire de l'entrée précédente et le déroulé « Trouver les parties »** de l'analyse approfondie.

- **Trois sections dépliables** (`<details>` natif, sans dépendance), chacune résumée sur une ligne quand elle est fermée :
  - **Plage de recherche**, ouverte par défaut : « Dernières parties » ou « Période » ;
  - **Parties**, fermée : plateformes, type de partie, cadences, couleur, résultat, longueur minimale. Résumé : ce que les filtres excluent, sinon « Toutes les parties » ;
  - **Entraînement**, fermée : les seuils d'erreur et de coup valide.
- **Maximum de parties pour la période** (`scope.max`), derrière une case « Limiter à [50] parties », **décochée par défaut** : décochée, pas de limite (plutôt que de taper 9999) ; le dernier nombre reste affiché, atténué. Les plus récentes passent en premier, ce qu'indique une info-bulle. Lichess pagine alors à rebours comme pour « Dernières parties », Chess.com s'arrête au mois qui atteint le maximum.
- **Plus de bouton « Trouver les parties »** : la recherche est rapide, l'onglet Filtres la relance **400 ms après chaque modification** (la précédente est annulée). Elle attend que l'analyse en cours ait fini de récupérer ses parties : une seule requête Lichess à la fois.
- Seuls les **filtres de parties** périment la recherche (`sameSelection`) : les seuils ne changent que l'estimation de durée, et l'analyse prend les seuils affichés au lancement.
- Les réglages sont **mémorisés à chaque analyse lancée** depuis l'onglet Filtres (et non plus à chaque recherche, devenue automatique). Le bouton rapide ne les touche pas.
- Explications secondaires derrière une **icône d'info** (info-bulle `InfoTip`) : maximum de la période, longueur minimale, repères de Lichess (à côté du titre « Erreur »). Le bouton « Valeurs par défaut » des seuils est retiré.
- **« Revenir aux filtres de l'analyse en cours » disparaît** au profit d'un bouton par section, à droite de son en-tête : **« Revenir à l'analyse en cours »** (`sameScope`, `sameFilters`, `sameCriteria`). Il ne remet que sa section dans l'état de l'analyse en cours. Absent tant qu'aucune analyse n'existe, désactivé si la section n'a pas changé. Il est dans le `<summary>`, enveloppé d'un élément qui annule le clic : sinon, un clic sur le bouton désactivé ouvrirait ou fermerait la section.
- Section Entraînement : bouton **« Valeurs par défaut »** dans son en-tête (10 % / 5 %), à côté de « Revenir à l'analyse en cours ». Les repères de Lichess figurent aussi sous le curseur « Coup valide ».
- Rappel de « Dernières parties » : **toutes les parties** des comptes (`gameTotal`), quels que soient la cadence, le type ou la plateforme. Lichess donne le total exact (`count`) ; Chess.com ne publie que le bilan de ses parties classées, ses parties amicales n'y sont donc pas. Une info-bulle (`InfoTip`, composant partagé) le signale, ici comme sur la vue d'ensemble du profil (« Parties jouées », « Bilan global »). L'analyse, elle, lit les archives mensuelles de Chess.com, qui contiennent aussi les parties amicales.
- « Lancer l'analyse » passe en haut à droite de l'encadré « Parties trouvées ». Le titre « Analyse approfondie » et le rappel des seuils au-dessus des résultats sont retirés.
- **Estimation** : elle déduisait déjà les positions évaluées par Lichess ; la phrase « les parties déjà analysées par Lichess vont plus vite » laissait croire le contraire. Elle est remplacée par « Dont N parties déjà analysées par Lichess : leurs évaluations sont reprises ». Le calcul simule désormais la répartition des parties entre les moteurs (`makespan`, comme `EnginePool.run`), puis la passe approfondie après la rapide : 5 parties sur 4 moteurs prennent deux tours. Une mesure (10 parties Chess.com, PC 20 cœurs) : ≈ 50 s estimées, 58 s réelles ; la vitesse du moteur n'a pas été recalibrée.
- Le bouton « Quitter » de l'entraînement est retiré : les onglets suffisent pour en sortir, et le bilan de fin ramène toujours aux résultats.

---

## 2026-10-06 : analyse et mise en veille du téléphone

Un téléphone **gèle** la page (et ses Web Workers, donc Stockfish) dès que l'écran s'éteint ou que l'app passe en arrière-plan : l'analyse se met en pause et reprend au retour. Calculer en arrière-plan est impossible en web (une PWA n'a pas de calcul en tâche de fond, le service worker est coupé au bout de quelques secondes) ; seule une app native le permettrait.

- **Écran gardé allumé** pendant l'analyse (Screen Wake Lock, `useKeepAwake`, déjà en place) : la mise en veille automatique n'interrompt plus l'analyse. Elle ne peut rien contre une veille demandée (bouton d'alimentation) ni un changement d'appli, et le navigateur peut la refuser (économiseur de batterie). D'où une phrase pendant l'analyse : « Garde l'appli ouverte, écran allumé : l'analyse se met en pause en arrière-plan ou écran éteint ».
- **Temps actif** (`src/lib/activeTime.ts`) pour le chrono et pour la vitesse qui sert au temps restant : le temps passé page masquée ne compte que si l'analyse a avancé pendant ce temps (au moins 2 positions évaluées). Sur téléphone, une pause n'allonge plus le chrono et ne fait plus exploser l'estimation ; sur PC, un onglet en arrière-plan continue de calculer et ce temps compte. Le seuil de 2 évite qu'un résultat déjà en route au moment du gel ne transforme toute la pause en travail.
- Piste suivante : enregistrer les évaluations au fil de l'eau (Dexie) pour reprendre une analyse si le système ferme la page au lieu de la geler.

---

## 2026-10-06 : échiquier d'entraînement agrandi, pensé aussi pour le mobile

- **Ordinateur** (à partir de 768 px de large) : l'échiquier prend la hauteur visible sous son bord supérieur, la page étant remontée en haut, avec 24 px de marge en bas. Il reste **aligné sur la colonne de l'en-tête** : largeur de la colonne moins le panneau de 20rem, qui garde sa taille. Il est **plafonné à 720 px**, car au-delà il devenait envahissant, et ne descend jamais sous 320 px (`useBoardSize`). Un premier essai sans plafond, débordant de la colonne, montait à 842 px en 1920 × 1080. Le panneau est **centré verticalement** par rapport à l'échiquier.
- **Retour à l'échiquier** : chaque fois que l'échiquier attend un coup, il revient en entier à l'écran. Cela couvre l'arrivée sur l'onglet (bouton « Rejouer », rejeu d'une partie, clic sur l'onglet), l'erreur suivante, « Réessayer » et « Explorer ». Sur mobile, l'échiquier est placé en haut de l'écran, avec le compte rendu juste dessous. Sur ordinateur, la page remonte en haut. L'arrivée sur l'onglet étant une navigation, la restauration du défilement de TanStack Router passe après (`onRendered`), d'où un second défilement à ce moment-là. Sur mobile, le bloc fait au moins la hauteur de l'écran, pour que la page puisse toujours défiler jusque-là.
- **Coordonnées** (`src/index.css`) : celles de chessground ont une taille fixe et des décalages en pixels. Elles sont maintenant placées **à l'intérieur des cases**, comme sur Lichess : les chiffres en haut à droite de la colonne de droite, là où le thème brown attend ses couleurs alternées, et les lettres en bas à droite de la rangée du bas. Leur taille suit celle de l'échiquier (`container-type: inline-size`, `clamp(8px, 2.4cqw, 15px)`).
- **Mobile** : les phrases d'explication (« Trouvez mieux que le coup de votre partie », « Ce coup cède trop… », « C'est le coup du moteur ») sont masquées. Titres, coups et évaluations restent visibles.
