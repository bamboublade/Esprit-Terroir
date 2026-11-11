# Esprit-Terroir

## ⚠️ Site en maintenance (depuis le 10/11/2026)

Le site est actuellement **hors ligne pour maintenance** (commit `366a59b`, v1.03.6). Toutes les pages publiques redirigent vers `maintenance.html`.

### Fonctionnement

GitHub Pages ne permet pas de redirection côté serveur : chaque page redirige elle-même, dès le début de son `<head>`, via ce bloc :

```html
<!-- MAINTENANCE : supprimer ces 2 lignes pour remettre la page en ligne -->
<meta http-equiv="refresh" content="0; url=/maintenance.html"><script>location.replace('/maintenance.html');</script>
```

| Fichier | Rôle pendant la maintenance |
|---|---|
| `maintenance.html` | Page de maintenance (charte graphique, `noindex`), coordonnées, WhatsApp, téléphone, réseaux |
| `index.html`, `primeur.html`, `epicerie-fine.html`, `caviste.html`, `panier.html`, `poulet-roti.html` | Contiennent le bloc de redirection ci-dessus. Leur contenu d'origine est intact |
| `404.html` | Créé pour la maintenance : toute URL inconnue renvoie vers `maintenance.html` |
| `politique-de-confidentialite.html`, `suppression-donnees.html` | **Non redirigées** volontairement (obligation légale + exigence de l'application Facebook). Liées depuis le pied de `maintenance.html` |

### Procédure de remise en ligne

**Option A : annuler le commit (le plus simple)**

```bash
git pull
git revert 366a59b
git push origin main
```

Cela retire les redirections et supprime `404.html` et `maintenance.html`. Pour **garder** `maintenance.html` en vue d'une prochaine maintenance, la restaurer avant le push :

```bash
git checkout 366a59b -- maintenance.html
git commit -m "Conserver la page de maintenance"
```

⚠️ Si des pages ont été modifiées après le commit `366a59b`, le revert peut créer un conflit : utiliser alors l'option B.

**Option B : manuellement**

1. Dans les 6 pages listées ci-dessus, supprimer les 2 lignes situées juste après `<head>` (commentaire `<!-- MAINTENANCE ... -->` + ligne `<meta http-equiv="refresh" ...><script>...`). Pour retrouver toutes les pages concernées :
   ```bash
   grep -l "location.replace('/maintenance.html')" *.html
   ```
   (`404.html` apparaîtra aussi dans la liste : le traiter à l'étape 2)
2. Supprimer `404.html` (ou le remplacer par une vraie page 404).
3. `maintenance.html` peut rester en place : elle est en `noindex` et n'est liée depuis aucune page.
4. Commiter et pousser sur `main`.

**Vérifications après remise en ligne**

- Attendre 1 à 2 minutes le déploiement GitHub Pages (onglet *Actions* du dépôt).
- Ouvrir https://espritterroir.fr en navigation privée (ou `Ctrl+F5`) : la page d'accueil doit s'afficher sans redirection.
- Tester quelques pages : `/primeur.html`, `/poulet-roti.html`, `/panier.html`.
- Vérifier qu'aucune page n'est encore redirigée : `grep -l "maintenance.html" *.html` ne doit plus renvoyer que `maintenance.html` elle-même.
- Retirer cette section du README.

### Remettre le site en maintenance plus tard

Ré-ajouter le bloc de redirection juste après `<head>` dans les 6 pages, recréer `404.html` (`git checkout 366a59b -- 404.html`), puis pousser.

## Fonctionnalités temporairement désactivées

### Section « Avis clients Google » (index.html)

Retirée du site le 27/10/2026 — **à remettre plus tard**.

- Le bloc HTML `.google-reviews-section` (liste des avis + boutons « Voir tous les avis sur Google » / « Laisser un avis ») est **commenté** dans `index.html`, dans la section `#google-business`, juste après la carte (`#map`).
- Le code JS (`displayReviews`, `displayFallbackReviewsMessage`, `updateGoogleActionButtons` dans `script.js`) et les styles (`.google-reviews-section` dans `styles.css`) sont conservés : ils ne font rien tant que le HTML est absent.
- La note Google (logo, note moyenne, étoiles, nombre d'avis) est masquée via l'attribut `hidden` sur `.google-header` dans `index.html` (règle `.google-header[hidden]` dans `styles.css`). Les éléments restent dans le DOM car `updateBusinessUI()` les remplit sans vérification.
- La note dans l'infobulle de la carte (`.map-info-rating`, fonction `showBusinessInfoWindow()` dans `script.js`) est commentée.
- Libellés modifiés :
  - titre de section `#google-business` : « Nos Infos & Avis Clients » → « Nos Infos & Horaires » (et sous-titre adapté) ;
  - menu de toutes les pages : « Avis & Infos » → « Infos & Horaires » ;
  - pied de page de `index.html` : « Avis & Contact » → « Infos & Contact ».

**Pour réactiver :**
1. `index.html` : supprimer le commentaire `<!-- Section "Avis clients Google" temporairement masquée ... -->` qui entoure le bloc des avis.
2. `index.html` : retirer l'attribut `hidden` de `<div class="google-header">` (et le commentaire au-dessus).
3. `script.js` : dé-commenter le bloc `.map-info-rating` dans `showBusinessInfoWindow()`.
4. Remettre les libellés d'origine (titre/sous-titre de section, menus « Avis & Infos », pied de page « Avis & Contact »).
5. Retirer cette entrée du README.

## Page interne protégée : rapport des avis Google

`rapport-avis-a5de75f0f127c5f5.html` : note de synthèse + liste complète des avis Google, **chiffrée** et protégée par mot de passe (mis en ligne le 11/11/2026). Deux boutons permettent de télécharger les versions PDF et CSV : ces fichiers sont intégrés au contenu chiffré (aucun PDF/CSV en clair sur le site ni dans le dépôt).

- **Pourquoi pas de `.htaccess`** : le site est sur GitHub Pages, qui ignore le `.htaccess`. Et le dépôt étant public, une page en clair serait lisible sur GitHub. Le contenu est donc chiffré (AES-256-GCM, clé dérivée du mot de passe par PBKDF2-SHA256, 600 000 itérations) et déchiffré dans le navigateur. Le fichier commité ne contient aucune donnée lisible.
- **Non indexée** : balises `noindex, nofollow, noarchive`, adresse non devinable, liée depuis aucune page, absente du `sitemap.xml`. Volontairement **absente de `robots.txt`** : un `Disallow` y révélerait l'adresse et empêcherait les robots de lire le `noindex`.
- **Hors maintenance** : la page ne contient pas le bloc de redirection, elle reste accessible pendant la maintenance.
- **Le mot de passe n'est écrit nulle part dans le dépôt** (ni dans ce README). Il est communiqué de vive voix.

**Régénérer la page** (nouvel export d'avis, ou changement de mot de passe) : le script d'export et les données sont dans `exports/` (dossier non versionné, données personnelles).

```bash
AVIS_PASSWORD="<mot de passe>" AVIS_PUBLISH_PATH="rapport-avis-a5de75f0f127c5f5.html" \
  python -P exports/export_avis_google.py <dossier Takeout décompressé> exports
```

Puis commiter et pousser le fichier. Pour **retirer** la page : supprimer le fichier, commiter, pousser.
