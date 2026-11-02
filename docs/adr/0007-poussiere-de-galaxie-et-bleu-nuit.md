# ADR 0007 : des figures en poussière de galaxie, des scènes bleu nuit, un papier plus soutenu

- **Date** : 2026-11-02
- **Statut** : acceptée ; complète l'[ADR 0006](0006-scene-bleue-figures-de-pages.md), dont la
  composition, les figures et leurs mouvements restent en vigueur
- **Origine** : Hugo, sur la version de l'ADR 0006 : « Ok, mieux. Assombris un petit peu le site
  (ne change pas la vidéo tout de suite), refais les formes en points de galaxie car c'était pas mal,
  mais garde leurs déplacements (comme sur la vidéo des points bleus). »

## Contexte

La version de l'ADR 0006 dessinait des pages nettes : des points rangés sur les contours et les
lignes de texte, à peine écartés de leur trait, en blanc et bleu pâle sur l'outremer vif.

La vidéo des points bleus (`design_videos/vid1.mp4`) montre autre chose : un arbre, puis un cube,
faits d'une poussière dense et lumineuse sur un ciel presque noir. La plupart des grains sont
faibles, quelques-uns brillent, ils ont une épaisseur, et la lumière blanchit là où ils
s'accumulent. Hugo retrouvait ce rendu dans les premières versions de l'accueil.

Ces deux demandes vont ensemble : une poussière lumineuse ne se voit que sur un fond sombre, et
l'outremer vif l'écrasait.

## Décision

1. **Les figures restent les mêmes, elles changent de matière** (`forge/shaders.ts`) :
   - **Une place dans la poussière.** Chaque point garde un écart à lui autour du trait qu'il
     dessine et tourne lentement autour, profondeur comprise. La moitié reste à un cheveu du
     trait, un sur dix flotte dans le halo, plus faible que le trait.
   - **L'éclat d'un champ d'étoiles.** La plupart des points sont faibles, quelques-uns
     brillants, et un sur trente est une étoile plus grande qui scintille.
   - **Deux tons par point, chacun un peu différent** : un blanc qui tire vers le cyan, et un bleu
     électrique. Le vert-jaune reste réservé à l'attention.
   - **La lumière.** Une lueur douce autour des traits (huit lectures autour de chaque pixel dans
     la passe de ton), et le blanc là où la poussière s'accumule, comme au cœur d'une nébuleuse.
   - **Des pages pleines.** Un quart des points de chaque carte en remplit la surface d'une brume
     faible : la page se lit comme une tuile allumée, à la manière des faces du cube de la vidéo.
   - **Plus de points** pour une poussière plus fine : 102 400 sur ordinateur (65 536 avant),
     25 600 sur téléphone (16 384 avant).
2. **Les mouvements ne changent pas.** Ce sont toujours les trois temps sur une horloge de 2 s,
   et les histoires des étapes : le front du crawl, la page retenue, la ligne noindex qui sort,
   les sites qui s'allument. Seule la poussière bouge en plus, très lentement, autour de chaque
   trait.
3. **Le site s'assombrit d'un cran** (`globals.css`) :
   - **Les scènes** (hero, panneau des étapes, dernier appel, barre au-dessus du hero) passent de
     l'outremer vif à un bleu nuit `#102079`, éclairé au centre d'une nappe d'outremer.
   - **Le papier** passe de `#f3f5fb` à `#e6eaf6`, et le papier profond de `#e9eef8` à `#d9e0ef`.
     Les cartes restent presque blanches (`#f8fafe`) et ressortent dessus.
   - **Les contrastes, recalculés :**
     - encre sur papier 14,1:1 ;
     - texte secondaire 5,6:1, et 5,1:1 sur le papier profond ;
     - outremer sur papier 5,9:1 ;
     - blanc sur bleu nuit 14:1 ;
     - vert-jaune sur bleu nuit 11,1:1.

     Le gris le plus clair et le vert des statuts sont assombris pour tenir 4,5:1 sur le papier
     profond.
4. **La vidéo de présentation** ne change pas pour l'instant, à la demande de Hugo.

## Conséquences

- **Mesures sur le build de production :**
  - **Lighthouse :** 100 en accessibilité, bonnes pratiques, SEO et navigation par agents, sur
    mobile et sur ordinateur.
  - **Téléphone émulé, processeur ralenti 4× :**
    - LCP 680 ms, CLS 0 ;
    - 129 images/s sur un scroll qui traverse les quatre étapes, 95 % des images sous 14 ms,
      aucune image longue.
  - **Ordinateur :** 144 images/s, 95 % des images sous 7,2 ms, aucune image longue.
- **Un piège trouvé en mesurant.** Avec 102 400 points, les textures des figures font environ
  25 Mo. Envoyées au processeur graphique à leur première transition, elles coûtaient une image
  de 76 ms en plein scroll. Elles sont maintenant envoyées au démarrage du moteur
  (`renderer.initTexture`), qui se charge après l'affichage du titre.
- **Mouvement réduit :** la poussière est figée comme le reste ; les figures sont posées dans leur
  état final.
