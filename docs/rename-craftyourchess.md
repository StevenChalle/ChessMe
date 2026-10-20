# Renommage ChessMe → CraftYourChess

Liste à suivre dans l'ordre. Cocher au fur et à mesure ; supprimer ce fichier une fois tout terminé.

## 1. Code, docs, interface : fait

- [x] Nom affiché : en-tête, `<title>`, manifeste PWA (`CraftYourChess`, `CraftYourChess (dev)`), textes EN / FR, page `/legal`, page `/contact`.
- [x] E-mails Web3Forms : sujet `CraftYourChess · <type>` et expéditeur `CraftYourChess`.
- [x] Identifiants : paquet `craftyourchess`, clés `localStorage` `craftyourchess:*`, avec migration automatique des anciennes clés `chessme:*` (`migrateLegacyKeys`, `lib/localData.ts`).
- [x] Docs : `CLAUDE.md`, `README.md`, `docs/*`, licences des pièces, commentaire du favicon.
- [x] Lien « Code source » : `https://github.com/StevenChalle/CraftYourChess` (fonctionne dès l'étape 2).
- [x] URL Render (`craftyourchess.onrender.com`, option A) et adresse `craftyourchess@gmail.com` reportées dans le code et la doc.

## 2. GitHub : fait

1. https://github.com/StevenChalle/ChessMe/settings → **Repository name** : `CraftYourChess` → **Rename**.
   GitHub redirige automatiquement les anciennes URL (web, clone, push).
2. Mettre à jour le dépôt local :

   ```bash
   git remote set-url origin git@github.com:StevenChalle/CraftYourChess.git
   ```

3. Optionnel : mettre à jour la description et le lien « Website » du dépôt (roue crantée de la section « About »).
4. Me dire « GitHub OK » : je pousse `develop` puis `main`.

## 3. Render : option A retenue (`craftyourchess.onrender.com`)

L'URL actuelle `chessme-k8py.onrender.com` contient l'ancien nom. Deux possibilités :

**Option A, recommandée : un nouveau service, donc une nouvelle URL.**

1. Render → **New → Blueprint** (ou **New → Static Site**) sur le dépôt `CraftYourChess`, branche `main`.
   Je mets `name: craftyourchess` dans `render.yaml` au moment de la bascule : l'URL sera `craftyourchess.onrender.com`, ou `craftyourchess-xxxx.onrender.com` si le nom est pris.
2. Dans le nouveau service → **Environment** : ajouter `VITE_WEB3FORMS_KEY` (même valeur que l'ancien service), puis **Manual Deploy → Clear build cache & deploy**.
3. Vérifier le nouveau site, y compris un envoi depuis `/contact`.
4. Ancien service `chessme` → **Redirects/Rewrites** : supprimer la réécriture `/* → /index.html` et ajouter une **redirection** `/*` → `https://<nouvelle-url>/*` (301). Désactiver son déploiement automatique. Le supprimer dans quelques semaines.
5. Me donner la nouvelle URL : je mets à jour `README.md`, `docs/decisions.md` et `render.yaml`.

Conséquence : le stockage local est propre à chaque adresse. Les visiteurs actuels retrouvent un site vierge (recherches récentes, options) et doivent réinstaller la PWA. Pour un prototype, c'est acceptable.

**Option B : garder l'URL actuelle.** Renommer seulement le service dans le dashboard (**Settings → Name** : `craftyourchess`) et me le dire : j'aligne `render.yaml`. L'adresse `chessme-k8py.onrender.com` ne change pas. Vérifier l'aperçu du Blueprint avant de valider : s'il annonce la **création** d'un service, annuler.

**Plus tard** : un domaine à soi (`craftyourchess.com` ou `.app`, environ 10 à 15 € par an) dans **Settings → Custom Domains**. L'adresse ne dépend alors plus de l'hébergeur.

## 4. Web3Forms (1 min)

1. https://app.web3forms.com → le formulaire → renommer en `CraftYourChess`.
2. Si l'adresse e-mail change (étape 5) : créer une nouvelle clé d'accès avec la nouvelle adresse, puis la mettre dans `VITE_WEB3FORMS_KEY` sur Render et dans le `.env` local, et redéployer. L'ancienne clé continue d'écrire à l'ancienne adresse.

## 5. Adresse de contact : `craftyourchess@gmail.com` (reste le transfert, 5.2)

1. Créer `craftyourchess.dev@gmail.com`, ou un autre nom.
2. Dans l'ancienne boîte : **Paramètres → Transfert** vers la nouvelle, pour ne rien perdre.
3. Me donner l'adresse : je mets à jour `CONTACT_EMAIL` (`lib/project.ts`) et la doc. Puis faire l'étape 4.2.

## 6. Dossier local : fait

Fermer cette session et l'éditeur, puis :

```bash
mv ~/Home/Chess/ChessMe ~/Home/Chess/CraftYourChess
```

Garder la mémoire de Claude Code, liée au chemin du dossier :

```bash
mv ~/.claude/projects/-home-wushin-Home-Chess-ChessMe ~/.claude/projects/-home-wushin-Home-Chess-CraftYourChess
```

Puis rouvrir le projet depuis le nouveau dossier.

## 7. Rien à faire

- Lichess et Chess.com : aucune application enregistrée (APIs publiques, sans clé).
- Icônes et favicon : le logo est un fou, sans texte.

## 8. Vérification finale

```bash
git grep -n -i chessme
```

Seules doivent rester les mentions historiques (`docs/decisions.md`, la migration des clés `chessme:*`) et, selon les choix ci-dessus, l'ancienne URL ou l'ancienne adresse.
