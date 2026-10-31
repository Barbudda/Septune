# Septune, direction artistique

## Refonte du 2026-10-31 : la forge en particules (en vigueur sur le site marketing)

Décision complète et mesures : [ADR 0003](adr/0003-accueil-en-chapitres-sculptes.md). Ce bloc
remplace, **pour le site marketing**, le verre liquide et la scène de fond décrits plus bas. Ces
sections restent à jour pour l'application, qui garde son verre.

**Mot de ton : l'établi.** Un outil posé sur une table propre : une sculpture qui se forme, une
ligne de texte en mono, rien qui encombre.

- **Le matériau, c'est le nuage de points.** Les particules sont les pages d'un site : en
  désordre, elles se rangent en une sculpture ; la souris les dérange (un petit fluide), elles
  se remettent en place. Il y a une sculpture par chapitre de l'accueil :
  - le logo (deux chevrons autour d'un point, dans son carré) ;
  - une pull request ;
  - l'arbre d'un site ;
  - une coche dans un anneau ;
  - le logo encore.

  Points gris chaud, quelques points en fusion qui scintillent, lumière compressée en douceur
  pour que les nœuds denses ne saturent pas.
- **La construction suit le scroll, une seule fois.**
  - **La construction :** la sculpture d'un chapitre se forme pendant qu'il entre à l'écran,
    dans la partie déjà visible de ce chapitre. Elle ne passe jamais derrière le texte du dessus.
  - **La révélation :** une fois construite, la sculpture glisse à droite (en haut, atténuée,
    sur mobile) et le texte se lit d'un balayage de gauche à droite.
  - **La remontée :** rien ne se rejoue. Seule la sculpture reprend la forme du chapitre, en
    moins d'une seconde.
- **Surfaces : des filets, pas du verre.** Plaques plates à filet de 1 px (`.forge-ui .lg`),
  étiquettes sur fond `elevated`, blocs de code sur `code`. Pas d'ombre, pas de flou.
- **Interface en mono minuscule** (JetBrains Mono 13 px) : navigation, étiquettes entre
  crochets (`[where it's caught]`, en `molten-bright`), liens soulignés d'un filet qui passe à
  l'orange au survol. Fraunces reste pour les titres, Schibsted Grotesk pour le texte courant.
  Pas de capitales : les labels en capitales sont un tic de page générée.
- **Navigation :** une ligne, sans barre. Le logo, `audit`, `docs`, `pricing`, `sign in`, et une
  pastille ronde avec le nombre de contrôles. Un fondu vers le fond la garde lisible.
- **Repli :** la scène se charge après le premier affichage. Sans WebGL2, la page se lit sans elle.
  Avec `prefers-reduced-motion`, les sculptures sont fixes et tout le texte est visible d'emblée.

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
