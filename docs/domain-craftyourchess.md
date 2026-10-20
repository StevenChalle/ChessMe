# Domaine craftyourchess.com

Objectif : l'application de `main` servie sur https://craftyourchess.com, achetée chez Cloudflare. À suivre dans l'ordre et à cocher au fur et à mesure. Supprimer ce fichier une fois tout terminé.

Service Render actuel : `craftyourchess`, en ligne sur https://craftyourchess-2rcp.onrender.com.

## 1. Compte Cloudflare (5 min)

- [x] Créer un compte sur https://dash.cloudflare.com/sign-up (avec craftyourchess@gmail.com, par exemple) et valider l'e-mail.
- [x] Activer la double authentification : **My Profile → Authentication → Two-Factor Authentication**. C'est le compte qui contrôle le domaine.

## 2. Acheter le domaine (5 min, ~10-11 $ par an)

- [x] Dans la barre de gauche : **Domain Registration → Register Domains**, chercher `craftyourchess.com`, **Purchase**.
- [x] Remplir les coordonnées du titulaire : elles sont masquées publiquement (WHOIS), gratuitement.
- [x] Payer par carte et laisser **Auto-renew** activé.
- [x] Attendre que le domaine apparaisse dans **Websites** (« Active »). Cloudflare crée lui-même la zone DNS, et il n'y a rien à faire côté serveurs de noms.
- [x] **DNS → Records** : supprimer tout enregistrement `A` ou `AAAA` présent par défaut sur `@` ou `www` (en principe, il n'y en a aucun).

## 3. Déclarer le domaine dans Render (2 min)

- [x] https://dashboard.render.com → service **craftyourchess** → **Settings → Custom Domains → Add Custom Domain** → `craftyourchess.com` → **Save**.
- [x] Render ajoute `www.craftyourchess.com` tout seul, qui redirigera vers `craftyourchess.com`. Les deux restent « Unverified » pour l'instant.

## 4. Pointer le DNS vers Render (3 min)

Dans Cloudflare → `craftyourchess.com` → **DNS → Records → Add record**, deux fois :

| Type  | Name  | Target                             | Proxy status        |
| ----- | ----- | ---------------------------------- | ------------------- |
| CNAME | `@`   | `craftyourchess-2rcp.onrender.com` | **DNS only** (gris) |
| CNAME | `www` | `craftyourchess-2rcp.onrender.com` | **DNS only** (gris) |

- [x] Les deux enregistrements sont créés, nuage **gris**. En orange (« Proxied »), Render ne peut pas émettre le certificat.
- [x] **SSL/TLS → Overview** : mode **Full**. Cela ne sert que si l'on active un jour le proxy, mais autant le régler tout de suite.

## 5. Vérifier dans Render (5 min à 1 h)

- [x] **Custom Domains** → **Verify** sur `craftyourchess.com` et sur `www.craftyourchess.com`.
- [x] Attendre que les deux affichent **Certificate Issued**. Si la vérification échoue, réessayer après quelques minutes : la propagation DNS est rapide chez Cloudflare, mais pas instantanée.

## 6. Tester le site (5 min)

- [x] https://craftyourchess.com s'ouvre, avec le cadenas.
- [x] https://www.craftyourchess.com et http://craftyourchess.com redirigent vers https://craftyourchess.com.
- [x] https://craftyourchess.com/contact s'affiche aussi après un rechargement (la réécriture `/* → /index.html` fonctionne).
- [x] Un message envoyé depuis `/contact` arrive bien sur craftyourchess@gmail.com.
- [x] Installer la PWA depuis la nouvelle adresse et désinstaller l'ancienne (`onrender.com`).

## 7. Me le dire : je mets le dépôt à jour

- [x] Dire « domaine OK » à Claude, qui :
  - remplace l'URL dans `README.md` et `docs/decisions.md`, en ajoutant une entrée sur le choix du domaine ;
  - déclare le domaine dans `render.yaml`, pour que la configuration soit versionnée (syntaxe vérifiée dans la référence Blueprint) ;
  - lance `pnpm check`, puis pousse sur `develop` et sur `main`.
- [x] Vérifier que la CI GitHub est verte et que Render redéploie : https://craftyourchess.com sert bien le dernier commit de `main`.

## 8. Finitions (10 min)

- [ ] Ancien service Render `chessme` → **Redirects/Rewrites** : faire pointer la redirection vers `https://craftyourchess.com/*` (301).
- [ ] Garder l'adresse `craftyourchess-2rcp.onrender.com` active pour l'instant : la désactiver (**Settings → Render Subdomain**) renverrait une erreur 404 au lieu de rediriger.
- [ ] GitHub → dépôt `CraftYourChess` → roue crantée de « About » → **Website** : `https://craftyourchess.com`.

## 9. Optionnel : contact@craftyourchess.com (10 min, gratuit)

- [ ] Cloudflare → `craftyourchess.com` → **Email → Email Routing → Get started**. Cloudflare ajoute lui-même ses enregistrements `MX` et `TXT`.
- [ ] Ajouter la règle `contact@craftyourchess.com` → craftyourchess@gmail.com, puis valider le lien reçu sur Gmail.
- [ ] Envoyer un e-mail de test à `contact@craftyourchess.com`.
- [ ] Le dire à Claude, qui met à jour `CONTACT_EMAIL` (`lib/project.ts`) et la doc. La clé Web3Forms ne change pas.
