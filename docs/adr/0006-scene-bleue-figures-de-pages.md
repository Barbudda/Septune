# ADR 0006 : une scène bleue, des figures faites de pages, papier, outremer et vert-jaune

- **Date** : 2026-11-01 (soir)
- **Statut** : acceptée ; remplace les ADR [0004](0004-images-qui-racontent-et-palette.md) et
  [0005](0005-plaques-et-fond-ecrit.md) pour l'accueil et la palette du site marketing
- **Origine** : Hugo, sur la version de l'ADR 0005 : « Tout va trop vite, je trouve que les figures
  n'ont pas de rapport avec le texte, ce n'est pas fluide. Au lieu de se placer fluidement sans se
  toucher (simplement de façon logique), tout se mélange et c'est l'anarchie. La page semble trop
  vide. L'identité des couleurs n'est pas bonne. Il faut deux couleurs "banales" qui vont bien
  ensemble (blanc et bleu, bleu et noir…) et une couleur vive qui va faire passer le site de joli à
  mémorable. […] Mélange les choses bien de ces vidéos. Fais aussi des recherches web pour trouver ce
  qui marche bien dans les tools de SEO qui marchent. Ne fais pas quelque chose de trop sombre. »
  Deux vidéos de référence dans `design_videos/` (non versionnées).

## Contexte

Un diagnostic mesuré de la version de l'ADR 0005, fait sur la géométrie réelle en 1440 × 900 :

- **Trop vite.** Le passage d'une image à la suivante tenait en 0,6 écran de scroll. La moitié des
  particules changeait de figure en 110 px.
- **L'anarchie.** L'image voyageait d'une plaque à l'autre jusqu'à 5,5 fois plus vite que le
  scroll, en traversant le texte, et tournait de 62° dans le même temps.
- **Pas fluide.** Tout était une fonction directe de la position du scroll : un coup de molette
  jouait une transformation entière d'un coup.
- **Les figures.** Elles étaient abstraites : un éventail, trois anneaux, des barres, des « Y ».
  Aucune ne montrait une page, une pull request ou un fichier.
- **La souris.** Elle remuait l'image depuis n'importe où dans la page.

Ce que montrent les vidéos de Hugo :

- **Vidéo 1.** Un seul objet en particules reste au centre et se transforme sur place (arbre,
  cube, sphère). Le texte vient se poser autour sans jamais le toucher, les titres apparaissent
  lettre par lettre en sortant d'un flou, des cartes numérotées 01 à 04 marquent les étapes.
- **Vidéo 2.** La figure est littérale : le globe est le mot GLOBE. Une seule chose bouge par
  écran, et une couleur vive porte l'identité.

Les deux sont presque noires : Hugo demande d'en garder le meilleur, pas l'obscurité.

Ce que font les outils SEO et les outils pour développeurs qui marchent, d'après 25 pages d'accueil
capturées et mesurées :

- **La page est claire.** Le bleu nuit ou l'outremer sert de couleur sombre, en bandes de
  ponctuation.
- **Deux neutres et une couleur vive.** La vive reste sous environ 4 % de la surface et marque
  l'action et les mots clés du titre. Conductor prend un vert-jaune pour son bouton, Linear un
  chartreuse.
- **Le produit avant l'ambiance.** Une phrase, une figure qui montre exactement cette phrase.
- **Le parcours en verbes.** Une barre de quatre étapes nommées par des verbes.

Les études citées par la recherche vont dans le même sens :

- l'image doit arriver avec ses mots et à côté d'eux ;
- un décor animé derrière le texte ralentit la lecture ;
- découper un récit en segments, avec des pauses, le rend compréhensible.

## Décision

1. **Palette.** Deux couleurs banales qui vont bien ensemble, le papier (`#f3f5fb`, jamais le
   blanc pur) et l'outremer (`#2440e6`), avec l'encre bleu nuit (`#0e1a3f`) pour le texte, et une
   couleur vive, le vert-jaune (`#d7f23c`).
   - **Usages.** Le vert-jaune ne sert qu'à quatre choses : l'action principale, la seconde voix
     du titre sur le bleu, l'attention dans les figures (le front du crawl, la page retenue, la
     ligne fautive, la vérification des sites), l'étape en cours.
   - **Jamais en texte sur le papier.** Il y fait 1,2:1 : il y devient un fond sous de l'encre
     (13,5:1).
   - **Mise en œuvre.** Les jetons sont en oklch dans `@theme` et redéfinis sous `.forge-ui` :
     toutes les pages publiques passent en clair, l'application garde les siennes.
2. **Une scène, une figure à la fois.** Le hero est la première scène, plein écran et bleu. La
   zone de la figure est dans le flux au-dessus des mots, elle ne prend que la place qu'ils
   laissent.

   Dessous :
   - **sur ordinateur,** un panneau bleu collant à droite, le texte sur papier à gauche ;
   - **sur téléphone,** un bandeau bleu collé sous la barre, le texte défilant dessous.
     Une première version mettait une carte au-dessus de chaque étape : on faisait défiler
     des cartes vides.

   Les quatre étapes sont en pastilles dans une bande sous la figure, hors de la zone des
   particules.

   Le canvas est masqué aux scènes visibles : une particule ne peut pas être dessinée sur le texte
   ni sur le papier.
