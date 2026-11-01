# ADR 0005 : des plaques sous les images, un fond écrit, les questions sur papier

- **Date** : 2026-11-01
- **Statut** : acceptée ; complète l'[ADR 0004](0004-images-qui-racontent-et-palette.md)
- **Origine** : Hugo, sur la version de l'ADR 0004 : « Pas mal, mais ajoute du design sur le fond
  de la page, je n'aime pas le sombre qui fait vide. Il ne faut pas qu'il n'y ait rien d'écrit non
  plus, on est à la limite. Garde un interface user friendly qui permet d'avoir des bonnes zones de
  texte animées, lisibles. »

## Contexte

Avec l'ADR 0004, les images vivaient directement sur le pétrole. Autour d'elles, de grandes
surfaces sombres restaient sans rien. La colonne de gauche des questions était vide, et le texte
passait sous la navigation, qui n'avait qu'un fondu.

## Décision

1. **Une plaque par image** (`forge/plate.tsx`). Chaque image est posée sur un champ vert-de-gris :
   - pour les chapitres en deux colonnes, la plaque déborde jusqu'au bord droit de l'écran ;
   - pour le flux de déploiements, c'est une bande pleine largeur.

   Le texte garde le pétrole ; la page alterne deux tons au lieu d'une seule nappe sombre. L'image
   est insérée dans la plaque avec une marge, mais ses particules peuvent en sortir pendant les
   transitions.
2. **Une légende écrite et un relevé vivant.**
   - Chaque plaque dit ce que montre l'image (« fig. 1 … »).
   - Un relevé suit le scroll avec les mêmes états que les particules
     (`forge/readouts.ts`, `forge/scenes.ts`) : pages lues, porte qui échoue, patch, sites
     surveillés.
   - Le HTML serveur porte l'état final, et la page reste complète sans JavaScript.
3. **Un journal de fond fait de vrai matériau** (`forge/ledgers.ts`) :
   - les pages publiques du site ;
   - le diff de l'exemple de PR ;
   - le correctif noindex dans chaque framework ;
   - la liste des contrôles.

   Le journal est très pâle (15 %) et s'efface vers le centre de la plaque. Il monte d'une ligne
   à mesure qu'on lit le chapitre. Il est dessiné par CSS depuis `data-l`, donc il n'est pas du
   texte pour les contrôles de contraste.
4. **Les questions sur papier.**
   - La FAQ passe sur un fond os aux coins arrondis. `.ground-bone` redéfinit les jetons en
     encre, avec les contrastes calculés en commentaire.
   - Sa colonne de gauche reste visible au scroll et porte le contact et l'audit gratuit.
5. **La navigation devient une barre pétrole pleine** dès que la page bouge.

## Conséquences

- **Le journal suit le scroll, pas une horloge.** Une première version le faisait défiler par
  une animation CSS en `steps()`. Mesurée sur un téléphone émulé, processeur ralenti 4×, elle
  coûtait :
  - avec l'animation : 84 images/s, 95 % des images sous 20,7 ms ;
  - sans l'animation : 103 images/s, 95 % des images sous 14,1 ms ;
  - le masque et les plaques ne coûtent rien.

  La version liée au scroll n'écrit un style que lorsque la ligne change.
- **Mesures sur le build de production :**
  - **Lighthouse :** 100 en accessibilité, bonnes pratiques et SEO, sur mobile et sur
    ordinateur.
  - **Mobile ralenti 4× :**
    - LCP 440 ms, CLS 0 ;
    - de 102 à 105 images/s pendant un scroll qui traverse les chapitres, 95 % des images sous
      14 ms, aucune image longue.
  - **Ordinateur :** 144 images/s, 95 % des images sous 7,2 ms.
  - **Mouvement réduit :** tout le texte est visible, le journal est immobile, aucune animation
    ne tourne et la console ne montre aucune erreur.
- **L'audit Septune des 93 pages en local donne 99/100**, avec seulement les constats déjà
  connus.
- **Les débords pleine page** (`calc(-2rem - max(0px, (100vw - 80rem) / 2))`) sont coupés par
  `overflow-x: clip` sur chaque chapitre : aucun défilement horizontal.
