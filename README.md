# GorvCorp — Astro

Page d’accueil responsive inspirée de `DESIGN.md`, réalisée avec Astro. Le HTML est généré au build ; les interactions utilisent du TypeScript léger côté navigateur.

## Démarrage

Utiliser une version compatible de Node.js (au minimum 22.23.4) et npm 10.9.8. Docker utilise Node.js 24 LTS. Le fichier `.nvmrc` sélectionne également Node.js 24 si `nvm` est installé (`nvm install`, puis `nvm use`) ; `nvm` n’est pas obligatoire.

Sur macOS Apple Silicon, si une version compatible est déjà installée via Homebrew mais que `node --version` affiche une ancienne version, sélectionner le Node de Homebrew dans le terminal courant :

```sh
export PATH="/opt/homebrew/opt/node/bin:$PATH"
node --version
```

```sh
npm ci
npm start
```

Ouvrir http://localhost:4321.

```sh
npm run check
npm run build
npm run preview
```

La version de production est générée dans `dist/`. `npm run build` vérifie les types avant de générer le site. `npm run preview` permet de vérifier ce résultat localement.

- `src/pages/index.astro` : page d’accueil et contenu.
- `src/layouts/Layout.astro` : document HTML, métadonnées et styles globaux.
- `src/styles/home.css` : styles responsive de la page.
- `src/scripts/home.ts` : menu mobile, formulaire et initialisation du lecteur Twitch.
- `public/` : images copiées telles quelles dans le build.

## Vérification

```sh
npx playwright install chromium
npm test
```

Les tests lancent le build de production puis vérifient le rendu statique, le menu mobile, le formulaire et les paramètres du lecteur Twitch. La réponse Twitch est isolée dans les tests ; la lecture du flux reste à vérifier sur le domaine HTTPS de production.

## Périmètre du draft

- Accueil, line-ups, WebTV, recrutement et contact.
- Navigation mobile, liens d’ancrage et formulaire avec validation native.
- Logo fourni converti en WebP sans perte : `public/gc-logo.webp` (10 630 octets, contre 13 266 pour le PNG).
- Le formulaire simule la validation et affiche explicitement qu’aucun message n’est envoyé. Aucun backend ni stockage de données personnelles.
- Le statut Twitch n’est pas simulé : seul le rendez-vous du vendredi est annoncé, en heure de Paris.
- Les liens Discord/YouTube et les pages juridiques sont à ajouter lorsque leurs destinations officielles seront fournies.
- Image d’illustration Unsplash hébergée dans `src/assets/gaming-arena.jpg` (source : `https://images.unsplash.com/photo-1542751371-adc38448a05e`), optimisée en AVIF/WebP par Astro ; visuel LoL également optimisé. Police Plus Jakarta Sans auto-hébergée via Fontsource (licence OFL incluse dans le package).

## Référencement naturel

Le domaine canonique est `https://www.gorvcorp.fr/`, conformément à `DESIGN.md`. Pour changer de domaine, modifier `site` dans `astro.config.mjs`, puis reconstruire l’image : les URL canoniques, le sitemap, `robots.txt` et les données structurées utilisent cette valeur.

- Métadonnées françaises, Open Graph et carte Twitter/X avec le logo officiel.
- Données structurées JSON-LD `Organization`, `WebSite` et `WebPage`, limitées aux informations présentes sur le site.
- Sitemap généré automatiquement à `/sitemap-index.xml`, déclaré dans `/robots.txt` ; la page 404 en est exclue.
- Vraies réponses HTTP 404 dans Nginx, page d’erreur `noindex` et redirection permanente de `/index.html` vers `/`.
- Images responsives avec dimensions explicites, image principale chargée en priorité, police locale préchargée, compression gzip et cache long pour les ressources avec empreinte dans `/_astro/`.

Les tests `npm test` vérifient aussi ces métadonnées dans le HTML sans JavaScript, le sitemap, les erreurs 404 et les ressources locales. Les en-têtes Nginx s’appliquent à l’image Docker, pas au serveur de développement Astro.

Après publication : configurer HTTPS et les redirections du domaine sans `www` et de HTTP vers `https://www.gorvcorp.fr/` sur le reverse proxy du VPS ; vérifier le domaine dans Google Search Console et soumettre `/sitemap-index.xml`. Protéger les environnements de préproduction par authentification ou un en-tête `X-Robots-Tag: noindex`. Mesurer ensuite les Core Web Vitals sur le domaine public. Aucun classement ni délai d’indexation n’est garanti.

## Docker et publication automatique

Chaque push sur `main` construit le site Astro en production et publie son image Nginx sur GitHub Container Registry :

- `ghcr.io/christophechr/gorvcorpintratest:latest`
- `ghcr.io/christophechr/gorvcorpintratest:build-<numéro de run>.<tentative>`

Le workflow `.github/workflows/docker-publish.yml` utilise le `GITHUB_TOKEN` automatique avec les permissions `packages: write` (registre) et `contents: write` (releases). Aucun secret supplémentaire n’est nécessaire. GitHub Actions doit être activé sur le dépôt ; les éventuelles politiques de l’organisation doivent autoriser la publication de packages. Le workflow peut aussi être lancé manuellement sur `main`.