3. **Des figures faites de pages** (`forge/structures.ts`) :
   - **hero :** 64 pages en cartes autour d'un globe qui tourne en 90 s, et un anneau qui balaie
     les latitudes ;
   - **01 Read :** le vrai plan de septune.dev, 93 pages, tel que Septune l'a parcouru le
     1er novembre, lu par un front vert-jaune ;
   - **02 Catch :** des pages tombent de la prévisualisation vers la production à travers la
     vérification ; celle qui quitterait Google s'y pose et y reste ;
   - **03 Fix :** le fichier de la page, en jetons de la largeur des vrais caractères ; la ligne
     noindex sort, les lignes remontent ;
   - **04 Watch :** 25 fenêtres de sites. Au repos, celle de l'offre gratuite est allumée,
     comme le dit le titre. Survoler ou cibler au clavier l'offre Pro en allume 5, Studio 25.
4. **Le scroll choisit, une horloge joue.**
   - **La transition.** Elle prend 2 s, quelle que soit la vitesse du scroll, en trois temps :
     - la figure présente s'efface sur place ;
     - les particules traversent sans être vues, et la figure change de scène à ce moment-là ;
     - la suivante se dessine du haut vers le bas.

     Deux figures ne sont jamais à l'écran ensemble. Une première version faisait les deux à
     la fois, en balayage : on voyait une seconde de figures cassées superposées.
   - **L'histoire de l'étape** ne joue qu'une fois, après la transition.
   - **Le reste est fixe.** Aucune rotation liée au scroll, deux degrés de respiration au plus,
     et plus de fluide sous la souris.
5. **Le texte.**
   - **Les titres.** Sur ordinateur, ils apparaissent lettre par lettre en sortant d'un flou ;
     sur écran tactile, d'un bloc.
   - **Le reste** monte de 14 px une seule fois.
   - **Ce qui reste à l'écran.** Chaque étape garde son relevé, qui dit ce que fait la figure
     avec les mêmes mots, et une carte du vrai produit : le check de PR, le patch, les offres.
6. **La preuve avant l'ambiance.** Une carte en haut à droite du hero (septune.dev, 99/100)
   renvoie au rapport. Ce rapport est le vrai audit de septune.dev par la CLI : score, huit
   familles, et les cinq constats avec leurs preuves, sans rien retirer.

## Conséquences

- **Les plaques, le journal de fond, les légendes « fig. »** et le papier os de la FAQ
  disparaissent. Supprimés : `chapters.ts`, `chapter.tsx`, `plate.tsx`, `ledgers.ts`,
  `readouts.ts`, `shape.ts`.
- **Mesures sur le build de production :**
  - **Lighthouse :** 100 en accessibilité, bonnes pratiques, SEO et navigation par agents, sur
    mobile et sur ordinateur.
  - **Téléphone émulé, processeur ralenti 4× :**
    - LCP 394 ms, CLS 0 ;
    - de 102 à 130 images/s sur un scroll qui traverse les quatre étapes, 95 % des images sous
      14 ms. Il y a 3 images longues au premier passage (démarrage du moteur), aucune
      ensuite.
  - **Ordinateur :** 144 images/s, 95 % des images sous 7,3 ms.
- **Deux pièges trouvés en mesurant :**
  - **`body:has(.forge-ui) .support-chat …`** pour peindre la bulle d'aide aux couleurs du site :
    chaque changement du relevé recalculait les styles de toute la page, de 60 à 160 ms par image
    sur le téléphone ralenti. La bulle étant la voisine du gabarit, `.forge-ui ~ .support-chat`
    fait le même travail sans le coût.
  - **Le flou lettre par lettre** coûtait un tiers du budget d'une image sur ce même téléphone :
    il est réservé aux pointeurs fins.
- **La navigation n'écoute plus le scroll.** Deux observateurs savent si la page a bougé et si
  le hero est sous la barre : lire la position du scroll forçait une mise en page à chaque
  événement.
- **Mouvement réduit :** les figures sont posées dans leur état final, aucun texte n'attend, les
  animations n'ont plus de délai.
- **Relecture adverse** par quatre agents (les yeux de Hugo, le code, le contenu,
  l'accessibilité), chaque constat contre-vérifié. 15 constats ont été confirmés et
  corrigés ; 24 contre-vérifications n'ont pas abouti (limite d'usage atteinte) et ont été
  triées à la main.
  - **Interface :**
    - la barre devient pleine (bleue) dès que le hero défile ;
    - le menu mobile est lisible sur le bleu ;
    - les pastilles et la carte de preuve sont cliquables ;
    - les fenêtres de sites ne se touchent plus.
  - **Accessibilité et confort :**
    - les anneaux de focus sont visibles sur le papier comme sur le bleu ;
    - la sélection de texte est lisible ;
    - les commandes natives sont claires (`color-scheme`) ;
    - l'orange et le rouge sont assombris pour passer sur leurs teintes ;
    - le titre tient à 320 px ;
    - le défilement laisse de la place à la barre fixe.
  - **Textes vrais :**
    - « the way Googlebot finds it » (la découverte, pas le rendu JavaScript) ;
    - l'audit gratuit annonce ses 3 pages ;
    - le rapport dit exactement ce que montre sa carte, avec la ligne de recherche IA ;
    - le patch d'exemple est attribué à l'éditeur ;
    - les tirets cadratins des messages de l'audit gratuit sont retirés.
  - **Pages intérieures :** /audit prend la seconde voix en italique outremer, et les champs
    de points sombres sont masqués sur le papier.
- **Reste à faire hors de ce lot :** la vidéo de présentation de 23 s est encore aux anciennes
  couleurs (pétrole et orange). Elle se régénère depuis `Desktop/Septune-video`.
