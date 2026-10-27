# Vérifications — Tchatz Music

Date de vérification : 27 octobre 2026.

## Contrôles exécutés dans l’environnement de développement

- `node --check app.js` — syntaxe JavaScript valide.
- `node --check service-worker.js` — syntaxe du Service Worker valide.
- `python3 -m json.tool manifest.webmanifest` — manifeste JSON valide.
- Analyse HTML par `html.parser` — aucun identifiant HTML dupliqué ; toutes les références `getElementById()` correspondent à un élément existant.
- Contrôle des ressources locales — feuilles CSS, JavaScript, manifeste et icônes présents.
- Requêtes HTTP locales sur l’interface, les scripts, le manifeste, la page hors ligne et les icônes — réponses HTTP 200 ; manifeste servi en `application/manifest+json`.
- Smoke test avec DOM et IndexedDB simulés : import multiple, affichage et recherche, démarrage de lecture simulé, suivant/précédent, déplacement de progression, modes aléatoire/répétition, favoris et création/ajout/renommage/suppression de playlist. Ce test valide le flux JavaScript avec des mocks, pas le décodage audio réel.
- Aperçu statique lancé sur un serveur local et exposé dans Arena.

## Non exécuté ici

Cet environnement ne fournit pas de navigateur graphique contrôlable ni de téléphone Android. Les scénarios réels d’import et de décodage audio, les autorisations du sélecteur Android, l’écriture IndexedDB lors d’un redémarrage, la mise en cache Service Worker après une première visite, l’installation Android et la lecture écran verrouillé ne sont donc **pas déclarés comme testés**. Leurs résultats dépendent en outre du navigateur, du codec et des réglages du téléphone.

## Parcours de validation conseillé sur Android / HTTPS

1. Importer un MP3, puis plusieurs fichiers MP3/WAV/OGG/M4A/AAC pris en charge ; vérifier le progrès, les doublons et un fichier au format non accepté.
2. Lire, mettre en pause et reprendre ; tester précédent, suivant, le curseur de progression et le volume.
3. Activer le mélange et faire défiler les modes de répétition (file, morceau, désactivé).
4. Marquer un favori ; créer une playlist, ajouter/retirer un morceau, renommer et supprimer la playlist ; vérifier que supprimer une playlist ne retire pas les fichiers.
5. Rechercher un titre/fichier et trier par date puis alphabétiquement.
6. Recharger ou rouvrir l’application ; vérifier que les fichiers, playlists et préférences sont encore accessibles et que le dernier morceau n’est pas lancé automatiquement.
7. Après la première mise en cache HTTPS, couper la connexion et rouvrir l’application ; le cache concerne l’interface uniquement. Tester la lecture des blobs locaux.
8. Retirer un morceau dans Tchatz Music, puis tester un fichier dont l’accès local a été supprimé ou dont le codec n’est pas lisible.
9. Tester l’installation depuis Chrome Android et l’interface sur un écran étroit. Vérifier séparément le comportement écran verrouillé : il n’est pas garanti par une PWA.
