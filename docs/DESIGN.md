# Septune, direction artistique

## Refonte du 2026-11-01 : pétrole, vert-de-gris et fusion (en vigueur sur le site marketing)

Décisions et mesures : [ADR 0004](adr/0004-images-qui-racontent-et-palette.md), qui révise
l'[ADR 0003](adr/0003-accueil-en-chapitres-sculptes.md). Ce bloc remplace, **pour le site marketing**,
le verre liquide et la scène de fond décrits plus bas ; l'application garde son verre et ses couleurs.

Retour d'Hugo sur la première version : « le reste de la page est noir et sans vie », le logo en
particules « ne sert à rien », l'animation doit « bouger elle-même, bouger dans la page, se
déformer avec le scroll et représenter ce que dit le texte », et le hero doit être **majestueux**.
Couleurs : deux majoritaires qui vont bien ensemble, plus une vive qui donne de la personnalité.

**Mot de ton : la forge.** Du métal en fusion et sa patine.

- **Couleurs.**
  - **Deux tons dominants :** le pétrole profond (`#041b1f`, le fond, jamais de noir) et le
    vert-de-gris (`#4fbfae`, `#8fdccf` en clair), la patine du cuivre.
  - **Une couleur vive :** l'orange en fusion (`#ff6a2b`), sur de petites surfaces
    seulement (l'action principale, les éclats du robot, ce qui casse).
  - **Les neutres :** le texte est os (`#f1ebdf`) ; les panneaux os portent l'encre
    pétrole (`#10282c`) et l'orange assombri (`#a8380a`, 5,2:1).

  Les jetons sont redéfinis sous `.forge-ui` (globals.css), et les contrastes sont calculés
  en commentaire.
- **Des images qui disent le texte, faites de particules qui ne s'arrêtent jamais** (`structures.ts`) :
  - **hero :** un site en arborescence, une page d'accueil à la racine d'où s'ouvrent les
    sections et les pages, en éventail ; des éclats en fusion (le robot) courent dans les
    branches ;
  - **ce qu'il lit :** le même arbre, de trois quarts ; un front en fusion le parcourt de la
    racine aux feuilles à mesure qu'on lit, et les pages lues passent au vert ;
  - **où c'est attrapé :** un flux de déploiements traverse trois portes alignées sur les trois
    colonnes ; les pages fautives, en fusion, s'entassent à la porte de la pull request, qui
    chauffe ;
  - **comment c'est corrigé :** un fichier vu comme ses lignes, en jetons de deux tons ; la
    ligne noindex s'arrache, le fichier se referme et verdit ;
  - **pour commencer :** 25 petits sites ; 1, puis 5, puis 25 s'allument au fil des offres.
- **Mouvement.**
  - **L'image suit sa page.** Elle est posée dans la zone `[data-stage]` de son chapitre et
    défile avec elle.
  - **D'un chapitre à l'autre,** elle se transforme et voyage d'une zone à l'autre, au rythme
    du scroll, dans les deux sens.
  - **Elle vit seule :** flux, respiration, balancement, et la souris la dérange.
  - **Le texte se lit une seule fois** (balayage de gauche à droite) ; rien ne se rejoue en
    remontant.
- **Hero.**
  - **Le cadre :** plein écran, champ pétrole, brume vert-de-gris là où pousse l'arbre, braise
    orange à sa racine.
  - **Le titre :** monumental et centré, « Ship fast. » en os et « Stay indexed. » en
    Fraunces italique vert-de-gris.
  - **La lisibilité :** une clairière sombre, posée au-dessus des particules, garde le texte
    lisible.
- **Surfaces.**
  - **Les panneaux os** montent ce que le produit produit vraiment (le check de PR, le diff,
    les offres) comme du papier posé sur le pétrole.
  - **Ailleurs :** des filets de 1 px, et un grain fin sur toute la surface.
- **Typographie.**
  - **Fraunces** pour les titres, avec une seconde voix en italique (`<em>` dans h1/h2).
  - **Schibsted Grotesk** pour le texte.
  - **JetBrains Mono** en minuscules pour l'interface et les étiquettes entre crochets.
- **Pied de page :** le nom en Fraunces italique géant, coupé par le bas de la page, sur la braise.
- **Repli :** la scène se charge après le premier affichage. Sans WebGL2, la page se lit sans elle.
  Avec `prefers-reduced-motion`, les images sont fixes et tout le texte est visible d'emblée.

## Refonte du 2026-10-08 (verre liquide, en vigueur dans l'application)

Périmètre de la première passe : le site marketing. Le tableau de bord hérite des jetons
(couleurs, polices) mais pas encore des compositions.

## Concept : la forge, en verre liquide

Le nom fait le travail : Septune, l'atelier où le chaos SEO d'un site est refondu en structure
propre. Le matériau de la forge, c'est le verre en fusion. Il ne sert pas de décor : c'est la
matière de l'interface elle-même. Chaque surface encadrée (barre de navigation, cartes, onglets,
bulles du chat, boutons, étiquettes, champs) est une plaque de verre liquide posée au-dessus de
la scène.

Décision d'Hugo du 2026-10-08 : **pas d'objet graphique en fond qui gêne la lecture.** Une boule
de verre 3D a été essayée puis retirée. Le style « molten glass » s'applique aux cadres, onglets
et bulles, pas à un élément décoratif.

## Le verre liquide (le matériau)

Références copiées : la démo [molten-glass](https://rubjo.github.io/molten-glass/examples/)
(bord épais qui courbe ce qui passe dessous, centre net, frange chromatique) et les composants
Liquid Glass d'Apple recréés par [kube.io](https://kube.io/blog/liquid-glass-css-svg/) (barre en
pilule, profil de bord « squircle » convexe, réfraction calculée par la loi de Snell).

