# Trokémon (bêta)

Échanger du TCG n'a jamais été aussi simple : une carte des cartes proposées et recherchées autour de toi, des profils avec numéro de carte, photos recto/verso, état ou grade, estimation, et des propositions d'échange avec messagerie. Échange en main propre : rien ne passe par la plateforme.

Site 100 % statique (HTML, CSS, JavaScript, sans framework ni étape de build), prévu pour GitHub Pages. Les comptes, les cartes et les photos sont stockés par Supabase (offre gratuite suffisante pour une bêta).

## 1. Essayer tout de suite (mode démo)

Rien à configurer : tant que `config.js` est vide, le site tourne en mode démo avec des données fictives et rien n'est enregistré.

```
python3 -m http.server 8000
```

Puis ouvre http://localhost:8000. Les fichiers doivent être servis par un petit serveur, pas ouverts en double-cliquant dessus.

## 2. Activer les vrais comptes (Supabase)

1. Crée un compte sur supabase.com puis un projet (région Europe, par exemple Paris ou Francfort). Note le mot de passe de la base quelque part, tu n'en auras pas besoin dans le site.
2. Dans **SQL Editor > New query**, colle tout le contenu de `supabase/schema.sql` et clique sur **Run**. Le script crée les tables, les règles de sécurité (chacun ne modifie que ses données), le dossier de photos et l'arrondi de la zone côté serveur. Tu peux le relancer sans risque.
   Si la création du dossier de photos échoue à cause des droits, crée à la main un bucket nommé `photos`, public, puis relance le script.
3. Dans **Project Settings > API**, copie « Project URL » et la clé « anon public ». Colle-les dans `config.js` :
   ```js
   SUPABASE_URL: 'https://xxxx.supabase.co',
   SUPABASE_ANON_KEY: 'eyJ...',
   ```
   La clé anon est faite pour être publique : ce sont les règles de sécurité du script SQL qui protègent les données. Ne mets jamais la clé `service_role` dans ce dépôt.
4. Dans **Authentication > URL Configuration** : mets l'adresse de ton site (voir étape 3) dans **Site URL** et ajoute-la aussi dans **Redirect URLs**. Sans ça, le lien du mail de confirmation et celui de « mot de passe oublié » ne ramènent pas au bon endroit.
5. Dans **Authentication > Providers > Email**, laisse « Confirm email » activé en production. Pour tes premiers tests tu peux le désactiver, l'inscription est alors immédiate.

## 3. Publier sur GitHub Pages

