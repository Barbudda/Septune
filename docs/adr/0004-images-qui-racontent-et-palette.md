# ADR 0004 : des images qui racontent le texte, et la palette pétrole, vert-de-gris, fusion

- **Date** : 2026-11-01
- **Statut** : acceptée ; révise l'[ADR 0003](0003-accueil-en-chapitres-sculptes.md)
- **Origine** : Hugo, sur la version en ligne de l'ADR 0003 : « ça marche pas terrible. Le reste de
  la page est noir et sans vie. L'animation de points est censée bouger elle-même mais aussi bouger
  dans la page, se déformer avec le scroll et ajouter à ce que dit le texte. Elle doit représenter ce
  que dit le texte. Faire le logo ne sert à rien. » Il demande d'être particulièrement sévère sur le
  hero, « il doit être majestueux », et deux couleurs majoritaires qui vont bien ensemble plus une
  couleur vive. Il cite Terouva comme référence possible.

## Contexte

La version de l'ADR 0003 dessinait des sculptures fixes (le logo deux fois, une branche, un arbre,
une coche) sur un fond graphite presque noir. Chaque sculpture se construisait une fois puis se
rangeait à droite. Le reste de la page était du texte sur noir. Terouva, que Hugo apprécie, pose un
champ de couleur plein dans son hero et une palette tenue (nuit, bleu électrique, orange).

## Décision

1. **Palette.** Deux tons dominants, le pétrole profond (`#041b1f`) et le vert-de-gris
   (`#4fbfae`), plus une couleur vive, l'orange en fusion (`#ff6a2b`), sur de petites surfaces.
   C'est le métal de la forge et sa patine, cohérent avec le nom et le logo. Le vert « signal »
   disparaît du site marketing : le vert-de-gris clair en tient lieu.

   Les jetons sont redéfinis sous `.forge-ui`, donc l'application ne change pas. On ne copie pas
   Terouva : on en prend l'exigence (un champ de couleur, une palette tenue), pas ses couleurs.
2. **Images.** Le logo disparaît. Chaque chapitre a une structure qui montre ce que dit son
   texte :
   - un site en arborescence ;
   - le même arbre, parcouru par le front du robot ;
   - un flux de déploiements arrêté à la porte de la pull request ;
   - un fichier dont la ligne noindex s'arrache ;
   - 1, 5 puis 25 sites allumés.

   Les particules coulent sans arrêt le long de ces structures (`structures.ts`).
3. **Mouvement.**
   - L'image est accrochée à la zone `[data-stage]` de son chapitre et défile avec lui.
   - Entre deux chapitres, elle se transforme et se déplace au rythme du scroll, dans les deux
     sens.
   - L'état propre à chaque chapitre (le front du robot, la ligne arrachée, les sites allumés)
     suit la lecture.
   - Seul le texte se révèle une fois et ne se rejoue jamais.
4. **Le reste de la page :**
   - un fond pétrole avec un grain fin ;
   - une lueur colorée derrière chaque image ;
   - des panneaux couleur os pour ce que le produit produit vraiment ;
   - une seconde voix en Fraunces italique dans les titres ;
   - un pied de page fermé sur le nom géant et la braise.
5. **Hero.**
   - Plein écran, titre monumental centré, arbre en éventail montant d'une braise.
   - Une clairière sombre, posée au-dessus des particules, garde le texte lisible.
   - Sur mobile, l'arbre se tient sous les liens.

## Conséquences

- **Mesures sur le build de production :**
  - Lighthouse : 100 en accessibilité, bonnes pratiques et SEO, sur mobile et sur ordinateur.
  - Mobile avec le processeur ralenti 4× : LCP 986 ms et CLS 0. La police italique ajoutée
    coûte environ 200 ms au premier affichage, loin du seuil de 2,5 s.
  - Fluidité pendant un scroll qui traverse les chapitres :
    - mobile ralenti : 120 images/s, 95 % des images sous 14 ms ;
    - ordinateur, souris en mouvement : 144 images/s, 95 % des images sous 7 ms ;
    - aucune image longue dans les deux cas.
- **Audit Septune des 93 pages en local :** seulement les constats déjà connus.
- **Le canevas passe au-dessus des fonds de section** (`z-index: 1`, `mix-blend-mode: screen`) :
  la lumière s'ajoute à la couleur au lieu de remplacer un fond noir. Tout texte doit donc être en
  `relative z-10`.
- **Les ancres de l'accueil sont conservées.** L'ordre des chapitres change : ce qu'il lit
  (`#features`) passe avant où c'est attrapé (`#how-it-works`).