- **`.lg`** (globals.css, `@layer components`) : teinte chaude translucide sur un fond flouté et
  saturé (`backdrop-filter: blur(16px) saturate(165%)`), arête spéculaire en haut (`inset 0 1px`),
  liseré dégradé de 1 px (clair en haut à gauche, chaud en bas à droite), reflet courbe sur la
  partie haute, et une **lueur de verre en fusion** (orange, très douce) qui se rassemble au bas
  de la plaque. C'est la signature « molten ».
- **`.lg-thin`** : verre plus fin pour les boutons secondaires, champs, bulles de réponse et entrées
  de liste. **`.lg-chip`** : arête de verre sur les étiquettes mono qui gardent leur teinte de sens
  (rouge = problème, vert = validé). **`.lg-molten`** : verre en fusion opaque pour l'action
  principale et les bulles de l'utilisateur, éclairé par le haut, plus sombre à la lèvre.
- **Réfraction réelle** (`src/components/ui/liquid-refraction.ts`) : pour la taille et le rayon
  exacts de l'élément, une carte de déplacement est calculée (bord en squircle convexe, indice 1,5)
  et passée en `backdrop-filter: url(#…)`. Les bords courbent la scène qui passe dessous, le centre
  reste net. Chrome et Edge uniquement ; ailleurs, le matériau CSS seul. Appliquée à la barre de
  navigation, à la carte PR du hero et au panneau du chat.
- Formes : pilules (`rounded-full`) pour la navigation, les boutons, les champs et les étiquettes ;
  `rounded-2xl` pour les plaques ; bulles de chat à coin coupé côté émetteur.
- Accessibilité : texte toujours sur une teinte sombre à 50 % minimum ; `prefers-reduced-transparency`
  et l'absence de `backdrop-filter` rendent des surfaces opaques.

## La scène de fond

Le champ WebGL « code chaos → SEO clarity » et les systèmes de points restent derrière, avec
l'estompage au repos : c'est ce que le verre réfracte et floute. Aucun nouvel objet n'y est ajouté.

## Couleur

Un accent fort, un accent sémantique, des neutres chauds.

| Jeton | Valeur | Rôle |
|---|---|---|
| `bg` | `#0a0908` | graphite chaud, jamais noir bleu |
| `surface` / `elevated` | `#141210` / `#1d1a17` | surfaces opaques (app, replis sans flou) |
| `border` | `#2a2521` | bordures fines, seule séparation des surfaces |
| `fg` / `fg-muted` / `fg-subtle` | `#f3efe9` / `#b4aca2` / `#8f877e` | texte, AA vérifié sur `bg` |
| `molten` | `#ff7a2f` | l'accent unique : actions, liens, focus, chaleur |
| `molten-bright` | `#ff9a5c` | texte d'accent sur fond sombre |
| `ink` | `#170b04` | texte posé sur `molten` (contraste > 7:1) |
| `signal` | `#34e0a1` | uniquement « validé, corrigé, prêt » |

Le bleu électrique est retiré. Le cyan ne vit plus que dans la scène (jetons résolus), les états
actifs des plaques, et le dégradé de la section signature « code chaos → SEO clarity », la seule exception autorisée
au texte en couleur dégradée.

## Typographie

- Titres (h1, h2 du site marketing) : **Fraunces**, axe `opsz` haut, graisse 500, sans
  `SOFT` ni `WONK`. Une serif éditoriale pour un outil de développeur, comme une étiquette de
  fonderie : ça distingue Septune des landing pages en grotesque par défaut.
- Texte et interface : **Schibsted Grotesk**. Remplace Inter (signal n°10).
- Code : **JetBrains Mono**, conservée : c'est la police que les développeurs ont déjà dans leur
  éditeur, et la carte PR doit ressembler à leur outil.

## Mouvement

Le mouvement montre un état, pas une ambiance.

- Les jetons de la scène racontent le scroll. Le verre ne bouge pas : il réfracte ce qui passe
  derrière. Le texte n'a pas d'animation d'entrée.
- Pas de flèche qui glisse au survol (n°25), pas de `hover:scale` (n°28).
- `prefers-reduced-motion` : aucune scène WebGL, rien ne bouge.

## Surfaces et décor

- Toutes les surfaces encadrées du site marketing sont en verre liquide (voir plus haut). Pas de
  carte opaque grise à côté d'une carte en verre : un seul matériau.
- Pas de halo de couleur sous les boutons, pas d'ombre lourde : une ombre de contact sombre et
  diffuse, c'est tout.
- Les blocs de code restent sur `bg-code` opaque, à l'intérieur du verre, pour la lisibilité.

## Signaux vibecodés gardés volontairement

- n°8 verre dépoli : c'est le matériau choisi par Hugo (2026-10-08), tenu sur toutes les surfaces,
  avec une vraie scène derrière à flouter et réfracter, une réfraction calculée et un repli opaque.
- n°19 arrondis : le verre liquide a des formes en pilule et en plaque arrondie, c'est sa forme ;
  deux rayons seulement (`rounded-full`, `rounded-2xl`).

- n°2 icônes lucide : gardées dans l'app, trait et taille fixes ; sur le site marketing, réduites
  aux icônes fonctionnelles (GitHub, chat).
- n°14 fenêtre de terminal : la section éditeur montre une vraie session Claude Code avec les
  vrais outils MCP de Septune, c'est une démonstration du produit, pas un décor.
- n°16 coches : uniquement dans la carte PR, où elles reproduisent les vérifications réelles d'une PR.
