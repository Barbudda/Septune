# ADR 0003 : l'accueil en chapitres sculptés, sans verre

- **Date** : 2026-10-31
- **Statut** : acceptée
- **Origine** : Hugo, « je n'aime pas le design du site, il y a trop de friction ». Il a fourni la fiche d'un
  modèle animé (un nuage de particules en forme de sculpture, remué par la souris, sous une interface fine en
  mono) et a demandé une refonte poussée, sans copie à la lettre : une sculpture de points par chapitre, qui se
  construit avec le scroll puis se range sur le côté pour laisser apparaître les informations, et **aucune
  animation rejouée quand on remonte**. Il a laissé les choix de contenu à Claude, « en fonction de ce que
  recherche l'utilisateur ».

## Contexte

L'accueil empilait 14 sections, une scène WebGL en fond sur tout le site, un système de points animés par
section et du verre liquide sur chaque surface. La navigation proposait 6 liens et 2 boutons. Pour un
développeur qui évalue l'outil, il fallait beaucoup lire avant de savoir où Septune intervient et comment
l'essayer.

## Décision

1. **Cinq chapitres** sur l'accueil, chacun avec une sculpture de particules qui dit la même chose que son
   texte :
   - le logo, ce qu'est Septune ;
   - une pull request, où la panne est attrapée ;
   - l'arbre d'un site, ce qui est lu ;
   - une coche dans un anneau, le correctif ;
   - le logo encore, pour commencer et les tarifs.

   Puis la FAQ, en texte simple.
2. **Le champ URL dans le hero** envoie sur `/audit?url=…`, qui lance l'audit tout de suite : le chemin le plus
   court vers une preuve, sans compte. Le formulaire est un simple GET et marche sans JavaScript.
3. **Scène** (`src/components/marketing/forge/`) :
   - un nuage de 65 536 particules sur ordinateur et 16 384 sur mobile, simulé sur le GPU ;
   - chaque particule a sa propre place calculée une fois sur chaque sculpture ;
   - un petit fluide suit la souris et dérange le nuage, qui se reforme ;
   - la scène se charge après le premier affichage ; sans WebGL2, la page se lit sans elle ;
   - si l'utilisateur limite les animations, les sculptures restent fixes.
4. **Rien ne se rejoue.** Le texte d'un chapitre attend que sa sculpture soit construite, se révèle une fois
   (un balayage de gauche à droite, la ligne du robot de la vidéo), puis ne bouge plus. Revenir sur un chapitre
   déjà construit affiche son état final ; seule la sculpture change de forme, en moins d'une seconde.
5. **Plus de verre sur le site marketing.** Les surfaces deviennent des plaques plates à filet de 1 px, par
   une règle CSS limitée à `.forge-ui`. L'application garde son verre.
6. **Navigation en une ligne mono** : le logo, `audit`, `docs`, `pricing`, `sign in`, et une pastille ronde
   avec le nombre de contrôles, qui mène aux docs. L'accent reste l'orange en fusion : le violet sur noir du
   modèle est exclu par les règles du projet et ne colle ni au logo ni à la vidéo.

## Conséquences

- Mesures sur le build de production :
  - Lighthouse : 100 en accessibilité, bonnes pratiques et SEO, sur mobile comme sur ordinateur ;
  - mobile avec le processeur ralenti 4× : LCP 786 ms, CLS 0, INP 35 ms ;
  - la scène tient la fréquence de l'écran (144 images/s), y compris pendant un scroll et un mouvement de
    souris.
- Les ancres utilisées ailleurs (`#how-it-works`, `#features`, `#security`, `#faq`) existent toujours sur
  l'accueil.
- Les composants de l'ancien accueil sont supprimés (scène « code chaos → clarity », hero, sections retirées).
  `git revert` sur le commit de suppression les ramène.
- Le contenu retiré de l'accueil (comparatif, détail des fonctions, session dans l'éditeur) vit encore dans
  `/pricing`, `/docs` et les pages frameworks. Si une requête de recherche visait l'un de ces passages, la
  Search Console le dira dans quelques semaines.
- Le smooth scroll (Lenis) prévu par le CLAUDE.md n'est pas utilisé : Hugo a demandé zéro friction, et un
  scroll détourné en ajoute. Le scroll reste natif.