1. Crée un dépôt sur GitHub (public pour l'offre gratuite) et envoie-y le contenu de ce dossier, avec `index.html` à la racine.
2. **Settings > Pages > Build and deployment** : Source « Deploy from a branch », branche `main`, dossier `/ (root)`.
3. Après une minute, le site est en ligne sur `https://TON-PSEUDO.github.io/NOM-DU-DEPOT/`. Reprends cette adresse dans l'étape 2.4.

Tous les chemins du site sont relatifs : il fonctionne dans un sous-dossier comme à la racine d'un domaine personnalisé.

## 4. Liste de vérification de la bêta

- Créer un compte, confirmer l'email, se connecter, se déconnecter.
- Photo de profil, énergie, zone : le profil apparaît sur la carte vu d'un second compte.
- Ajouter une carte loose, une carte gradée et un produit scellé dans « Je propose » (photos recto et verso obligatoires) et dans « Je recherche ».
- Ouvrir une carte d'un autre profil : photos, état, estimation, liens d'achat pour un scellé.
- Proposer un échange entre deux comptes, accepter, discuter, marquer comme effectué.
- Tester sur téléphone (Safari iPhone et Chrome Android) et sur ordinateur.

## 5. Avant d'ouvrir au public

- **Mentions légales, politique de confidentialité et conditions d'utilisation** : le site collecte emails, photos, zones et messages. Rédige-les avant d'inviter des inconnus.
- **Emails** : l'envoi d'emails par défaut de Supabase est très limité. Branche un SMTP à toi (Authentication > SMTP) avant de dépasser quelques inscriptions par heure.
- **Fond de carte** : les tuiles CARTO conviennent à une bêta. Vérifie leurs conditions avant un lancement public ou change `TILE_URL` dans `config.js`.
- **Catalogue et prix** : les cartes, numéros et prix Cardmarket viennent de l'API TCGdex (https://tcgdex.dev). Vérifie ses conditions d'utilisation avant un usage commercial. Les produits scellés n'y figurent pas : leur valeur est saisie par l'utilisateur.
- **Nom et marque** : « Trokémon » ressemble à la marque Pokémon. Fais une recherche d'antériorité (INPI, EUIPO) et prévois un nom de secours.
- **Photos** : le dossier de photos est lisible par quiconque connaît l'adresse d'une image. C'est voulu pour des photos de cartes, mais rappelle aux utilisateurs de ne rien y montrer de personnel.
- **Liens affiliés** : renseigne `AFFILIATE` dans `config.js` une fois tes comptes eBay Partner Network et Amazon Partenaires validés. Les liens concernés sont alors signalés « affilié » dans l'application.

## 6. Contenu du dossier

```
index.html            page unique
config.js             clés publiques et réglages
css/style.css         styles (sombre, mobile d'abord, bureau à partir de 900 px)
js/catalog.js         catalogue TCGdex, recherche de lieux, liens d'achat, réduction des photos
js/db.js              données : Supabase, ou démo en mémoire
js/map.js             carte Leaflet (bulles par secteur, puis zones)
js/app.js             écrans et actions
vendor/               Leaflet et supabase-js, copiés en local (pas de CDN)
supabase/schema.sql   base de données, sécurité, stockage
```

## 7. Limites connues de cette version

- Une carte gradée est rapprochée d'une carte recherchée sur la même carte, quel que soit le grade.
- Pas de notifications : les nouvelles propositions et messages apparaissent quand on ouvre la page (les messages se rafraîchissent toutes les 8 secondes dans une conversation ouverte).
- Pas de boutiques partenaires ni d'outil de modération/signalement intégré (les signalements passent par ton email de contact) : à prévoir avant l'ouverture publique.
- Estimations : uniquement automatiques. Cartes loose = cote Cardmarket via TCGdex. Cartes gradées et produits scellés : « indisponible » en bêta (voir plus bas).
- Pas d'application installable hors ligne : le site peut être ajouté à l'écran d'accueil, mais il a besoin d'une connexion.


## Mise à jour : avis, légal, emails, tuiles, prix

### 1. Relancer le schéma SQL
Colle de nouveau `supabase/schema.sql` en entier dans SQL Editor > Run : il ajoute la table `reviews` (avis 1 à 5 étoiles, uniquement entre les deux participants d'un échange « effectué »), la fonction `profile_stats` (note moyenne, nombre d'avis et d'échanges effectués, lisibles par tous les membres) et verrouille la source des estimations (`cardmarket` / `tcgplayer`, plus de saisie libre). Les anciennes valeurs saisies à la main sont remises à vide.

### 2. Mentions légales
`legal.html` contient mentions légales, confidentialité (RGPD) et conditions d'utilisation, liées depuis l'accueil, l'inscription et le profil. Remplis le bloc `LEGAL` de `config.js` avec tes vraies informations (nom, statut, adresse, email, région Supabase). Tant qu'un champ est vide, la page affiche « à compléter ». Ce texte est un modèle de départ, pas un conseil juridique : fais-le relire avant l'ouverture publique.

### 3. Emails gratuits (confirmation, mot de passe oublié)
L'envoi par défaut de Supabase est limité à 2 emails/heure et seulement vers les membres de ton équipe Supabase : il ne suffit pas pour de vrais inscrits. Branche ton propre SMTP : Supabase > Authentication > Emails > SMTP Settings. Dès que le SMTP est actif, Supabase passe à 30 emails/heure, réglable dans Authentication > Rate Limits. Options gratuites (vérifie leur page tarifs, ça bouge) : Brevo (300 emails/jour, entreprise française), Resend (100/jour, 3 000/mois, 1 domaine), Mailjet (200/jour, 6 000/mois). Pour que les mails n'aillent pas en spam, utilise un nom de domaine à toi et configure SPF/DKIM chez le fournisseur.

### 4. Tuiles de carte
CARTO impose désormais une clé gratuite pour les tuiles raster (sans clé : filigrane « API KEY REQUIRED »). Demande-la sur https://carto.com/basemaps/apikey/ puis colle-la dans `CARTO_KEY` (config.js). D'après la documentation CARTO : usage non commercial gratuit jusqu'à 5 M de requêtes par mois, commercial jusqu'à 1 M par mois ; l'attribution OpenStreetMap + CARTO doit rester visible. Lis les conditions : https://carto.com/legal/basemap-terms/. Le bouton en haut à droite de la carte bascule entre « Sombre » et « Détaillée (couleurs) », plus riche en noms de lieux et routes. Alternative sans clé ni quota annoncé : OpenFreeMap (tuiles vectorielles, attribution obligatoire), qui demande MapLibre GL à la place de Leaflet.

### 5. Estimations de prix
Les utilisateurs ne peuvent plus saisir de valeur. Cartes loose : cote Cardmarket (état Near Mint) via TCGdex, avec la date de mise à jour. Cartes gradées et scellés : pas d'API gratuite utilisable directement depuis le site en production (PokemonPriceTracker et PokeTrace ont un palier gratuit, mais non commercial et avec une clé secrète à garder côté serveur ; TCGCSV donne gratuitement des prix TCGplayer en dollars, scellés inclus). Prochaine étape : une Supabase Edge Function qui interroge l'API choisie et renseigne `value_eur` côté serveur.


### 6. Recherche d'item et séries (nouveau)
- Dans la barre de recherche de la carte, tape un nom de carte, une extension ou un numéro (`118`, `118/131`) : la section « Cartes sur la carte » liste qui propose ou cherche l'item, partout en France. Un choix filtre la carte et la liste ; la croix retire le filtre. Relance `supabase/schema.sql` (fonction `search_items`, extension `unaccent`).
- « Mes cartes » et les profils regroupent les items par série, dans des menus qui se déplient.

## Mise en ligne : quoi mettre où
**GitHub** : un dépôt public (GitHub Pages gratuit sur dépôt public) contenant le contenu du dossier `site/` à la racine : `index.html`, `legal.html`, `config.js`, `css/`, `js/`, `vendor/`, `icon.svg`, `manifest.webmanifest`, `.nojekyll`. Le dossier `supabase/` peut y rester (il ne contient que du SQL, aucun secret). Settings > Pages > Deploy from a branch > `main` / root. L'adresse sera `https://TON-PSEUDO.github.io/NOM-DU-DEPOT/`.
**Supabase** : crée un projet gratuit (région Paris ou Francfort), colle `supabase/schema.sql` dans SQL Editor > Run, puis Authentication > URL Configuration : Site URL = l'adresse GitHub Pages, et ajoute-la aussi dans Redirect URLs. Dans Project Settings > API, copie `Project URL` et la clé `anon public`, puis colle-les dans `config.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).
**Ne mets jamais** la clé `service_role`, un mot de passe SMTP ou une clé d'API secrète dans le dépôt : tout ce qui est dans GitHub Pages est public. Les clés `anon` et CARTO sont faites pour être publiques (la sécurité vient des règles RLS du schéma ; pense à restreindre la clé CARTO à ton domaine si l'option existe).
**Limites du palier gratuit Supabase** (à vérifier sur supabase.com/pricing) : base de 500 Mo, 1 Go de stockage de fichiers, 50 000 utilisateurs actifs par mois, et mise en pause du projet après environ une semaine sans activité. Les photos sont réduites à environ 1400 px côté navigateur pour économiser le stockage.


## v3 : recherche de cartes, versions, accueil

- **Re-exécute tout `supabase/schema.sql`** dans le SQL Editor (il est rejouable). Il ajoute : colonnes `set_abbr`, `variant`, `photo_optional` ; fonctions `search_items` (recherche par nom, sigle, numéro) et `showcase` (cartes proposées affichées sur l'accueil, ville uniquement, sans données personnelles).
- **Remplace aussi `config.js`** par ta version complète.
- Ajout de cartes : recherche en direct (sans bouton), sélection de plusieurs cartes, une ligne par version (Normale, Reverse, Holo, tampon, etc. selon ce que fournit TCGdex), séries rangées par génération (Méga-Évolution, Écarlate et Violet…), plus de limite à 80 cartes.
- Photos : facultatives pour les cartes courantes (commune, peu commune, rare, holo rare) ; obligatoires pour les cartes ex/GX/V, gradées, scellées et manuelles.
- Libellés `Nom (SIGLE - 110/84)` ; le sigle est pris en compte dans les recherches.
- À vérifier sur ton site : le champ `abbreviation` de TCGdex, les versions Masterball/Cosmos/tampon et les images de secours dépendent de l'API réelle et n'ont pas pu être testés d'ici.

## E-mails Trokémon (objet et expéditeur)
Le titre « Supabase » vient du tableau de bord, pas du code :
1. Authentication > Email Templates > « Confirm signup » : objet `Confirmez votre email Trokémon`, corps = `supabase/email-templates/confirm.html`. Idem « Reset password » avec `recovery.html`.
2. Nom d'expéditeur « Trokémon » : Authentication > SMTP Settings, activer un SMTP personnalisé (Resend, Brevo…) et renseigner Sender name = Trokémon. Avec l'expéditeur par défaut de Supabase, il n'est pas modifiable.

## Prix Cardmarket (data/prices.json)
Le workflow `.github/workflows/prices.yml` télécharge chaque nuit le guide des prix et le catalogue Cardmarket (fichiers publics), les associe aux cartes TCGdex et écrit `data/prices.json` + `data/report.md`. Lancement manuel : onglet Actions > « Prix Cardmarket » > Run workflow. Le site lit `data/prices.json` quand il existe (sinon cote TCGdex). Dans Settings > Actions > General, autorise « Read and write permissions » pour le workflow.

## Expéditeur d'e-mails personnalisé (SMTP)

Sans SMTP personnalisé, Supabase envoie depuis son propre serveur : très limité (quelques e-mails par heure) et expéditeur « Supabase Auth ». À faire avant d'ouvrir au public :

1. **Un nom de domaine** (~8 €/an chez OVH, Gandi, Porkbun…). Sans domaine à toi, les e-mails finissent presque toujours en spam (un « @gmail.com » comme expéditeur est refusé par les règles DMARC de Google).
2. **Un fournisseur d'envoi** avec offre gratuite : Brevo (300 e-mails/jour), Resend (3 000/mois) ou MailerSend. Crée un compte, ajoute ton domaine, puis copie les enregistrements DNS qu'il te donne (SPF, DKIM, DMARC) chez ton registrar. Attends « vérifié ».
3. Supabase > **Authentication > Emails > SMTP Settings** : active « Enable custom SMTP » et renseigne l'hôte, le port (587), l'utilisateur, le mot de passe/clé API du fournisseur, l'adresse expéditrice (ex. `no-reply@tondomaine.fr`) et le nom d'expéditeur `Trokémon`.
4. **Authentication > Emails > Templates** : colle `supabase/email-templates/confirm.html` (Confirm signup) et `recovery.html` (Reset password), avec les objets « Confirme ton e-mail Trokémon » et « Réinitialise ton mot de passe Trokémon ».
5. Teste : crée un compte avec une adresse Gmail et une adresse Outlook ; vérifie que le mail arrive en boîte de réception.
6. Ajoute le nom du fournisseur d'e-mails dans `legal.html` (sous-traitants) si tu veux le nommer.

## Modération (signalements, blocages, suspension)

- Les membres signalent depuis un profil ou un échange (motifs : arnaque, fausses photos, comportement, contenu, spam, autre) et peuvent bloquer (plus de carte, de proposition ni de message entre eux).
- **Lire les signalements** : Supabase > Table Editor > `reports` (tri par `created_at`, colonne `status` à passer à `reviewed`/`closed`). Prévois de regarder au moins une fois par jour une fois ouvert au public.
- **Suspendre un compte** : Table Editor > `profiles` > coche `banned` : le profil et toutes ses cartes disparaissent pour les autres. Pour une suppression complète : Authentication > Users > supprimer l'utilisateur.
- Les membres peuvent exporter leurs données et supprimer leur compte depuis Profil > Sécurité et données (fonctions `export_my_data` et `delete_my_account` : relance `supabase/schema.sql`).
- Quand le nombre de signalements dépasse ce que tu peux traiter seul, recrute 1 ou 2 modérateurs bénévoles de confiance (compte Supabase « lecture seule » sur `reports`) avant d'envisager de payer quelqu'un.

## Soutien (don)

`config.js` > `SUPPORT_URL` : colle ton lien Ko-fi / Buy Me a Coffee / Tipeee. Un bloc « Soutenir Trokémon » apparaît alors dans le Profil. Vide = rien d'affiché.

## Soutiens Tipeee (aura « dresseur »)

Colonne `supporter` de `profiles` (relance `supabase/schema.sql`) : valeurs `dresseur` (aura animée aux couleurs de l'énergie du membre, partout où sa photo apparaît sauf sur les pastilles de la carte) ou `tipeur` (pas d'effet visuel, sert à ta liste de remerciements). Tu la renseignes à la main dans Supabase > Table Editor > `profiles` ; un membre ne peut pas se l'attribuer lui-même. Pour retrouver un soutien, demande-lui son pseudo Trokémon à l'inscription sur Tipeee.


## Séries, produits scellés et scan (novembre 2026)

- **Logos de séries** : la liste des séries est mémorisée dans le navigateur (IndexedDB) et rafraîchie en arrière-plan ; les logos sont préchargés une fois puis gardés par le service worker (`sw.js`). Une série sans logo affiche un badge (sigle) puis l'image d'une de ses cartes.
- **Produits scellés exacts** : `scripts/build-prices.mjs` lit aussi le catalogue « non-singles » de Cardmarket et écrit `data/sealed.json` (produits et cotes par série). Lance le workflow « Prix Cardmarket » (Actions > Run workflow) pour le créer ; tant que le fichier n'existe pas, le bloc « Produits exacts par série » n'apparaît pas.

## Images manquantes (admin)

Quand une image de carte ou un logo de série est introuvable, l'appareil le signale (une fois par semaine) dans la table `missing_images`.
1. Relance tout `supabase/schema.sql` (ajoute `profiles.admin`, `image_overrides`, `missing_images`, le bucket `catalog`).
2. Dans Supabase > Table Editor > `profiles`, mets `admin = true` sur ta ligne.
3. Profil > « Admin : images manquantes » : liste des séries/cartes manquantes, bouton **Ajouter** pour envoyer l'image (logo de série : PNG transparent). Elle s'affiche ensuite chez tout le monde ; **Retirer** pour l'annuler.
