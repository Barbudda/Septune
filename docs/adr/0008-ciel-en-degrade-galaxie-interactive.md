# ADR 0008 : un ciel en dégradé, une galaxie qu'on lit au curseur, des points qui se réorganisent

- **Date** : 2026-11-02
- **Statut** : acceptée ; complète l'[ADR 0007](0007-poussiere-de-galaxie-et-bleu-nuit.md). Le
  bleu nuit uni de l'ADR 0007 est remplacé par le ciel décrit ici, et le globe du hero par la
  galaxie.
- **Origine** : Hugo, sur la version de l'ADR 0007. En résumé :
  - pour le hero, « faire quelque chose de plus poussé » : « une boule qui tourne au milieu »,
    « beaucoup d'espace vide » ;
  - « il manque de dégradé », sur le modèle de ce qu'il a fait pour Terouva, sans le copier ;
  - le bleu « un peu trop sombre, un peu trop cheap », à remettre « au milieu » ;
  - la figure est « trop petite, pas interactive » ;
  - d'une figure à l'autre, ce sont « les points qui se réorganisent », et non la figure qui
    disparaît puis réapparaît ;
  - des cases qui portent du texte, « des trucs importants », alignés, pour que la section
    « serve un peu plus à quelque chose » ;
  - « un thème à garder sur toute la page ».

## Recherche

Une recherche sur les sites cités pour leurs dégradés a lu le CSS de 14 d'entre eux, le
2 novembre :

- **Les sources.** Stripe, Linear, Raycast, Vercel, Resend, Mercury, Dia, Unicorn Studio, Igloo,
  Lusion, Apple, Paper Shaders, Supabase et Clerk.
- **Ce qui ressort.** Les sites qui tiennent encore emploient le dégradé comme une lumière : un
  horizon, un liseré, de la profondeur. Ils ne l'emploient presque jamais comme une bande de
  couleur. Plusieurs (Clerk, Supabase, Framer) ne s'en servent plus que pour des fondus de
  masque.
- **Les règles retenues :**
  - un champ unique, dont chaque scène montre une partie (les « ciels » de Stripe) ;
  - la couleur vive en lumière, jamais en peinture : une ligne fine, ou une lueur posée sur un
    bord ;
  - des dégradés bleus calculés `in oklab` ;
  - du texte blanc seulement là où le champ reste sous oklch 56 % (au-delà, il passe sous 4,5:1).

Terouva, la référence d'Hugo, empile des dégradés radiaux sur un linéaire : la nuit en haut, un
bleu électrique au milieu, un pied chaud. Il y ajoute des stries verticales et un rideau
lumineux.

## Décision

