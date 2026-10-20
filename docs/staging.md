# Staging : staging.craftyourchess.com

Objectif : chaque push sur `develop` (une fois la CI verte) met à jour https://staging.craftyourchess.com. La prod (`main`, https://craftyourchess.com) ne change pas. À cocher au fur et à mesure, puis supprimer ce fichier.

## 1. Dépôt : Claude

- [ ] CI GitHub lancée aussi sur un push vers `develop` (`.github/workflows/ci.yml`).
- [ ] Second service `craftyourchess-staging` dans `render.yaml` : branche `develop`, déploiement une fois la CI verte, domaine `staging.craftyourchess.com`, mêmes en-têtes et réécriture que la prod.
- [ ] En-tête `X-Robots-Tag: noindex` sur le staging, pour qu'il n'apparaisse pas dans Google.
- [ ] Nom distinct, « CraftYourChess (staging) », dans l'onglet et dans la PWA, pour pouvoir installer les deux côte à côte.
- [ ] Pas de clé Web3Forms sur le staging : le formulaire de contact y renvoie vers l'adresse e-mail, et tes tests ne se mélangent pas aux vrais retours.
- [ ] `docs/decisions.md` à jour, `pnpm check`, push sur `develop` puis sur `main`. Le Blueprint Render lit `render.yaml` sur `main` : c'est ce merge qui crée le service.

## 2. Render : toi (5 min)

- [ ] https://dashboard.render.com → **Blueprints** → le Blueprint du projet : vérifier que le service `craftyourchess-staging` a été créé. Si Render demande une validation, vérifier que l'aperçu **n'annonce aucune modification ni suppression** du service `craftyourchess`, puis valider.
- [ ] Noter l'adresse du nouveau service : `craftyourchess-staging-xxxx.onrender.com`.
- [ ] Attendre son premier déploiement (onglet **Events**).

## 3. Cloudflare : toi (2 min)

- [ ] `craftyourchess.com` → **DNS → Records → Add record** : `CNAME`, nom `staging`, cible `craftyourchess-staging-xxxx.onrender.com`, **DNS only** (nuage gris).

## 4. Render : toi (5 min à 1 h)

- [ ] Service `craftyourchess-staging` → **Settings → Custom Domains** : `staging.craftyourchess.com` doit apparaître. Sinon, l'ajouter.
- [ ] **Verify**, puis attendre **Certificate Issued**.
- [ ] Coût possible : le plan inclut 2 domaines personnalisés. Si `craftyourchess.com` et `www` les utilisent déjà, le troisième coûte 0,25 $ par mois (à vérifier dans **Billing**).

## 5. Tester : toi

- [ ] https://staging.craftyourchess.com s'ouvre, avec le cadenas et le titre « CraftYourChess (staging) ».
- [ ] Demander à Claude un petit changement de texte, poussé **uniquement sur `develop`** : la CI passe, le staging change, et https://craftyourchess.com ne bouge pas.
- [ ] Puis merge sur `main` : la prod reçoit le changement à son tour.

## Ensuite, le workflow

`develop` → staging (vérifier) → merge sur `main` → prod.
