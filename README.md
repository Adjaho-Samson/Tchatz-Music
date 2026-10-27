# Tchatz Music

**Ta musique. Ton espace. Ton contrôle.**

Lecteur musical personnel, entièrement côté client : HTML, CSS et JavaScript natifs, HTML Audio API, File API, IndexedDB, LocalStorage, Web App Manifest et Service Worker. Aucun compte, backend, API musicale ou transfert de fichiers audio.

## Démarrage

- **Aperçu fourni avec le projet :** ouvre `index.html` dans un navigateur pour explorer l’interface. La lecture et la persistance dépendent des règles `file://` du navigateur.
- **Pour tester correctement la PWA et le mode hors ligne :** sers le dossier depuis une origine sécurisée (HTTPS, ou `localhost` pour le développement). Un hébergement statique suffit ; aucun serveur applicatif n’est nécessaire. Le panneau d’aperçu Arena donne accès à l’application, mais peut empêcher l’installation PWA ou l’enregistrement du Service Worker dans certains contextes intégrés.
- L’application demande seulement l’accès aux fichiers explicitement choisis dans le sélecteur système. Elle ne parcourt pas automatiquement les dossiers du téléphone.

## Importer et écouter sur Android

1. Ouvre Tchatz Music dans Chrome Android, idéalement depuis une adresse HTTPS.
2. Appuie sur **Importer ma musique** ou **Importer**.
3. Dans le sélecteur Android, choisis un ou plusieurs fichiers `.mp3`, `.wav`, `.ogg`, `.m4a` ou `.aac` que le navigateur déclare pouvoir lire.
4. Les fichiers sélectionnés sont copiés dans IndexedDB, dans le stockage local de cette origine. Rien n’est envoyé sur Internet. Le fichier original du téléphone n’est ni modifié ni supprimé.
5. Utilise **Bibliothèque** pour rechercher, trier, marquer des favoris et créer des playlists. Les commandes du lecteur restent disponibles en naviguant.

Les doublons portant le même nom, la même taille et la même date de modification sont ignorés. La prise en charge effective des codecs dépend du navigateur et de l’appareil. Une métadonnée MP3 ID3 est lue quand elle est disponible ; autrement le nom du fichier sert de titre, sans inventer d’artiste, d’album ou de pochette.

## Conservation des données et vie privée

- Les fichiers audio et playlists sont conservés dans IndexedDB ; les préférences, favoris et historique utilisent LocalStorage.
- Les fichiers personnels ne sont pas ajoutés au cache du Service Worker.
- Dans **Paramètres → Stockage local**, consulte l’estimation et, si le navigateur le propose, demande un stockage persistant. Cette demande peut être refusée ; l’espace disponible varie selon le navigateur et l’appareil.
- Ne vide pas les données du site ni le stockage de l’application si tu veux conserver ta bibliothèque. Le système ou le navigateur peut malgré tout évincer des données locales. Conserve les fichiers originaux et, si besoin, réimporte-les.
- **Effacer toutes les données locales** supprime la bibliothèque importée, les playlists et les préférences de ce navigateur ; cela ne supprime pas les fichiers originaux présents ailleurs sur le téléphone.

## Installation PWA

Publie le contenu de ce dossier à la racine d’un hébergement statique HTTPS, par exemple GitHub Pages, Cloudflare Pages ou Netlify. Vérifie que `index.html`, `manifest.webmanifest`, `service-worker.js` et `assets/` sont accessibles à la même origine.

Sur Android avec Chrome : ouvre l’adresse HTTPS, puis utilise le bouton **Installer** lorsqu’il apparaît, ou le menu ⋮ → **Installer l’application** / **Ajouter à l’écran d’accueil**. Le Service Worker met en cache les fichiers d’interface après une première visite réussie ; l’application peut alors rouvrir son interface hors ligne. Les morceaux importés restent dans IndexedDB. Le Service Worker ne met jamais en cache les fichiers musicaux personnels.

Pour publier gratuitement, crée un dépôt Git, dépose les fichiers du dossier à sa racine, puis active l’hébergement statique HTTPS du fournisseur choisi (par exemple Pages dans les réglages du dépôt GitHub, ou un déploiement statique Cloudflare Pages / Netlify). Aucun build ni installation de dépendances n’est requis.

## Limites navigateur / Android

- L’utilisateur doit sélectionner les fichiers ; le site n’explore pas librement tout le stockage.
- MP3, WAV, OGG, M4A et AAC ne sont lisibles que si le navigateur et les codecs présents sur l’appareil les prennent en charge.
- Android peut suspendre ou arrêter la lecture en arrière-plan, notamment écran verrouillé ou économie d’énergie. Le contrôle de toutes les commandes multimédias système n’est pas garanti.
- La persistance est propre à l’origine et au navigateur où l’import a été fait. Elle n’est pas synchronisée entre appareils et ne récupère pas un fichier dont l’accès local a été effacé.
- Un aperçu intégré comme Arena peut utiliser une origine encapsulée ou appliquer des restrictions. Si le Service Worker ou l’installation est bloqué dans l’aperçu, teste la PWA depuis un hébergement HTTPS.

## Vérifications

Les contrôles réellement exécutés et les scénarios restant à valider sur un navigateur Android sont listés dans [`TESTS.md`](./TESTS.md). Aucun test de lecture sur un téléphone physique n’est présenté comme réussi sans exécution.

## Structure

```text
index.html              Interface et éléments accessibles
style.css               Styles responsives mobile-first
app.js                  Lecteur, IndexedDB, playlists et navigation
manifest.webmanifest    Configuration PWA
service-worker.js       Cache limité aux fichiers d’interface
offline.html            Repli hors ligne
README.md               Guide de test, installation et limites
TESTS.md                Contrôles exécutés et parcours manuel
assets/icon.svg         Icône vectorielle
assets/icon-192.png     Icône d’installation 192 × 192
assets/icon-512.png     Icône d’installation 512 × 512
```
