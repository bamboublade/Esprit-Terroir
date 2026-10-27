# Esprit-Terroir

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