1. **Un ciel, trois fenêtres** (`.sky-field` dans `globals.css`).
   - **Le champ.** Un bleu profond en haut (`#172793`, plus clair que le bleu nuit de
     l'ADR 0007), qui s'éclaire vers l'outremer puis un bleu électrique à l'horizon, là où se
     trouve la galaxie.
   - **Le liseré de lumière.** Une ligne fine au cœur vert-jaune, posée au pied de chaque scène,
     là où le ciel rencontre la page : c'est l'aube.
   - **Les orbites.** Des anneaux autour du cœur de la galaxie, inclinés comme son disque. Ce
     sont les ondes au sol de l'arbre de la vidéo de référence ; ils remplacent les stries de
     Terouva.
   - **Les trois scènes qui partagent ce champ :**
     - le hero, avec son horizon au tiers ;
     - le panneau des étapes, avec un horizon plus doux, sans ligne ni orbites, pour que les
       mots des figures se lisent ;
     - le dernier appel, avec l'aube à son pied.
   - **Contrastes calculés.** Le texte blanc se lit à 9:1 sous l'horizon et à 12:1 en haut.
     Aucun texte ne se trouve là où le champ dépasse oklch 50 %.
   - **Un ciel immobile.** Une première version dérivait lentement. Même limitée à une
     translation, cette animation recalculait le style de toute la page à chaque image (trace
     du 2 novembre) et faisait sauter une image sur vingt sur un téléphone ralenti 4×.
2. **La galaxie de septune.dev** (`structures.ts`, `galaxy`) remplace le globe.
   - **Le contenu.** Les 93 vraies pages du crawl du 1er novembre (`site-pages.ts`), en tuiles
     posées sur un disque qui tourne lentement :
     - l'accueil au cœur ;
     - sur un anneau autour de lui, les 16 pages vers lesquelles il pointe ;
     - le long de quatre bras, les 76 pages plus profondes, dans l'ordre du crawl ;
     - de la poussière qui suit les bras, un bulbe de lumière au centre, quelques étoiles.
   - **La taille.** Elle occupe toute la largeur.
   - **Les mots.** Ils se placent dans des clairières que le canvas assombrit, à un dixième
     (`data-forge-hole`).
   - **L'interaction :**
     - le disque penche légèrement vers le curseur ;
     - un dôme soulève les pages sous le curseur et les éclaire ;
     - les chemins des pages proches s'affichent, au plus trois, jamais l'un sur l'autre ;
     - sans curseur, la galaxie lit une page toutes les 1,3 s, de l'accueil vers les bras :
       la page lue passe en vert-jaune, son chemin s'affiche, puis elle reste claire un
       moment.
3. **Les points se réorganisent** (`PHASES` dans `shaders.ts`, `MORPH` dans `forge-field.tsx`).
   - **Dans une même scène** (les quatre étapes), chaque point va de sa place dans une figure à
     sa place dans la suivante, sur un arc léger vers le spectateur. Les rangées du haut
     arrivent en premier, en 2,6 s. Grâce au tri de Hilbert, chaque point fait un trajet court.
   - **D'une scène à l'autre** (du hero aux étapes), le fondu en trois temps de l'ADR 0006
     reste : faire passer des points visibles d'une scène à l'autre traverserait le texte.
4. **Des mots dans les cases** (`labels` dans `structures.ts`, couche `LABEL_*` dans les shaders).
   - **Le rendu.** Les mots sont dessinés une fois dans un atlas, à la chasse de JetBrains Mono,
     puis placés dans l'espace de la figure : ils tombent, glissent et tournent avec leur carte,
     et s'allument avec elle.
   - **Ce que dit chaque figure :**
     - **01 Read :**
       - le nom de chacune des 16 pages, dans une carte à sa mesure ;
       - les groupes : /frameworks/, /tools/, et « noindex, on purpose » pour /login, /signup
         et /preorder ;
       - une légende sur les 76 pages plus profondes ;
       - les noms s'allument au passage du crawl.
     - **02 Catch :**
       - de vraies pages, chacune avec son statut (« 200 · indexable ») ;
       - la page retenue : /pricing, « noindex: would leave Google » ;
       - la preview, le check de la pull request et la production, nommés.
     - **03 Fix :** le vrai code du fichier, posé exactement sur ses jetons, avec le nom du
       fichier et les numéros de ligne. La ligne noindex sort en vert-jaune.
     - **04 Watch :** « your-site.com » au centre, puis « site 02 » à « site 25 », allumés
       selon l'offre.
   - **Sur les petits écrans.** Un mot qui ferait moins de 7 px à l'écran n'est pas dessiné :
     sur téléphone, seul le code reste lisible.

## Conséquences

- **Le démarrage du moteur ne bloque plus le téléphone.**
  - **Avant.** Sur un téléphone ralenti 4×, le moteur bloquait le fil principal 6 s d'un
    seul tenant :
    - 1,6 s pour construire les figures ;
    - 0,7 s pour lire l'atlas pixel par pixel ;
    - 1,8 s pour compiler les shaders ;
    - le reste pour charger three.js.
  - **Maintenant :**
    - les figures se construisent dans un worker (`figures.worker.ts`) ;
    - l'atlas est envoyé tel quel (blanc sur noir, canal rouge) ;
    - les programmes sont compilés en parallèle (`compileAsync`) ;
    - le démarrage est découpé : son plus long morceau prend 0,16 s sur téléphone ralenti
      et 0,7 s sur ordinateur, où c'est la création du contexte WebGL.
- **Le nombre de points.** 102 400 sur ordinateur ; 20 736 sur téléphone, avec la lueur à
  quatre lectures et une résolution un peu sous celle de l'écran.
- **Mesures sur le build de production (Chrome sans fenêtre, processeur graphique actif) :**
  - **Lighthouse :** 100 en accessibilité, bonnes pratiques, SEO et navigation par agents, sur
    mobile et sur ordinateur.
  - **Téléphone ralenti 4× :**
    - LCP de 0,8 à 1,1 s selon les passages, CLS 0 ;
    - 130 images/s sur un scroll des quatre étapes, 95 % des images sous 14 ms, aucune image
      longue.
  - **Ordinateur :** 144 images/s, 95 % des images sous 7,1 ms, aucune image longue.
- **Deux pièges de mesure :**
  - **Les fenêtres masquées.** Les navigateurs ouverts sur le bureau tombent à 1 ou 2
    images/s quand leur fenêtre est cachée, même sur une page sans WebGL. On mesure dans un
    Chrome sans fenêtre, piloté par le protocole DevTools.
  - **Le serveur de développement** servait une ancienne feuille de style après de grosses
    modifications : on vide `.next/dev` et on relance.
- **Mouvement réduit :**
  - la galaxie est immobile, avec seulement le nom de l'accueil ;
  - les figures des étapes sont posées dans leur état final ;
  - le ciel ne bouge pas, de toute façon.
- **Reste à faire :** la vidéo de présentation de 23 s, à refaire aux couleurs du ciel quand Hugo
  le dira.