```sh
docker build -t gorvcorp:local .
docker run --rm -p 8080:80 gorvcorp:local
```

Ouvrir http://localhost:8080. L’image sert le HTML statique généré par Astro et expose `/healthz` pour vérifier son état.

Pour utiliser l’image publiée :

```sh
docker pull ghcr.io/christophechr/gorvcorpintratest:latest
docker run --rm -p 8080:80 ghcr.io/christophechr/gorvcorpintratest:latest
```

Si le package est privé, s’authentifier à GHCR avec un compte autorisé et un jeton disposant de `read:packages` avant le téléchargement.

## Télécharger une image depuis les releases

Chaque push sur `main` publie aussi une release `build-<numéro de run>.<tentative>` contenant une archive telle que `gorvcorp-build-42.1-linux-amd64.tar.gz` : l’image complète pour Linux x86-64.

La release cible le commit construit. Une nouvelle tentative du workflow crée une release distincte. Le même tag identifie la release GitHub et l’image Docker. Par exemple, `build-42.1` correspond au run 42, première tentative. L’archive est exportée depuis cette image taguée.

Télécharger l’archive depuis [GitHub Releases](https://github.com/christophechr/gorvcorpintratest/releases), puis :

```sh
docker load -i gorvcorp-build-42.1-linux-amd64.tar.gz
docker run --rm -p 8080:80 ghcr.io/christophechr/gorvcorpintratest:build-42.1
```

Remplacer `build-42.1` par le tag de la release téléchargée. `docker load` accepte directement l’archive gzip ; aucun accès au registre GHCR n’est nécessaire pour la charger. L’image est destinée aux machines amd64 ; sur Apple Silicon, Docker nécessite l’émulation avec `--platform linux/amd64` au lancement.

## Déploiement automatique sur le VPS

Après la publication de la release, GitHub Actions transfère l’archive par SSH et déploie un nouveau conteneur `gorvcorp` dans `/home/debian/gorvcorp`, avec l’utilisateur `debian`. Nginx est inclus dans l’image ; aucune installation de Nginx ou Docker Compose sur le VPS n’est nécessaire.

Configurer les secrets dans **Settings → Environments → VPS_1 → Environment secrets**. Le job utilise cet environnement pour accéder aux secrets. Les variables facultatives peuvent être définies dans ce même environnement :

| Type                 | Nom              | Valeur                                          |
| -------------------- | ---------------- | ----------------------------------------------- |
| Secret               | `VPS_HOST`       | Adresse IP ou nom DNS du VPS                    |
| Secret               | `VPS_SSH_KEY`    | Clé privée SSH dédiée, sans passphrase          |
| Secret               | `VPS_KNOWN_HOST` | Entrée SSH connue du VPS (format `known_hosts`) |
| Variable facultative | `VPS_SSH_PORT`   | Port SSH, `22` par défaut                       |
| Variable facultative | `VPS_HTTP_PORT`  | Port local du conteneur, `8080` par défaut      |

Ajouter la clé publique correspondante à `/home/debian/.ssh/authorized_keys`. L’utilisateur `debian` doit pouvoir exécuter Docker directement ou via `sudo -n docker`. Le VPS doit être Linux amd64 et le port local 8080 doit être libre. Nginx sur le VPS relaie les requêtes publiques vers `http://127.0.0.1:8080`.

Pour obtenir l’entrée `known_hosts`, depuis une machine qui connaît déjà le VPS :

```sh
ssh-keygen -F ADRESSE_DU_VPS
# Pour un port SSH personnalisé :
ssh-keygen -F '[ADRESSE_DU_VPS]:PORT_SSH'
```

Copier la ligne de clé de l’hôte dans `VPS_KNOWN_HOST`. Cette authentification SSH est indépendante de la vérification d’archive SHA-256 supprimée.

Le déploiement teste `/healthz` dans un conteneur temporaire avant de remplacer le site. Une courte interruption accompagne le remplacement. Si le nouveau conteneur ne démarre pas correctement, le précédent est restauré. Le conteneur précédent est conservé arrêté sous `gorvcorp-previous` jusqu’à la mise à jour suivante ; l’archive transférée est supprimée après succès. Le tag actif est écrit dans `current-image.txt`.

Le conteneur écoute uniquement sur `127.0.0.1:8080` (ou le port configuré). Nginx sur le VPS doit être configuré comme reverse proxy pour rendre le site accessible. Le HTTPS et le nom de domaine ne sont pas configurés par ce workflow. Les releases restent disponibles même si le déploiement échoue.

## Lecteur Twitch

La section WebTV intègre le lecteur officiel de `GorvCorptv`, sans lecture automatique. Le paramètre Twitch `parent` utilise le nom d’hôte courant, sans port. En production, Twitch exige un domaine servi en HTTPS : le déploiement HTTP actuel du VPS devra donc recevoir un domaine et un certificat TLS pour la lecture intégrée.

Le lecteur conserve au moins 400 × 300 px ; sur les petits écrans qui ne permettent pas cette largeur, un lien ouvre Twitch. Le bouton externe reste disponible sur tous les écrans.
