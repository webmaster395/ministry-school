import type { FruitSpiritKey, FruitSpiritLevel } from "@/lib/apps/fruit-spirit-v2";

export type FruitSpiritRestitutionLevel = {
  discovery: string;
  growth: string;
  challengeTitle: string;
  challenge: string;
  reflection: string;
};

export type FruitSpiritRestitution = {
  key: FruitSpiritKey;
  number: number;
  name: string;
  verse: string;
  overviewTitle: string;
  overview: string;
  levels: Record<FruitSpiritLevel, FruitSpiritRestitutionLevel>;
};

export const fruitSpiritRestitutionsV2: readonly FruitSpiritRestitution[] = [
  {
    key: "amour",
    number: 1,
    name: "L'amour",
    verse: "« L'amour est patient, il est plein de bonté. » — 1 Corinthiens 13:4",
    overviewTitle: "Qu'est-ce que l'amour ?",
    overview: `L'amour est au cœur de la vie chrétienne. Mais aimer ne signifie pas simplement éprouver de l'affection pour quelqu'un, être gentil ou entretenir de bonnes relations.

Aimer, c'est rechercher le bien de l'autre, même lorsque cela nous demande un effort.

Il est facile d'aimer une personne qui nous apprécie, nous encourage et répond à nos attentes. L'amour devient plus exigeant lorsque quelqu'un nous déçoit, ne nous comprend pas ou ne peut rien nous apporter en retour.

Jésus nous a montré un amour qui ne dépend pas de ce que les autres peuvent lui donner. Il a aimé, servi, pardonné et donné sa vie.

Cela ne signifie pas que nous devons tout accepter. L'amour peut aussi nous conduire à dire la vérité, à poser des limites et à prendre de la distance lorsqu'une relation nous fait du mal.

L'amour est un fruit de l'Esprit qui nous apprend progressivement à ne plus placer uniquement nos besoins et nos intérêts au centre de nos relations.`,
    levels: {
      practice: {
        discovery: `Tes réponses montrent que tu cherches à aimer les autres même lorsque cela te demande un effort.

Quand quelqu'un te déçoit, tu sembles capable de continuer à lui vouloir du bien. Tu sais aussi mettre de côté certaines de tes préoccupations pour accorder de l'attention à une personne qui en a besoin.

Tu ne limites donc pas ton amour aux moments où les relations sont faciles.

C'est une qualité précieuse, parce que l'amour se révèle particulièrement dans la manière dont nous traitons les autres lorsqu'ils ne répondent pas à nos attentes.

Mais il y a un point auquel tu dois rester attentif : aimer les autres ne signifie pas toujours leur dire oui, porter leurs problèmes ou oublier tes propres besoins.`,
        growth: `Dans Jean 13:34, Jésus nous demande de nous aimer les uns les autres comme il nous a aimés.

Il ne nous demande pas seulement d'être agréables ou serviables. Il nous invite à développer un amour sincère, qui recherche réellement le bien de l'autre.

Tu sais déjà faire preuve d'attention. Maintenant, cherche à grandir dans un amour qui associe générosité, vérité et discernement.

Parfois, aimer consistera à aider. D'autres fois, ce sera avoir une conversation difficile, dire non ou encourager quelqu'un à prendre ses responsabilités.

L'amour ne consiste pas toujours à faire plaisir. Il consiste à chercher ce qui est bon pour l'autre.`,
        challengeTitle: "Aime avec vérité.",
        challenge: `Pense à une personne que tu apprécies, mais à qui tu n'oses pas dire quelque chose d'important par peur de la décevoir.

Si le contexte s'y prête, prends le temps d'avoir une conversation sincère avec elle. Exprime ce que tu penses avec douceur, en cherchant son bien plutôt qu'en évitant simplement un moment inconfortable.`,
        reflection: "Est-ce que je cherche toujours le bien des autres, ou est-ce que je cherche parfois surtout à être apprécié ?",
      },
      develop: {
        discovery: `Tu souhaites aimer les autres et tu es capable de faire preuve d'attention et de générosité. Mais lorsque quelqu'un te déçoit, te blesse ou te demande un effort supplémentaire, il peut devenir plus difficile de conserver la même attitude.

Peut-être que tu prends de la distance, que tu deviens moins disponible ou que tu attends que l'autre fasse le premier pas.

Ce sont des réactions que nous pouvons tous avoir.

Mais elles soulèvent une question importante : est-ce que ma manière d'aimer dépend de la manière dont les autres me traitent ?

Il ne s'agit pas de nier tes blessures. Tu as le droit d'être déçu, d'exprimer ton désaccord et de poser des limites.

L'enjeu est d'apprendre à ne pas laisser uniquement ta déception déterminer la manière dont tu considères l'autre.`,
        growth: `Dans Matthieu 5:46, Jésus pose une question :

« Si vous aimez ceux qui vous aiment, quelle récompense méritez-vous ? »

Jésus nous invite à aller au-delà d'un amour fondé uniquement sur la réciprocité.

Aimer quelqu'un qui nous aime est naturel. Continuer à rechercher le bien d'une personne qui nous a déçus demande une décision plus profonde.

Cela ne signifie pas que tu dois immédiatement lui refaire confiance ou rétablir une relation qui te fait du mal.

Mais tu peux apprendre à distinguer ce que la personne a fait de la valeur que tu lui accordes.

La prochaine fois que quelqu'un te déçoit, essaie de te demander :

« Comment puis-je réagir avec amour, sans nier ce qui m'a blessé ? »

Tu découvriras que l'amour n'est pas seulement une émotion que l'on ressent. C'est aussi une manière de choisir nos paroles et nos actes.`,
        challengeTitle: "Choisis l'amour dans une situation difficile.",
        challenge: `Cette semaine, lorsqu'une personne te déçoit ou t'agace :
1. Prends un moment pour reconnaître ce que tu ressens.
2. Évite de réagir uniquement sous le coup de la frustration.
3. Choisis une réponse qui respecte à la fois l'autre personne et tes propres limites.`,
        reflection: "Quand quelqu'un me déçoit, est-ce que je cherche à résoudre la situation ou à lui faire ressentir ma déception ?",
      },
      discover: {
        discovery: `Tes réponses suggèrent que l'amour devient particulièrement difficile à mettre en pratique lorsque les relations te demandent un effort.

Quand quelqu'un te déçoit, tu peux avoir tendance à te protéger en prenant de la distance. Lorsque les besoins des autres entrent en conflit avec tes propres envies, il peut aussi être difficile de leur accorder du temps ou de l'attention.

Cela ne signifie pas que tu es incapable d'aimer ou que tu n'aimes pas sincèrement les personnes qui t'entourent.

Mais cela peut révéler une différence entre l'amour que tu souhaites vivre et celui que tu arrives à exprimer dans certaines situations.

Nous avons souvent tendance à aimer plus facilement lorsque nous nous sentons aimés, compris ou respectés.

Or, l'amour auquel Dieu nous appelle va plus loin.

Il nous invite à apprendre à aimer, même lorsque cela ne nous apporte pas immédiatement quelque chose en retour.`,
        growth: `Dans 1 Jean 4:19, nous lisons :

« Pour nous, nous l'aimons, parce qu'il nous a aimés le premier. »

C'est un point essentiel : Dieu ne nous demande pas de produire un amour parfait par nos propres forces.

Il nous invite d'abord à découvrir et à recevoir son amour.

Plus tu prends conscience de la patience, de la grâce et de la bonté que Dieu manifeste envers toi, plus tu peux apprendre à les manifester envers les autres.

Tu n'as pas besoin de commencer par de grandes démonstrations d'amour.

Commence par des choix simples : écouter sans interrompre, prendre des nouvelles, rendre un service sans attendre de retour ou choisir de ne pas répondre avec mépris.

L'amour grandit lorsque nous apprenons à considérer les besoins des autres, même lorsqu'ils ne sont pas au centre de nos préoccupations.`,
        challengeTitle: "Fais du bien sans rien attendre en retour.",
        challenge: `Choisis une personne de ton entourage et pose un geste concret pour lui témoigner de l'amour.

Cela peut être lui accorder du temps, l'aider dans une tâche, prendre sincèrement de ses nouvelles ou lui adresser un encouragement.

Fais-le sans attendre de reconnaissance ou de faveur en retour.`,
        reflection: "Est-ce que j'accorde de l'attention aux autres uniquement lorsqu'ils en ont pour moi ?",
      },
    },
  },
  {
    key: "joie",
    number: 2,
    name: "La joie",
    verse: "« Réjouissez-vous toujours dans le Seigneur ; je le répète, réjouissez-vous. » — Philippiens 4:4",
    overviewTitle: "Qu'est-ce que la joie ?",
    overview: `La joie est bien plus qu'une émotion agréable que l'on ressent lorsque tout va bien.

Il est naturel d'être joyeux quand on reçoit une bonne nouvelle, quand un projet réussit ou quand les choses se déroulent comme prévu.

Mais la joie que produit le Saint-Esprit ne dépend pas uniquement de ce qui nous arrive.

Elle prend sa source dans notre relation avec Dieu, dans la confiance que nous lui accordons et dans l'espérance que nous avons en lui.

Cela ne signifie pas qu'un chrétien doit toujours sourire, être de bonne humeur ou cacher sa tristesse.

Jésus lui-même a pleuré. La joie et la tristesse peuvent exister en même temps.

La joie nous permet aussi de reconnaître ce qui est bon, même au milieu des difficultés, et de nous réjouir sincèrement du bonheur des autres.

Grandir dans la joie, c'est apprendre à ne pas laisser les circonstances décider entièrement de notre disposition intérieure.`,
    levels: {
      practice: {
        discovery: `Tes réponses montrent que tu arrives à trouver des raisons de te réjouir, même lorsque les choses ne se passent pas exactement comme tu l'espérais.

Quand une personne obtient une opportunité que tu désirais, tu sembles capable de célébrer sa réussite sans considérer qu'elle diminue tes propres chances.

Lorsque tu traverses une période difficile, tu arrives aussi à reconnaître ce qui reste bon dans ta vie.

Cela ne signifie pas que tu ne ressens jamais de déception ou de tristesse.

Mais tu sembles avoir développé une capacité précieuse : ne pas laisser une difficulté effacer toutes les autres raisons de te réjouir.

Cette attitude peut également encourager ton entourage. Une personne capable de reconnaître le bien au milieu des difficultés peut aider les autres à retrouver de l'espérance.`,
        growth: `Dans Romains 12:15, Paul nous encourage à nous réjouir avec ceux qui se réjouissent et à pleurer avec ceux qui pleurent.

Ce verset nous rappelle que la joie chrétienne n'est pas une attitude artificiellement positive.

Elle nous permet de partager sincèrement les émotions des autres, sans tout ramener à notre propre situation.

Tu sembles déjà capable de reconnaître les bonnes choses, même lorsqu'elles ne te concernent pas directement.

Pour continuer à grandir, apprends à faire de ta joie une source d'encouragement.

Ne te contente pas de ressentir de la joie : apprends à la communiquer.

Un encouragement sincère, une parole de reconnaissance ou le fait de célébrer la réussite de quelqu'un peuvent avoir un impact profond.`,
        challengeTitle: "Deviens une source de joie pour quelqu'un.",
        challenge: `Identifie une personne qui traverse une période difficile ou qui vient de vivre une réussite.

Prends l'initiative de l'encourager, de célébrer avec elle ou de lui rappeler une qualité que tu apprécies sincèrement chez elle.

Ne te contente pas d'un message automatique. Prends le temps de lui montrer qu'elle compte.`,
        reflection: "Est-ce que ma joie reste quelque chose que je vis intérieurement, ou est-ce que j'apprends aussi à la partager ?",
      },
      develop: {
        discovery: `Tu sais te réjouir lorsque les choses vont bien, mais certaines situations peuvent rapidement diminuer ta joie.

Quand quelqu'un obtient ce que tu espérais, tu peux être heureux pour lui tout en ressentant une certaine frustration.

Quand un projet ne fonctionne pas comme prévu, tu peux avoir du mal à voir autre chose que ce qui a échoué.

Et lorsque tu traverses une période difficile, les problèmes peuvent prendre tellement de place qu'il devient compliqué de reconnaître les bonnes choses qui continuent d'exister dans ta vie.

Ce n'est pas nécessairement un manque de reconnaissance.

C'est parfois simplement que ce qui ne va pas prend plus de place dans ton esprit que ce qui va bien.

La joie ne consiste pas à ignorer tes déceptions, mais à apprendre à ne pas les laisser définir toute ta réalité.`,
        growth: `Dans Habacuc 3:17-18, le prophète décrit une situation où les récoltes manquent et où les troupeaux disparaissent.

Pourtant, il affirme qu'il veut se réjouir en Dieu.

Ce passage ne nous enseigne pas à prétendre que les difficultés n'existent pas.

Il nous montre qu'il est possible de trouver en Dieu une raison de se réjouir, même lorsque les circonstances ne nous donnent pas de motifs évidents de satisfaction.

Tu peux apprendre à faire la même chose.

La prochaine fois qu'une situation te déçoit, ne cherche pas immédiatement à transformer ta tristesse en joie.

Prends le temps de reconnaître ce qui est difficile, puis pose-toi cette question :

« Au milieu de ce qui ne va pas, qu'est-ce qui reste bon dans ma vie ? »

Peut-être une relation, une occasion d'apprendre, une porte qui reste ouverte ou simplement la présence de Dieu.

La reconnaissance ne fait pas disparaître les difficultés, mais elle peut t'aider à ne pas voir ta vie uniquement à travers elles.`,
        challengeTitle: "Apprends à reconnaître la joie au milieu des difficultés.",
        challenge: `Pendant sept jours, prends quelques minutes chaque soir pour écrire :
1. Une chose difficile que tu as vécue aujourd'hui.
2. Une bonne chose que tu as vécue malgré cette difficulté.
3. Une raison de remercier Dieu.
Ne cherche pas à minimiser ce qui a été difficile. Apprends simplement à reconnaître les deux réalités.`,
        reflection: "Est-ce que je laisse parfois une seule déception me faire oublier toutes les bonnes choses que Dieu m'a déjà données ?",
      },
      discover: {
        discovery: `Tes réponses suggèrent qu'il peut être difficile pour toi de retrouver de la joie lorsque les circonstances ne correspondent pas à tes attentes.

Quand un projet échoue, tu peux rester longtemps concentré sur ce qui n'a pas fonctionné.

Quand quelqu'un réussit là où tu espérais réussir, tu peux avoir du mal à te réjouir sincèrement pour lui.

Et lorsque tu traverses une période compliquée, les difficultés peuvent occuper une grande partie de tes pensées.

Cela ne signifie pas que tu es une personne négative ou que tu manques de foi.

Mais cela peut révéler que ta joie dépend encore beaucoup de ce qui se passe autour de toi.

Lorsque les circonstances sont favorables, il est plus facile de se réjouir. Lorsqu'elles deviennent difficiles, la joie semble parfois disparaître avec elles.

Dieu t'invite à découvrir une joie qui possède des racines plus profondes.`,
        growth: `Dans Jean 15:11, Jésus explique à ses disciples qu'il leur a parlé afin que sa joie soit en eux et que leur joie soit complète.

Il prononce ces paroles alors qu'il se prépare à vivre la souffrance et la croix.

C'est important : Jésus ne parle pas d'une joie réservée aux moments faciles.

Il parle d'une joie qui prend sa source dans la relation avec lui.

Peut-être as-tu pris l'habitude d'attendre qu'une situation s'améliore pour retrouver de la joie.

« Je serai heureux quand ce problème sera réglé. »

« Je serai heureux quand j'aurai réussi. »

« Je serai heureux quand les choses changeront. »

Mais si ta joie dépend toujours de la prochaine bonne nouvelle, elle risque d'être constamment repoussée.

Dieu ne te demande pas d'attendre que tout soit parfait pour commencer à te réjouir en lui.

Commence par apprendre à reconnaître sa présence et sa bonté dans les choses simples.

Tu n'as pas besoin de ressentir une grande émotion pour cela. La joie peut commencer par une prière sincère, un moment de reconnaissance ou la décision de porter ton attention sur une bonne chose.`,
        challengeTitle: "Découvre une raison de te réjouir chaque jour.",
        challenge: `Pendant sept jours, prends cinq minutes pour identifier une bonne chose dans ta journée.

Cela peut être une conversation, un moment de repos, une occasion d'apprendre, un geste reçu ou un instant agréable.

Remercie Dieu pour cette chose, même si ta journée a été difficile.

À la fin de la semaine, relis ce que tu as écrit.`,
        reflection: "Est-ce que j'attends que mes circonstances changent pour me réjouir, ou est-ce que j'apprends à reconnaître la bonté de Dieu dans ma vie aujourd'hui ?",
      },
    },
  },
  {
    key: "paix",
    number: 3,
    name: "La paix",
    verse: "« Et la paix de Dieu, qui surpasse toute intelligence, gardera vos cœurs et vos pensées en Jésus-Christ. » — Philippiens 4:7",
    overviewTitle: "Qu'est-ce que la paix ?",
    overview: `La paix est bien plus que l'absence de problèmes, de conflits ou de difficultés.

Il est facile de se sentir en paix lorsque tout va bien : quand nos proches sont en bonne santé, que nos projets avancent et que nous avons l'impression de maîtriser notre avenir.

Mais que se passe-t-il lorsqu'une mauvaise nouvelle arrive ? Quand les choses échappent à notre contrôle ? Quand nous ne savons pas ce qui va se passer ?

La paix que produit le Saint-Esprit ne dépend pas de notre capacité à tout maîtriser, mais de notre confiance en Dieu.

Elle ne signifie pas que nous ne ressentons jamais de peur, d'inquiétude ou de tristesse. Ces émotions font partie de notre humanité.

La paix nous apprend à traverser l'incertitude sans laisser nos inquiétudes gouverner toutes nos pensées et toutes nos décisions.

C'est apprendre à faire ce qui dépend de nous, tout en confiant à Dieu ce qui nous échappe.`,
    levels: {
      practice: {
        discovery: `Tes réponses suggèrent que tu arrives généralement à garder ton calme, même lorsque les choses ne se déroulent pas comme prévu.

Face aux imprévus, tu sembles capable de prendre du recul plutôt que d'imaginer immédiatement le pire.

Quand une situation t'échappe, tu peux accepter progressivement de ne pas avoir toutes les réponses.

Cela ne signifie pas que tu ne ressens jamais d'inquiétude. Mais tu sembles avoir développé une capacité précieuse : ne pas laisser l'incertitude prendre toute la place dans ta vie.

Tu arrives à reconnaître qu'il existe des situations sur lesquelles tu peux agir et d'autres que tu ne peux pas contrôler.

Cette attitude peut également être une force pour ton entourage. Lorsque les autres sont inquiets, ta capacité à garder du recul peut les aider à réfléchir plus sereinement.`,
        growth: `Dans Marc 4:35-41, les disciples traversent une tempête. Les vagues remplissent la barque et ils ont peur de mourir.

Pendant ce temps, Jésus dort.

Les disciples le réveillent, paniqués. Jésus calme alors la tempête et les interroge sur leur foi.

Cette scène nous montre que Jésus n'est pas dépassé par ce qui effraie les disciples.

Mais elle nous rappelle aussi que la paix ne consiste pas simplement à attendre que la tempête disparaisse.

Grandir dans la paix, c'est apprendre à faire confiance à Dieu avant même de savoir comment la situation va se terminer.

Tu sembles déjà capable de garder une certaine stabilité dans les moments difficiles.

Pour aller plus loin, veille à ne pas confondre le fait de rester calme avec celui de tout porter seul.

Tu peux être une personne rassurante pour les autres et avoir toi aussi besoin de soutien, de prière ou d'encouragement.

La paix de Dieu ne t'oblige pas à être toujours fort. Elle t'invite à t'appuyer sur lui.`,
        challengeTitle: "Apprends à transmettre la paix.",
        challenge: `Cette semaine, lorsqu'une personne te partage une inquiétude :
1. Prends le temps de l'écouter sans minimiser ce qu'elle ressent.
2. Aide-la à distinguer ce qu'elle peut faire de ce qui échappe à son contrôle.
3. Si elle le souhaite, propose-lui de prier avec elle.`,
        reflection: "Est-ce que ma manière d'accompagner les autres les aide à faire confiance à Dieu, ou est-ce que je cherche surtout à leur donner rapidement une solution ?",
      },
      develop: {
        discovery: `Tu arrives parfois à faire confiance et à garder ton calme, mais certaines situations peuvent rapidement réveiller tes inquiétudes.

Lorsque les choses ne se passent pas comme prévu, tu peux ressentir le besoin de trouver immédiatement une solution.

Quand tu attends une réponse importante, tu peux imaginer différents scénarios, parfois les plus négatifs.

Et lorsque tu ne peux plus rien changer à une situation, il peut être difficile de l'accepter.

Peut-être que tu as besoin de comprendre, d'anticiper ou de prévoir pour te sentir rassuré.

Ce désir n'est pas mauvais en lui-même. Être prévoyant et responsable est une bonne chose.

Mais lorsque ta tranquillité dépend de ta capacité à tout prévoir, chaque imprévu peut devenir une source d'inquiétude.

La paix grandit lorsque tu apprends à reconnaître les limites de ton contrôle.`,
        growth: `Dans Matthieu 6:25-34, Jésus parle de nos inquiétudes concernant la nourriture, les vêtements et le lendemain.

Il ne dit pas que ces besoins sont insignifiants.

Il nous rappelle que notre Père céleste les connaît et nous invite à chercher d'abord son royaume.

Puis il nous encourage à ne pas nous inquiéter du lendemain.

Cela ne signifie pas qu'il faut arrêter de planifier ou de prendre ses responsabilités.

Cela signifie que nous n'avons pas à porter aujourd'hui toutes les difficultés que nous imaginons pour demain.

Pense à une situation qui t'inquiète actuellement.

Tu peux peut-être agir sur certains éléments : préparer un dossier, avoir une conversation, demander de l'aide ou prendre une décision.

Mais tu ne peux pas contrôler la réaction des autres, garantir le résultat ou connaître l'avenir.

Faire confiance à Dieu, ce n'est pas ne rien faire. C'est faire sa part sans chercher à porter celle qui ne nous appartient pas.

La prochaine fois que tu sens l'inquiétude monter, demande-toi :

« Qu'est-ce que je peux réellement faire aujourd'hui ? »

Puis apprends à confier à Dieu ce qui reste sans réponse.`,
        challengeTitle: "Apprends à lâcher ce que tu ne contrôles pas.",
        challenge: `Choisis une situation qui t'inquiète et prends une feuille.

Trace deux colonnes :
- Ce qui dépend de moi : les actions que je peux réellement entreprendre.
- Ce qui ne dépend pas de moi : les réactions des autres, les résultats et les événements que je ne maîtrise pas.
Cette semaine, engage-toi à agir sur la première colonne.

Chaque fois que tu recommences à t'inquiéter pour la seconde, prends un moment pour la confier à Dieu dans la prière.`,
        reflection: "Est-ce que je cherche à faire confiance à Dieu, ou est-ce que j'attends d'avoir toutes les réponses pour me sentir en paix ?",
      },
      discover: {
        discovery: `Tes réponses suggèrent que l'incertitude peut être particulièrement difficile à vivre pour toi.

Lorsqu'un événement imprévu survient, tu peux rapidement imaginer ce qui pourrait mal se passer.

Quand tu attends une nouvelle importante, tes pensées peuvent revenir constamment sur cette situation.

Et lorsque tu ne peux rien faire pour changer les choses, tu peux avoir du mal à retrouver ton calme.

Tu as peut-être l'impression que, si tu arrêtes de réfléchir au problème, tu risques de manquer quelque chose ou de ne pas être suffisamment préparé.

Mais il existe une différence entre réfléchir à une situation pour agir et y penser sans cesse sans pouvoir avancer.

L'inquiétude donne parfois l'impression que nous gardons le contrôle, alors qu'elle peut surtout nous épuiser.

Cela ne signifie pas que tu manques de foi ou que tu es incapable de faire confiance à Dieu.

La paix est un fruit qui peut grandir progressivement, même lorsque les circonstances restent difficiles.`,
        growth: `Dans Marc 4:35-41, les disciples de Jésus se retrouvent au milieu d'une violente tempête.

Ils ont peur. Leur barque prend l'eau et ils pensent qu'ils vont mourir.

Pourtant, Jésus est avec eux.

Ce passage nous rappelle quelque chose d'essentiel : la présence de Jésus n'a pas empêché les disciples de traverser une tempête.

Être avec Dieu ne signifie pas que nous ne rencontrerons jamais de problèmes.

Mais nous pouvons apprendre à nous tourner vers lui au milieu de nos difficultés.

Tu n'as pas besoin de prétendre que tout va bien.

Tu peux lui dire que tu as peur, que tu ne comprends pas ce qui se passe ou que tu ne sais pas comment avancer.

La prière n'est pas un exercice où tu dois trouver les bons mots. C'est un espace où tu peux déposer sincèrement ce que tu vis.

Commence simplement.

Lorsque tu te sens inquiet, prends un moment pour identifier ce qui te fait réellement peur.

Puis demande-toi si tu peux agir concrètement sur cette situation.

Si oui, choisis une petite action.

Si non, entraîne-toi à ne pas chercher immédiatement une réponse à toutes tes questions.

La paix ne commence pas toujours lorsque les problèmes disparaissent. Elle peut commencer lorsque tu apprends à ne plus les porter seul.`,
        challengeTitle: "Cinq minutes pour déposer tes inquiétudes.",
        challenge: `Pendant sept jours, prends cinq minutes dans un endroit calme.
1. Identifie une inquiétude précise.
2. Dis à Dieu, avec tes propres mots, ce qui te fait peur.
3. Demande-lui de t'aider à lui faire confiance, même si la situation ne change pas immédiatement.
4. Termine en identifiant une chose concrète que tu peux faire aujourd'hui, ou en acceptant de ne rien pouvoir faire pour le moment.
Si ton inquiétude reste très présente, n'hésite pas à en parler à une personne de confiance.`,
        reflection: "Est-ce que je crois que Dieu peut être présent avec moi, même lorsque je ne comprends pas ce qu'il est en train de faire ?",
      },
    },
  },
  {
    key: "patience",
    number: 4,
    name: "La patience",
    verse: "« Soyez toujours humbles, doux et patients, supportez-vous les uns les autres avec amour. » — Éphésiens 4:2",
    overviewTitle: "Qu'est-ce que la patience ?",
    overview: `La patience, ce n'est pas simplement savoir attendre sans s'énerver.

C'est apprendre à rester bienveillant lorsque les autres n'avancent pas aussi vite que nous, ne comprennent pas immédiatement ou répètent les mêmes erreurs.

Il est facile d'être patient lorsque tout se déroule comme prévu. Mais que se passe-t-il lorsqu'une personne nous fait perdre du temps ? Lorsqu'elle ne comprend pas quelque chose que nous trouvons évident ? Ou lorsqu'elle recommence une erreur que nous lui avons déjà expliquée ?

La patience se révèle particulièrement lorsque les autres ne répondent pas à nos attentes.

Être patient ne signifie pas tout accepter, ne jamais se mettre en colère ou renoncer à ses exigences.

C'est apprendre à exprimer ce qui ne va pas sans humilier, à corriger sans décourager et à laisser aux autres le temps de progresser.

Dieu lui-même fait preuve de patience envers nous. Il connaît nos faiblesses, nos hésitations et nos erreurs répétées.

La patience est un fruit de l'Esprit qui nous apprend à traiter les autres avec cette même disposition de cœur.`,
    levels: {
      practice: {
        discovery: `Tes réponses montrent que tu sembles capable de rester patient même lorsque les autres te ralentissent ou commettent des erreurs.

Quand une personne ne comprend pas immédiatement, tu arrives généralement à lui laisser du temps.

Lorsqu'une erreur se répète, tu peux ressentir de la frustration, mais tu cherches à ne pas laisser cette émotion déterminer ta manière de traiter l'autre.

Tu sembles comprendre quelque chose d'important : une personne ne progresse pas toujours au rythme que nous souhaiterions.

Cette attitude peut être particulièrement précieuse lorsque tu accompagnes, formes ou travailles avec d'autres personnes.

La patience crée un environnement dans lequel les autres peuvent poser des questions, reconnaître leurs difficultés et apprendre sans craindre d'être immédiatement jugés.

Mais attention : être patient ne signifie pas devoir constamment compenser les erreurs des autres.`,
        growth: `Dans 2 Pierre 3:9, nous découvrons que Dieu fait preuve de patience, ne voulant pas que quelqu'un périsse, mais que tous parviennent à la repentance.

Sa patience n'est pas de l'indifférence. Elle exprime son désir de laisser une place au changement.

Tu peux t'inspirer de cette attitude dans tes relations.

Lorsque quelqu'un rencontre une difficulté, ne cherche pas uniquement à résoudre le problème à sa place.

Demande-toi comment tu peux l'aider à devenir plus autonome.

Parfois, la patience consiste à expliquer une nouvelle fois. D'autres fois, elle consiste à laisser quelqu'un essayer, se tromper et recommencer.

Le but de la patience n'est pas de supporter indéfiniment les erreurs, mais de permettre aux autres de grandir sans les décourager.

Continue à développer une patience qui encourage les progrès tout en responsabilisant chacun.`,
        challengeTitle: "Accompagne sans faire à la place.",
        challenge: `Cette semaine, lorsqu'une personne rencontre une difficulté que tu pourrais résoudre rapidement :
1. Résiste à l'envie de prendre immédiatement les choses en main.
2. Demande-lui ce qu'elle a déjà essayé.
3. Aide-la à trouver sa propre solution.
L'objectif n'est pas seulement de régler le problème, mais de lui permettre de progresser.`,
        reflection: "Est-ce que ma patience aide réellement les autres à grandir, ou est-ce que je finis parfois par tout faire à leur place ?",
      },
      develop: {
        discovery: `Tu peux être compréhensif lorsque quelqu'un se trompe une première fois. Mais quand les erreurs se répètent, il devient plus difficile de garder la même attitude.

Peut-être que ce qui te dérange le plus n'est pas l'erreur elle-même, mais ses conséquences : le temps perdu, les efforts supplémentaires ou l'impression que l'autre ne fait pas suffisamment attention.

Tu peux alors ressentir le besoin de reprendre les choses en main, de faire des reproches ou de montrer ton agacement.

Pourtant, c'est précisément dans ces moments que la patience prend tout son sens.

Elle ne consiste pas à renoncer à tes exigences, mais à apprendre à accompagner les autres sans les décourager.

Tu peux demander à quelqu'un de faire mieux tout en respectant sa dignité.`,
        growth: `Dans Colossiens 3:12-13, Paul encourage les chrétiens à se revêtir de patience, à se supporter les uns les autres et à se pardonner mutuellement.

Pourquoi cette invitation est-elle importante ?

Parce que vivre avec les autres implique nécessairement de rencontrer leurs limites.

Les autres ne comprendront pas toujours aussi vite que toi. Ils n'auront pas toujours les mêmes réflexes, les mêmes capacités ou les mêmes priorités.

Et toi aussi, tu auras parfois besoin que quelqu'un fasse preuve de patience envers toi.

Dieu fait preuve de patience envers nous, même lorsque nous répétons les mêmes erreurs.

Cela ne signifie pas qu'il approuve tout ce que nous faisons, mais qu'il nous laisse une place pour apprendre et grandir.

La prochaine fois que quelqu'un te déçoit, essaie de changer de question.

Au lieu de te demander :

« Pourquoi est-ce qu'il recommence ? »

Demande-toi :

« De quoi cette personne a-t-elle besoin pour progresser ? »

Peut-être qu'elle a besoin d'une explication différente, de davantage de pratique ou d'un cadre plus clair.

Tu découvriras que la patience peut transformer ta manière de corriger, de transmettre et d'encourager.`,
        challengeTitle: "Corrige sans décourager.",
        challenge: `Lorsqu'une personne commet une erreur cette semaine :
1. Prends le temps de lui demander ce qui l'a mise en difficulté.
2. Écoute son explication sans l'interrompre.
3. Aide-la à trouver une solution avant de lui expliquer ce qu'elle aurait dû faire.`,
        reflection: "Est-ce que ma réaction lui a donné envie de progresser ou peur de se tromper ?",
      },
      discover: {
        discovery: `Tes réponses suggèrent qu'il peut être difficile pour toi de rester patient lorsque les autres te ralentissent ou ne répondent pas à tes attentes.

Quand une personne met beaucoup de temps à comprendre, tu peux rapidement ressentir de l'agacement.

Lorsqu'elle répète une erreur, tu peux avoir l'impression qu'elle ne fait pas suffisamment d'efforts ou qu'elle ne t'écoute pas.

Et lorsque tu es pressé, les besoins ou les difficultés des autres peuvent devenir particulièrement frustrants.

Tu apprécies peut-être que les choses avancent rapidement et efficacement.

Ce n'est pas un défaut en soi.

Mais lorsque notre besoin d'efficacité devient plus important que la manière dont nous traitons les personnes, nos relations peuvent en souffrir.

La patience nous apprend à nous rappeler qu'une personne a plus de valeur que le temps qu'elle nous fait perdre.`,
        growth: `Dans Exode 34:6, Dieu se présente notamment comme un Dieu compatissant, qui fait grâce et qui est lent à la colère.

Cette expression est importante.

Dieu ne dit pas qu'il ne se met jamais en colère. Il révèle qu'il est lent à la colère.

Il ne réagit pas avec précipitation à chaque faute. Sa patience laisse une place à la repentance et au changement.

C'est une attitude que tu peux apprendre à développer.

La prochaine fois que quelqu'un te fait perdre du temps, rappelle-toi que tu ne connais pas nécessairement toutes les raisons de sa difficulté.

Peut-être qu'il apprend, qu'il manque d'expérience ou qu'il traverse une période compliquée.

Cela ne signifie pas que tu dois excuser toutes les erreurs.

Mais avant de réagir, tu peux choisir de chercher à comprendre.

La patience commence souvent par quelques secondes pendant lesquelles tu décides de ne pas laisser ton agacement parler à ta place.

Tu n'as pas besoin de devenir parfaitement patient du jour au lendemain.

Commence par apprendre à ralentir ta réaction.`,
        challengeTitle: "Apprends à ralentir avant de réagir.",
        challenge: `Cette semaine, lorsque quelqu'un te fait perdre du temps ou commet une erreur :
1. Attends quelques secondes avant de répondre.
2. Demande-toi si tu connais réellement la raison de sa difficulté.
3. Pose une question pour comprendre avant de faire un reproche.
Tu peux exprimer ton mécontentement, mais cherche à le faire sans attaquer la personne.`,
        reflection: "Quand quelqu'un me ralentit, est-ce que je vois d'abord un problème à résoudre ou une personne à respecter ?",
      },
    },
  },
  {
    key: "bonte",
    number: 5,
    name: "La bonté",
    verse: "« Ainsi donc, pendant que nous en avons l'occasion, pratiquons le bien envers tous. » — Galates 6:10",
    overviewTitle: "Qu'est-ce que la bonté ?",
    overview: `La bonté, ce n'est pas simplement être quelqu'un de gentil ou avoir de bonnes intentions.

C'est choisir de faire du bien aux autres et transformer cet amour en actes concrets.

Tu peux être touché par les difficultés d'une personne, trouver une situation injuste ou avoir envie d'aider quelqu'un. Mais la bonté nous pousse à aller plus loin : elle nous invite à agir.

Jésus ne s'est pas contenté de dire aux personnes qu'il les aimait. Il a pris le temps de les écouter, de les nourrir, de les accueillir et de répondre à leurs besoins.

La bonté peut se manifester de différentes manières : rendre un service, encourager quelqu'un, partager ce que l'on possède, aider une personne en difficulté ou simplement remarquer quelqu'un que les autres ignorent.

Et elle ne se limite pas aux personnes que nous apprécions ou qui peuvent nous apporter quelque chose en retour.

La bonté, c'est apprendre à ne pas passer à côté d'une occasion de faire du bien.`,
    levels: {
      practice: {
        discovery: `Tes réponses suggèrent que tu es attentif aux besoins des autres et que tu cherches à y répondre concrètement.

Lorsque tu remarques une personne isolée, tu sembles capable de prendre l'initiative d'aller vers elle.

Quand quelqu'un rencontre une difficulté, tu ne te contentes pas de constater son problème. Tu cherches à comprendre comment tu pourrais l'aider.

Et même lorsque cela te demande un effort, tu sembles prêt à consacrer du temps ou de l'énergie pour soutenir quelqu'un.

Tu as compris que faire du bien ne dépend pas seulement de ce que l'on ressent, mais aussi de ce que l'on décide de faire.

Cette attitude peut avoir beaucoup de valeur pour ton entourage.

Un geste qui te paraît simple peut être important pour une personne qui se sent oubliée, découragée ou dépassée.

Mais il existe aussi un point de vigilance : vouloir aider tout le monde peut parfois conduire à prendre des responsabilités qui ne nous appartiennent pas.`,
        growth: `Dans Actes 9:36, nous découvrons Tabitha, également appelée Dorcas.

La Bible nous dit qu'elle faisait beaucoup de bonnes œuvres et d'actes de générosité.

Ce qui est remarquable, c'est que son témoignage ne repose pas sur de grands discours, mais sur ce qu'elle faisait concrètement pour les autres.

Après sa mort, les veuves montrent à Pierre les vêtements qu'elle avait confectionnés.

Ses actes avaient laissé une trace dans la vie des personnes qu'elle avait aidées.

Tu sembles déjà avoir cette disposition à agir pour le bien des autres.

Pour continuer à grandir, apprends à faire preuve d'une bonté qui ne cherche pas seulement à répondre à un besoin immédiat, mais qui aide aussi les personnes à avancer.

Parfois, la meilleure manière d'aider quelqu'un sera de lui donner quelque chose.

D'autres fois, ce sera de lui apprendre à faire par lui-même, de l'encourager à prendre une décision ou de l'accompagner dans la durée.

La bonté ne consiste pas à devenir indispensable aux autres, mais à contribuer sincèrement à leur bien.`,
        challengeTitle: "Fais du bien sans chercher à être reconnu.",
        challenge: `Cette semaine, identifie un besoin concret autour de toi et choisis d'y répondre discrètement.

Cela peut être aider quelqu'un dans une tâche, offrir un repas, rendre un service ou soutenir une personne qui traverse une difficulté.

Si possible, fais-le sans chercher à raconter ce que tu as fait ni à recevoir des remerciements.`,
        reflection: "Est-ce que je fais du bien uniquement lorsque je peux voir les résultats de mon aide, ou est-ce que je suis également prêt à servir dans l'ombre ?",
      },
      develop: {
        discovery: `Tu es capable de remarquer les besoins des autres et tu as envie de leur faire du bien.

Mais il peut parfois exister un décalage entre ce que tu aimerais faire et ce que tu fais réellement.

Tu peux voir une personne seule sans oser aller lui parler.

Tu peux remarquer qu'un collègue ou un ami rencontre une difficulté, mais hésiter à proposer ton aide parce que tu es déjà occupé.

Ou tu peux simplement penser que quelqu'un d'autre interviendra.

Ce n'est pas nécessairement un manque de générosité.

Peut-être que tu ne sais pas comment t'y prendre, que tu as peur de déranger ou que tu attends d'avoir davantage de temps.

Mais la bonté ne grandit pas uniquement dans nos intentions. Elle grandit lorsque nous décidons de passer à l'action.`,
        growth: `Dans Luc 10:30-37, Jésus raconte la parabole du bon Samaritain.

Un homme a été attaqué et laissé blessé au bord de la route.

Un prêtre passe, puis un Lévite. Tous deux voient cet homme, mais poursuivent leur chemin.

Ensuite, un Samaritain arrive.

Lui aussi voit l'homme blessé. Mais contrairement aux deux premiers, il s'arrête.

Il soigne ses blessures, le transporte dans une auberge et prend des dispositions pour qu'on s'occupe de lui.

La différence entre ces trois hommes ne se trouve pas simplement dans ce qu'ils ont vu.

Elle se trouve dans ce qu'ils ont décidé de faire face au besoin qu'ils avaient devant eux.

Il nous arrive de voir des personnes en difficulté sans agir.

Parfois, nous avons de bonnes raisons : nous manquons de temps, de moyens ou de compétences.

Mais parfois, nous passons simplement à côté d'une occasion de faire du bien.

La prochaine fois que tu remarques un besoin, demande-toi :

« Quel petit geste concret pourrais-je faire aujourd'hui ? »

Tu n'as pas besoin de résoudre tous les problèmes d'une personne.

Une attention sincère, quelques minutes de ton temps ou une aide simple peuvent déjà faire une différence.`,
        challengeTitle: "Passe de l'intention à l'action.",
        challenge: `Cette semaine, lorsque tu remarques qu'une personne pourrait avoir besoin d'aide :
1. Ne te contente pas de penser que quelqu'un devrait intervenir.
2. Demande-lui si elle a besoin de quelque chose.
3. Si tu peux l'aider, propose une action concrète et réalisable.
Tu n'as pas besoin d'en faire beaucoup. L'objectif est d'apprendre à ne pas laisser toutes tes bonnes intentions sans suite.`,
        reflection: "Combien de fois ai-je pensé à faire du bien à quelqu'un sans finalement passer à l'action ? Qu'est-ce qui m'en a empêché ?",
      },
      discover: {
        discovery: `Tes réponses suggèrent qu'il peut être difficile pour toi de prendre spontanément l'initiative d'aider les autres.

Lorsque tu es concentré sur tes activités, tu peux ne pas remarquer les personnes qui auraient besoin d'attention.

Quand quelqu'un rencontre une difficulté, tu peux considérer que ce n'est pas nécessairement à toi d'intervenir.

Et lorsque rendre service demande du temps ou des efforts, tu peux préférer poursuivre ce que tu avais prévu.

Cela ne signifie pas que tu es égoïste ou incapable de générosité.

Mais cela peut révéler que les besoins des autres ne prennent pas encore naturellement une place dans tes décisions quotidiennes.

Nous avons tous nos responsabilités, nos préoccupations et nos objectifs.

Il est facile d'être tellement absorbé par notre propre vie que nous finissons par ne plus voir ce qui se passe autour de nous.

La bonté nous invite à élargir notre regard.`,
        growth: `Dans Marc 10:45, Jésus explique qu'il n'est pas venu pour être servi, mais pour servir.

Cette parole nous montre une dimension essentielle du cœur de Jésus.

Alors qu'il est le Fils de Dieu, il choisit de se mettre au service des autres.

Il ne considère pas les besoins des personnes comme des interruptions permanentes à sa mission.

Au contraire, prendre soin des autres fait partie de sa mission.

Tu peux apprendre à développer cette même attitude.

Cela ne signifie pas que tu dois abandonner tes responsabilités pour répondre à toutes les demandes.

Mais tu peux commencer par regarder les personnes qui t'entourent autrement.

Au lieu de te demander uniquement :

« Qu'est-ce que je dois faire aujourd'hui ? »

Essaie aussi de te demander :

« À qui pourrais-je faire du bien aujourd'hui ? »

Peut-être qu'une personne de ton entourage traverse une période difficile sans en parler.

Peut-être qu'un collègue aurait besoin d'un encouragement.

Peut-être qu'une personne à l'église vient depuis plusieurs semaines sans que quelqu'un ait pris le temps de lui parler.

La bonté commence souvent par une chose très simple : apprendre à remarquer les autres.

Et plus tu apprendras à les voir, plus tu découvriras des occasions de leur faire du bien.`,
        challengeTitle: "Apprends à voir les besoins autour de toi.",
        challenge: `Pendant sept jours, prends l'habitude de te poser cette question chaque matin :

« À qui pourrais-je faire du bien aujourd'hui ? »

Choisis chaque jour une petite action :
- Encourager sincèrement quelqu'un.
- Prendre des nouvelles d'une personne.
- Proposer ton aide pour une tâche.
- Aller parler à quelqu'un qui semble isolé.
- Rendre un service sans attendre quelque chose en retour.`,
        reflection: "Est-ce que je remarque les besoins des personnes autour de moi, ou est-ce que je suis tellement concentré sur mes propres préoccupations que je passe à côté ?",
      },
    },
  },
  {
    key: "bienveillance",
    number: 6,
    name: "La bienveillance",
    verse: "« Soyez bons les uns envers les autres, pleins de compassion, pardonnez-vous réciproquement, comme Dieu vous a pardonné en Christ. » — Éphésiens 4:32",
    overviewTitle: "Qu'est-ce que la bienveillance ?",
    overview: `La bienveillance, ce n'est pas simplement être gentil, poli ou agréable avec les autres.

C'est choisir de regarder les personnes avec respect, de chercher à les comprendre et de leur vouloir du bien, même lorsque leur comportement nous déçoit.

Il est facile d'être bienveillant avec quelqu'un qui partage nos idées, qui nous apprécie ou qui se comporte comme nous l'attendons.

Mais que se passe-t-il lorsqu'une personne commet une erreur ? Quand elle nous déçoit ? Quand nous ne comprenons pas ses réactions ?

Notre premier réflexe peut être de la juger, de lui faire des reproches ou de tirer des conclusions sur ses intentions.

La bienveillance nous invite à adopter une autre attitude : prendre le temps de comprendre avant de juger.

Cela ne signifie pas tout excuser, être naïf ou accepter des comportements blessants.

Être bienveillant, ce n'est pas fermer les yeux sur les erreurs des autres. C'est refuser de réduire une personne à ses erreurs.

La bienveillance est proche de la bonté, mais elle met particulièrement l'accent sur la manière dont nous considérons et traitons les autres. La bonté se manifeste notamment dans les actes que nous posons pour leur faire du bien.`,
    levels: {
      practice: {
        discovery: `Tes réponses suggèrent que tu cherches généralement à comprendre les autres avant de porter un jugement sur leur comportement.

Quand une personne te déçoit, tu sembles capable d'écouter ses explications plutôt que de conclure immédiatement qu'elle a mal agi volontairement.

Lorsqu'une personne commet une erreur, tu essaies de comprendre ce qui l'a mise en difficulté avant de lui faire des reproches.

Et quand quelqu'un se trouve dans une situation embarrassante, tu fais attention à ne pas accentuer son malaise.

Cela révèle une attitude précieuse : tu sembles accorder de l'importance à la dignité des personnes, même lorsqu'elles se trompent.

Cette manière d'agir peut permettre aux autres de se sentir suffisamment en confiance pour reconnaître leurs erreurs, poser des questions ou exprimer leurs difficultés.

Mais il existe aussi un point de vigilance.

À force de vouloir comprendre les autres, tu peux parfois être tenté de minimiser leurs responsabilités ou d'éviter certaines conversations difficiles.

La bienveillance ne demande pas de choisir entre comprendre et dire la vérité.`,
        growth: `Dans Jean 8:1-11, des spécialistes de la loi et des pharisiens amènent à Jésus une femme surprise en adultère.

Ils veulent la condamner et cherchent à mettre Jésus à l'épreuve.

Jésus refuse d'entrer dans leur logique d'accusation.

Il invite ceux qui sont sans péché à jeter la première pierre.

Puis, lorsqu'ils sont partis, il dit à cette femme qu'il ne la condamne pas et l'appelle à ne plus pécher.

Cette scène nous montre une chose importante : Jésus ne réduit pas cette femme à sa faute, mais il ne prétend pas non plus que son comportement est sans importance.

Il lui témoigne de la dignité tout en l'invitant à changer.

Tu peux apprendre à développer cette même attitude.

Lorsque quelqu'un commet une erreur, tu peux chercher à comprendre ce qui s'est passé sans nier les conséquences de ses actes.

Tu peux être attentif à ses difficultés tout en lui demandant de prendre ses responsabilités.

Et tu peux lui parler avec respect sans éviter de lui dire ce qu'il a besoin d'entendre.

La bienveillance devient particulièrement précieuse lorsqu'elle associe la compassion, la vérité et le respect.`,
        challengeTitle: "Dis la vérité avec bienveillance.",
        challenge: `Cette semaine, si une personne de ton entourage commet une erreur ou adopte un comportement que tu dois reprendre :
1. Commence par lui demander ce qui s'est passé.
2. Écoute son explication sans l'interrompre.
3. Exprime clairement ce qui doit changer, sans attaquer sa personne.`,
        reflection: "Est-ce que je sais faire preuve de bienveillance tout en ayant le courage de dire les choses importantes ?",
      },
      develop: {
        discovery: `Tu es capable de faire preuve de compréhension envers les autres, mais certaines situations peuvent rendre cette attitude plus difficile.

Lorsque quelqu'un commet une erreur qui te pénalise, tu peux rapidement te concentrer sur les conséquences de son comportement.

Quand une personne te déçoit, tu peux avoir tendance à penser qu'elle aurait dû agir autrement ou qu'elle aurait pu faire davantage d'efforts.

Et lorsque quelqu'un se comporte d'une manière que tu ne comprends pas, tu peux parfois tirer des conclusions avant d'avoir pris le temps de l'écouter.

Ce n'est pas nécessairement parce que tu manques de compassion.

Il est naturel de réagir à ce qui nous semble injuste ou incompréhensible.

Mais nous jugeons parfois les autres à partir de ce que nous voyons, sans connaître tout ce qu'ils vivent.

Une personne peut sembler désintéressée alors qu'elle traverse une période difficile.

Une autre peut paraître maladroite alors qu'elle manque simplement d'expérience.

Cela ne justifie pas automatiquement leurs comportements, mais peut changer la manière dont nous leur répondons.`,
        growth: `Dans 1 Samuel 16:7, Dieu dit à Samuel :

« L'homme regarde à ce qui frappe les yeux, mais l'Éternel regarde au cœur. »

Samuel devait choisir celui qui serait oint comme roi d'Israël. En voyant Éliab, il pensait avoir trouvé la bonne personne.

Mais Dieu lui rappelle que les apparences ne suffisent pas pour connaître quelqu'un.

Ce passage nous enseigne une leçon importante : nous pouvons nous tromper lorsque nous pensons comprendre une personne uniquement à partir de ce que nous voyons.

Contrairement à Dieu, nous ne connaissons pas parfaitement le cœur des autres.

C'est pourquoi la bienveillance nous invite à faire preuve d'humilité dans nos jugements.

La prochaine fois que quelqu'un te déçoit, essaie de ne pas conclure immédiatement :

« Il est irresponsable. »

« Elle ne fait aucun effort. »

« Il ne pense qu'à lui. »

Demande-toi plutôt :

« Est-ce que je connais suffisamment la situation pour comprendre pourquoi cette personne a agi ainsi ? »

Tu n'es pas obligé d'être d'accord avec son comportement.

Mais prendre le temps de comprendre peut t'aider à répondre de manière plus juste.`,
        challengeTitle: "Cherche à comprendre avant de conclure.",
        challenge: `Cette semaine, lorsqu'une personne adopte un comportement qui t'agace ou te déçoit :
1. Identifie le jugement qui te vient spontanément à l'esprit.
2. Demande-toi si tu connais réellement les raisons de son comportement.
3. Si la situation le permet, pose-lui une question sincère pour mieux comprendre.`,
        reflection: "Est-ce que je laisse suffisamment de place aux explications des autres, ou est-ce que je décide parfois trop rapidement de ce qu'ils pensent et de ce qu'ils sont ?",
      },
      discover: {
        discovery: `Tes réponses suggèrent qu'il peut être difficile pour toi de faire preuve de compréhension lorsque les autres ne se comportent pas comme tu l'attends.

Quand quelqu'un commet une erreur, tu peux avoir tendance à te concentrer immédiatement sur ce qu'il aurait dû faire.

Lorsqu'une personne te déçoit, tu peux tirer rapidement des conclusions sur ses intentions.

Et lorsque quelqu'un se trouve dans une situation embarrassante, tu peux ne pas toujours mesurer l'effet de tes paroles ou de tes réactions.

Cela ne signifie pas que tu es une mauvaise personne ou que tu souhaites faire du mal aux autres.

Mais cela peut révéler une habitude : regarder d'abord les comportements des personnes, avant de chercher à comprendre ce qu'elles vivent.

Nous avons tous tendance à interpréter les situations à partir de notre propre expérience.

Ce qui nous paraît évident ne l'est pas forcément pour quelqu'un d'autre.

Ce qui nous semble facile peut représenter un véritable défi pour une autre personne.

La bienveillance commence lorsque nous acceptons que notre manière de voir les choses n'est pas la seule possible.`,
        growth: `Dans Luc 19:1-10, Jésus rencontre Zachée, un chef des collecteurs d'impôts.

Zachée est mal considéré par son entourage. Lorsque Jésus décide de se rendre chez lui, les personnes présentes murmurent parce qu'il entre chez un homme qu'elles considèrent comme pécheur.

Mais Jésus ne se contente pas de regarder Zachée à travers sa réputation.

Il choisit d'aller à sa rencontre.

Cette rencontre marque un tournant dans la vie de Zachée, qui annonce sa décision de donner aux pauvres et de réparer les torts qu'il a causés.

Ce récit nous montre que la manière dont nous regardons une personne peut influencer la place que nous lui laissons pour changer.

Lorsque nous réduisons quelqu'un à ses erreurs, nous risquons de ne plus voir ses possibilités de progression.

À l'inverse, lorsque nous choisissons de le considérer avec respect, nous pouvons créer un espace dans lequel il devient plus facile de reconnaître ses fautes et d'avancer.

Tu peux commencer à développer cette attitude dans des situations très simples.

Quand quelqu'un t'agace, évite de lui attribuer immédiatement une mauvaise intention.

Quand une personne fait une erreur, demande-lui ce qui s'est passé.

Et lorsque tu ne comprends pas un comportement, rappelle-toi que tu ne connais peut-être pas toute son histoire.

La bienveillance ne commence pas lorsque nous comprenons parfaitement les autres. Elle commence lorsque nous acceptons de ne pas les juger trop vite.`,
        challengeTitle: "Apprends à regarder les autres autrement.",
        challenge: `Pendant sept jours, choisis une situation quotidienne dans laquelle quelqu'un t'agace, te déçoit ou agit différemment de ce que tu aurais souhaité.

Avant de porter un jugement :
1. Arrête-toi quelques secondes.
2. Imagine au moins une explication possible qui ne suppose pas une mauvaise intention.
3. Si cela est approprié, prends le temps de demander à la personne ce qui s'est passé.`,
        reflection: "Est-ce que je cherche réellement à connaître les personnes, ou est-ce que je me contente parfois de l'idée que je me fais d'elles ?",
      },
    },
  },
  {
    key: "fidelite",
    number: 7,
    name: "La fidélité",
    verse: "« Celui qui est fidèle dans les petites choses l'est aussi dans les grandes. » — Luc 16:10",
    overviewTitle: "Qu'est-ce que la fidélité ?",
    overview: `La fidélité, ce n'est pas simplement rester attaché à une personne ou ne jamais abandonner un projet.

C'est être une personne sur laquelle les autres peuvent compter, même lorsque tenir ses engagements devient difficile.

Il est facile de faire une promesse lorsque nous sommes motivés, disponibles ou enthousiastes. Mais que se passe-t-il lorsque la fatigue arrive ? Lorsque les circonstances changent ? Lorsque personne ne vérifie si nous avons fait ce que nous avions annoncé ?

La fidélité se manifeste dans ces moments-là.

Elle nous pousse à respecter notre parole, à assumer nos responsabilités et à rester honnêtes, même lorsque cela nous coûte quelque chose.

Elle concerne aussi notre relation avec Dieu : continuer à lui faire confiance, à rechercher sa volonté et à lui obéir, même lorsque nous ne voyons pas immédiatement les résultats.

Mais être fidèle ne signifie pas dire oui à tout, rester dans une situation destructrice ou s'obstiner dans un engagement devenu impossible.

Parfois, la fidélité consiste justement à reconnaître ses limites, à prévenir honnêtement et à chercher une solution responsable.

La fidélité, c'est apprendre à faire correspondre nos paroles, nos décisions et nos actes.`,
    levels: {
      practice: {
        discovery: `Tes réponses suggèrent que tu prends tes engagements au sérieux.

Quand tu promets quelque chose, tu cherches généralement à aller jusqu'au bout, même si cela demande davantage d'efforts que prévu.

Lorsque tu réalises que tu ne pourras pas respecter une promesse, tu sembles capable de prévenir la personne concernée plutôt que de la laisser attendre sans explication.

Et lorsque tu reconnais une erreur, tu peux l'assumer, même devant les autres.

Cela montre une attitude précieuse : tu accordes de l'importance à ta parole et tu acceptes d'être responsable de tes actes.

Cette fidélité contribue à construire la confiance.

Les autres peuvent apprendre à compter sur toi, non parce que tu ne commets jamais d'erreurs, mais parce que tu cherches à être honnête et fiable.

Cependant, il existe un point auquel tu dois rester attentif.

À force de vouloir respecter tes engagements, tu peux parfois avoir du mal à reconnaître que tu en as pris trop.

Être fidèle ne signifie pas devenir indispensable ou ne jamais décevoir personne.`,
        growth: `Dans Matthieu 25:14-30, Jésus raconte la parabole des talents.

Un maître confie différentes sommes d'argent à ses serviteurs avant de partir en voyage.

À son retour, il demande à chacun ce qu'il a fait de ce qui lui avait été confié.

Aux deux premiers serviteurs, qui ont fait fructifier leur dépôt, il dit :

« C'est bien, bon et fidèle serviteur. »

Ce qui est intéressant, c'est que les deux serviteurs n'avaient pas reçu la même somme.

Pourtant, ils reçoivent la même reconnaissance.

La fidélité ne consiste donc pas à avoir les mêmes capacités, les mêmes responsabilités ou les mêmes résultats que les autres.

Elle consiste à prendre soin de ce qui nous a été confié.

Tu sembles déjà avoir le souci d'honorer tes engagements.

Pour continuer à grandir, demande-toi si tu consacres autant d'attention aux petites responsabilités qu'aux grandes.

Il est parfois plus facile d'être sérieux dans un projet important, visible ou valorisant que dans une tâche ordinaire que personne ne remarque.

Pourtant, notre fidélité se construit aussi dans ces moments.

Continue à développer une fidélité qui ne dépend ni de la reconnaissance des autres ni de l'importance apparente de la tâche.`,
        challengeTitle: "Sois fidèle dans ce que personne ne voit.",
        challenge: `Cette semaine, identifie une responsabilité discrète que tu as tendance à considérer comme secondaire.

Cela peut être une tâche à la maison, un engagement dans ton service, une promesse faite à un proche ou un travail que personne ne vérifiera.

Accomplis-la avec autant de sérieux que si elle était importante aux yeux de tous.`,
        reflection: "Est-ce que je mets autant de soin dans les responsabilités invisibles que dans celles pour lesquelles je peux recevoir de la reconnaissance ?",
      },
      develop: {
        discovery: `Tu souhaites être une personne fiable et tu prends généralement tes engagements avec de bonnes intentions.

Mais il peut parfois exister un décalage entre ce que tu promets et ce que tu arrives réellement à accomplir.

Lorsque tu acceptes une responsabilité, tu peux être motivé au départ. Puis la fatigue arrive, d'autres priorités apparaissent ou la tâche demande plus de temps que prévu.

Tu peux alors avoir tendance à repousser ce que tu avais promis.

Parfois, tu attends aussi le dernier moment pour prévenir que tu ne pourras pas respecter ton engagement.

Et lorsque tu commets une erreur, il peut être difficile de la reconnaître, surtout devant les autres.

Cela ne signifie pas que tu manques de sincérité.

Mais cela révèle peut-être une difficulté : tu as parfois plus de facilité à prendre un engagement qu'à en assumer toutes les conséquences.

La fidélité ne se mesure pas uniquement à notre enthousiasme au moment de dire oui.

Elle se révèle dans ce que nous faisons une fois que nous nous sommes engagés.`,
        growth: `Dans Matthieu 5:37, Jésus enseigne :

« Que votre parole soit oui, oui, non, non. »

Cette parole nous rappelle l'importance de la sincérité et de la fiabilité.

Jésus nous invite à être des personnes dont la parole peut être prise au sérieux.

Mais pour cela, nous devons aussi apprendre à ne pas promettre trop rapidement.

Il est parfois tentant de dire oui pour faire plaisir, pour ne pas décevoir ou parce qu'un projet nous enthousiasme.

Puis nous découvrons que nous n'avons ni le temps ni les ressources nécessaires.

La fidélité commence donc avant même de prendre un engagement.

Elle commence lorsque nous apprenons à être honnêtes sur ce que nous pouvons réellement faire.

Avant d'accepter une nouvelle responsabilité, pose-toi trois questions :

« Est-ce que j'ai réellement le temps ? »

« Est-ce que je suis prêt à faire cet effort même lorsque je serai moins motivé ? »

« Est-ce que je peux tenir cette promesse sans négliger mes autres responsabilités ? »

Et si tu réalises que tu ne pourras pas respecter un engagement, n'attends pas que l'autre personne vienne te relancer.

Préviens-la, reconnais la difficulté et propose une solution réaliste.

La fidélité ne signifie pas ne jamais échouer.

Elle consiste aussi à assumer honnêtement ce qui n'a pas été accompli.`,
        challengeTitle: "Fais correspondre tes paroles et tes actes.",
        challenge: `Cette semaine :
1. Identifie une promesse ou une responsabilité que tu as repoussée.
2. Décide si tu peux encore l'accomplir dans un délai réaliste.
3. Si oui, fixe un moment précis pour la terminer.
4. Si non, préviens honnêtement la personne concernée et propose une solution.
Pour tes nouveaux engagements, entraîne-toi à ne pas répondre immédiatement oui.`,
        reflection: "Est-ce que je prends parfois des engagements pour faire plaisir aux autres, sans mesurer si je pourrai réellement les tenir ?",
      },
      discover: {
        discovery: `Tes réponses suggèrent qu'il peut être difficile pour toi de rester constant dans tes engagements lorsque les circonstances deviennent moins favorables.

Tu peux accepter une responsabilité avec enthousiasme, puis perdre progressivement ta motivation.

Lorsque quelque chose te demande plus d'efforts que prévu, tu peux être tenté de le repousser ou de l'abandonner.

Et lorsqu'une promesse devient impossible à tenir, tu peux avoir du mal à prévenir la personne concernée.

Peut-être que tu préfères éviter une conversation inconfortable plutôt que d'expliquer que tu n'as pas pu faire ce que tu avais annoncé.

Tu peux aussi trouver difficile de reconnaître une erreur devant les autres.

Cela ne signifie pas que tu es incapable d'être fidèle ou digne de confiance.

Mais cela peut montrer que tes décisions dépendent encore beaucoup de ta motivation du moment ou de ton envie d'éviter les situations difficiles.

Or, la fidélité nous apprend à agir selon nos engagements et nos convictions, même lorsque nos émotions changent.`,
        growth: `Dans Daniel 6, nous découvrons un homme qui continue à prier Dieu malgré un décret royal interdisant de prier quelqu'un d'autre que le roi.

Daniel sait que sa fidélité à Dieu peut lui coûter très cher.

Pourtant, il continue à prier comme il en avait l'habitude.

Ce récit nous montre que la fidélité ne dépend pas uniquement des circonstances favorables.

Elle se construit dans la constance.

Bien sûr, nos engagements quotidiens ne nous placent pas tous devant des choix aussi difficiles que celui de Daniel.

Mais le principe reste important : la fidélité se développe lorsque nous apprenons à ne pas laisser nos circonstances décider systématiquement de nos convictions et de nos responsabilités.

Si tu souhaites grandir dans ce domaine, ne commence pas par prendre de grandes résolutions.

Commence par de petites choses.

Choisis un engagement simple et réalisable.

Puis respecte-le, même lorsque tu n'en as plus particulièrement envie.

Cela peut être arriver à l'heure, terminer une tâche, tenir une promesse ou reconnaître honnêtement une erreur.

Chaque petit engagement tenu peut t'aider à développer davantage de constance.

Et lorsque tu échoues, ne cherche pas à le cacher.

Reconnais-le, répare ce qui peut l'être et recommence.

Dieu ne t'invite pas à construire une image de personne parfaite.

Il t'appelle à développer une vie dans laquelle tes paroles et tes actes deviennent progressivement plus cohérents.`,
        challengeTitle: "Tiens une petite promesse jusqu'au bout.",
        challenge: `Choisis un engagement simple que tu peux réellement tenir pendant sept jours.

Par exemple :
- Arriver à l'heure à tes rendez-vous.
- Accomplir chaque jour une petite responsabilité.
- Respecter une promesse faite à un proche.
- Prévenir rapidement lorsque tu ne peux pas faire quelque chose.
Ne cherche pas à multiplier les engagements.

Choisis-en un seul et tiens-le avec sérieux.`,
        reflection: "Est-ce que les personnes qui m'entourent peuvent compter sur ma parole, même lorsque je ne suis plus motivé ?",
      },
    },
  },
  {
    key: "douceur",
    number: 8,
    name: "La douceur",
    verse: "« Prenez mon joug sur vous et recevez mes instructions, car je suis doux et humble de cœur. » — Matthieu 11:29",
    overviewTitle: "Qu'est-ce que la douceur ?",
    overview: `La douceur, ce n'est pas être faible, timide ou incapable de s'affirmer.

Ce n'est pas non plus éviter les conflits, accepter toutes les remarques ou laisser les autres décider à notre place.

La douceur, c'est être capable d'utiliser sa force sans chercher à blesser les autres.

Tu peux être convaincu d'avoir raison, défendre fermement une idée ou reprendre quelqu'un qui a mal agi, tout en faisant preuve de douceur.

Jésus était doux, mais cela ne l'empêchait pas de confronter les religieux, de dénoncer l'hypocrisie ou de reprendre ses disciples.

Sa douceur ne venait pas d'un manque de courage. Elle se manifestait dans la manière dont il considérait et traitait les personnes.

La douceur devient particulièrement importante lorsque nous sommes contrariés, critiqués ou injustement traités.

Dans ces moments, nous pouvons avoir envie de nous défendre, de prouver que nous avons raison ou de faire ressentir à l'autre ce qu'il nous a fait subir.

Le fruit de la douceur nous apprend à ne pas laisser notre colère ou notre orgueil décider de la manière dont nous répondons.

Être doux, ce n'est pas renoncer à dire la vérité. C'est apprendre à dire la vérité sans écraser celui qui l'entend.`,
    levels: {
      practice: {
        discovery: `Tes réponses suggèrent que tu arrives généralement à exprimer tes convictions sans chercher à rabaisser les autres.

Lorsque quelqu'un critique ton travail ou remet en question tes idées, tu sembles capable de défendre ton point de vue sans transformer immédiatement la discussion en affrontement.

Même lorsque tu te sens injustement traité, tu cherches à maîtriser tes paroles.

Et lorsque tu es déçu par un résultat collectif, tu sembles faire attention à ne pas faire porter ta frustration aux personnes qui t'entourent.

Cela révèle une capacité précieuse : tu peux être en désaccord avec quelqu'un sans considérer cette personne comme un adversaire.

Cette attitude peut favoriser des relations dans lesquelles les autres osent exprimer leurs opinions, reconnaître leurs erreurs et discuter avec toi sans craindre d'être humiliés.

Mais il existe aussi un point de vigilance.

À force de vouloir préserver de bonnes relations, tu peux parfois hésiter à exprimer clairement ton désaccord ou à confronter une situation qui devrait l'être.

La douceur ne doit pas devenir une manière d'éviter les conversations difficiles.`,
        growth: `Dans Jean 4, Jésus rencontre une femme samaritaine près d'un puits.

Au cours de leur conversation, il aborde avec elle des aspects très personnels de sa vie.

Il ne cherche pas à l'humilier, mais il ne contourne pas non plus la vérité.

Il lui parle avec une franchise qui n'empêche pas le respect.

Cette rencontre nous rappelle que la douceur et la vérité ne sont pas opposées.

Tu peux apprendre à développer cette même attitude.

Lorsque tu dois reprendre quelqu'un, ne cherche pas uniquement à lui faire comprendre qu'il a tort.

Demande-toi aussi comment tu peux lui parler d'une manière qui l'aide réellement à avancer.

Parfois, tu devras être très clair.

Parfois, tu devras poser une limite ferme.

Et parfois, tu devras accepter qu'une personne ne soit pas d'accord avec toi.

La douceur ne se mesure pas à notre capacité à éviter les tensions, mais à notre manière de traiter les autres au milieu de ces tensions.

Continue à développer une douceur qui associe le courage de dire les choses et le respect des personnes.`,
        challengeTitle: "Ose dire la vérité avec douceur.",
        challenge: `Cette semaine, identifie une conversation importante que tu repousses parce que tu crains de créer une tension.

Si la situation est appropriée et sans danger :
1. Prends le temps de clarifier ce que tu souhaites exprimer.
2. Explique les faits sans attaquer la personne.
3. Exprime clairement ton point de vue ou ta limite.
4. Laisse à l'autre la possibilité de répondre.`,
        reflection: "Est-ce que ma douceur me permet de dire la vérité avec amour, ou est-ce qu'elle devient parfois une manière d'éviter les conflits ?",
      },
      develop: {
        discovery: `Tu arrives à écouter les autres et à accepter leurs remarques, tant qu'elles sont exprimées avec respect.

Mais lorsque quelqu'un te critique injustement, surtout devant d'autres personnes, tu peux avoir plus de mal à maîtriser ta réaction.

Tu peux ressentir le besoin de te défendre immédiatement, d'interrompre ton interlocuteur ou de lui montrer qu'il a tort.

Il peut aussi t'arriver de laisser ta frustration apparaître dans tes paroles lorsque les résultats d'un travail collectif te déçoivent.

Le problème n'est pas de vouloir te défendre. Tu en as le droit.

La question est de savoir si, dans ces moments, tu cherches à résoudre le désaccord ou à gagner l'affrontement.

Il est possible d'avoir raison sur le fond, mais de blesser inutilement quelqu'un par la manière dont nous exprimons cette vérité.

La douceur nous apprend à faire attention non seulement à ce que nous disons, mais aussi à la manière dont nous le disons.`,
        growth: `Dans Matthieu 11:29, Jésus dit :

« Je suis doux et humble de cœur. »

Jésus nous montre que la douceur est une attitude du cœur, pas simplement une manière de parler.

Tu peux utiliser des mots polis tout en cherchant intérieurement à rabaisser quelqu'un.

À l'inverse, tu peux exprimer un désaccord ferme avec un véritable respect pour ton interlocuteur.

Dans Proverbes 15:1, nous lisons également :

« Une réponse douce calme la fureur, mais une parole dure excite la colère. »

Ce verset nous rappelle que notre manière de répondre peut apaiser une situation ou, au contraire, aggraver un conflit.

La prochaine fois que quelqu'un te critique, demande-toi :

« Est-ce que je veux que cette personne comprenne mon point de vue, ou est-ce que je veux lui prouver qu'elle a tort ? »

Cette question peut t'aider à reconnaître ce qui motive ta réaction.

Tu n'as pas besoin de renoncer à tes convictions pour faire preuve de douceur.

Tu peux dire :

« Je ne suis pas d'accord avec toi. »

« Je comprends ton point de vue, mais je vois les choses autrement. »

« Je veux bien en discuter, mais pas si nous nous parlons de cette manière. »

La douceur ne supprime pas les désaccords. Elle change la manière dont nous les vivons.`,
        challengeTitle: "Apprends à reprendre sans blesser.",
        challenge: `Cette semaine, lorsque tu seras en désaccord avec quelqu'un :
1. Laisse-le terminer son explication.
2. Explique ce que tu ne partages pas, sans attaquer sa personne.
3. Cherche à terminer la conversation en ayant fait avancer la compréhension mutuelle, même si vous restez en désaccord.`,
        reflection: "Est-ce que cette personne s'est sentie respectée, même si je n'étais pas d'accord avec elle ?",
      },
      discover: {
        discovery: `Tes réponses suggèrent qu'il peut être difficile pour toi de faire preuve de douceur lorsque tu te sens critiqué, contrarié ou injustement traité.

Quand quelqu'un remet en question tes idées, tu peux avoir tendance à réagir rapidement pour défendre ton point de vue.

Lorsque tu es convaincu d'avoir raison, tu peux trouver difficile de laisser l'autre terminer son explication.

Et lorsque tu es déçu par le comportement ou les résultats d'autres personnes, ta frustration peut se ressentir dans ta manière de leur parler.

Cela ne signifie pas que tu souhaites volontairement blesser les autres.

Peut-être que tu es simplement habitué à réagir rapidement, à parler avec beaucoup de franchise ou à défendre fortement tes convictions.

Mais avoir une forte personnalité ne nous dispense pas d'apprendre à traiter les autres avec douceur.

Il est possible de dire quelque chose de vrai d'une manière qui décourage, humilie ou ferme le dialogue.

La douceur nous invite à comprendre que la manière dont nous parlons peut être aussi importante que ce que nous voulons transmettre.`,
        growth: `Dans Galates 6:1, Paul encourage les chrétiens à redresser avec un esprit de douceur une personne qui a commis une faute.

Il ne dit pas d'ignorer la faute.

Il ne dit pas non plus de prétendre que tout va bien.

Il nous enseigne que même lorsqu'une personne a réellement tort, la manière dont nous la reprenons doit refléter le caractère de Christ.

C'est une leçon importante.

Tu peux avoir raison et manquer de douceur.

Tu peux identifier correctement une erreur et réagir d'une manière qui blesse inutilement.

Tu peux même défendre une bonne cause avec une attitude qui ne reflète pas l'amour de Dieu.

La vérité que nous défendons ne justifie pas toutes les manières de la défendre.

La prochaine fois que quelqu'un te contrarie, essaie de ne pas répondre immédiatement.

Prends quelques secondes pour reconnaître ce que tu ressens.

Est-ce de la colère ? De la frustration ? Le sentiment de ne pas être respecté ?

Puis demande-toi :

« Comment puis-je exprimer ce que je pense sans chercher à faire mal à cette personne ? »

Tu n'as pas besoin de devenir quelqu'un qui n'ose plus parler ou qui accepte toutes les situations.

Tu peux apprendre à être ferme sans être dur.

À dire non sans mépriser.

À corriger sans humilier.

Et à défendre tes convictions sans transformer chaque désaccord en combat.

La douceur commence lorsque tu apprends à maîtriser ta force plutôt qu'à l'imposer aux autres.`,
        challengeTitle: "Apprends à répondre sans attaquer.",
        challenge: `Pendant sept jours, lorsque tu ressens de l'agacement ou de la colère dans une conversation :
1. Attends quelques secondes avant de répondre.
2. Laisse l'autre terminer ce qu'il souhaite dire.
3. Exprime ton désaccord en parlant des faits plutôt qu'en jugeant la personne.
4. Si tu sens que tu vas perdre ton calme, propose de reprendre la conversation plus tard.`,
        reflection: "Quand je suis contrarié, est-ce que mes paroles cherchent à résoudre le problème ou à faire ressentir à l'autre ma colère ?",
      },
    },
  },
  {
    key: "maitrise",
    number: 9,
    name: "La maîtrise de soi",
    verse: "« Car ce n'est pas un esprit de timidité que Dieu nous a donné, mais un esprit de force, d'amour et de sagesse. » — 2 Timothée 1:7",
    overviewTitle: "Qu'est-ce que la maîtrise de soi ?",
    overview: `La maîtrise de soi, ce n'est pas simplement être calme, discipliné ou avoir beaucoup de volonté.

C'est apprendre à ne pas laisser nos émotions, nos envies ou nos impulsions décider à notre place.

Nous avons tous des moments où nous ressentons de la colère, de la frustration, de la peur ou une forte envie de faire quelque chose.

Ces émotions ne sont pas mauvaises en elles-mêmes.

La colère peut nous signaler une injustice. La peur peut nous avertir d'un danger. La fatigue peut nous rappeler que nous avons besoin de repos.

Mais ressentir une émotion ne signifie pas que nous devons automatiquement agir en fonction d'elle.

Tu peux être en colère sans blesser quelqu'un. Tu peux avoir envie d'abandonner sans renoncer à un engagement important. Tu peux ressentir une forte tentation sans être obligé d'y céder.

La maîtrise de soi concerne nos paroles, nos décisions, nos habitudes et nos comportements, y compris lorsque personne ne nous regarde.

Jésus lui-même a été tenté, mais il n'a pas cédé au péché.

La maîtrise de soi, ce n'est pas ne plus rien ressentir. C'est apprendre à choisir ce que nous faisons de ce que nous ressentons.`,
    levels: {
      practice: {
        discovery: `Tes réponses suggèrent que tu arrives généralement à prendre du recul avant d'agir.

Lorsque tu es débordé, tu sembles capable de reconnaître ton agacement sans le laisser déterminer immédiatement tes paroles.

Quand tu as pris un engagement, tu arrives à faire ce qui est nécessaire, même lorsque tu préférerais consacrer ton temps à autre chose.

Et lorsque tu traverses une période d'inquiétude, tu cherches à éviter les décisions précipitées.

Cela révèle une capacité précieuse : tu ne te laisses pas systématiquement diriger par ce que tu ressens sur le moment.

Tu sembles comprendre qu'une émotion peut être réelle et importante sans devoir décider de ton comportement.

Cette capacité peut t'aider dans tes relations, tes responsabilités et ta vie spirituelle.

Mais il existe aussi un point de vigilance.

À force de vouloir garder le contrôle, tu peux parfois avoir tendance à cacher tes émotions, à refuser de demander de l'aide ou à te montrer trop exigeant envers toi-même.

La maîtrise de soi ne consiste pas à devenir insensible.`,
        growth: `Dans 1 Corinthiens 9:24-27, Paul compare la vie chrétienne à celle d'un athlète qui s'entraîne pour atteindre son objectif.

Un sportif ne progresse pas uniquement parce qu'il est motivé le jour de la compétition.

Il développe des habitudes, apprend à persévérer et accepte de renoncer à certaines satisfactions immédiates pour poursuivre un objectif plus important.

Paul utilise cette image pour parler de la discipline nécessaire à la vie chrétienne.

Cela nous rappelle que la maîtrise de soi se développe aussi dans les petites décisions du quotidien.

Tu sembles déjà capable de faire des choix réfléchis lorsque tes émotions ou tes envies te poussent dans une autre direction.

Pour continuer à grandir, demande-toi dans quels domaines cette capacité pourrait encore être mise au service de Dieu et des autres.

Peut-être dans la manière dont tu gères ton temps, tes paroles, tes habitudes ou tes responsabilités.

Mais rappelle-toi que la maîtrise de soi n'est pas simplement une performance personnelle.

Le but n'est pas de devenir une personne qui contrôle parfaitement tout, mais une personne de plus en plus libre de choisir ce qui est bon.`,
        challengeTitle: "Utilise ta liberté pour faire le bien.",
        challenge: `Cette semaine, choisis une habitude que tu souhaites développer dans ta vie spirituelle ou relationnelle.

Par exemple, prendre un temps de prière, écouter davantage un proche ou consacrer du temps à une responsabilité importante.

Fixe un moment précis pour cette habitude et respecte-le pendant sept jours, même lorsque tu n'en as pas particulièrement envie.`,
        reflection: "Est-ce que j'utilise ma capacité à me discipliner uniquement pour atteindre mes objectifs, ou est-ce que je la mets aussi au service de Dieu et des autres ?",
      },
      develop: {
        discovery: `Tu sais généralement ce que tu devrais faire, mais il peut parfois être difficile de le mettre en pratique lorsque tes émotions ou tes envies prennent le dessus.

Lorsque tu es fatigué ou débordé, tu peux réagir plus rapidement que tu ne l'aurais souhaité.

Quand une tâche demande un effort important, tu peux être tenté de la repousser pour faire quelque chose de plus agréable.

Et lorsque tu es inquiet, tu peux ressentir le besoin de prendre une décision rapidement, simplement pour ne plus rester dans l'incertitude.

Peut-être qu'il t'arrive de regretter certaines réactions après coup.

Tu te dis alors :

« Je n'aurais pas dû répondre comme ça. »

« J'aurais dû prendre le temps de réfléchir. »

« Je savais ce que je devais faire, mais je ne l'ai pas fait. »

Cela révèle une difficulté que nous pouvons tous rencontrer : savoir ce qui est bon ne signifie pas toujours réussir à le choisir sur le moment.

La maîtrise de soi nous aide à réduire progressivement cet écart entre nos convictions et nos comportements.`,
        growth: `Dans Jacques 1:19-20, nous lisons :

« Que chacun soit prompt à écouter, lent à parler, lent à se mettre en colère. »

Ce passage nous donne un principe très concret.

Lorsque nous sommes contrariés, nous avons souvent envie de réagir immédiatement.

Nous voulons nous défendre, répondre, expliquer ou régler la situation au plus vite.

Mais une réaction rapide n'est pas toujours une réaction juste.

Jacques nous encourage à ralentir.

Cela ne signifie pas qu'il faut ignorer sa colère ou éviter les conversations difficiles.

Cela signifie qu'il est parfois nécessaire de créer un espace entre ce que nous ressentons et ce que nous décidons de faire.

Imagine que quelqu'un te parle sèchement.

Ton premier réflexe peut être de répondre sur le même ton.

Mais tu peux aussi prendre quelques secondes, reconnaître ton agacement et choisir de répondre autrement.

Tu ne choisis pas toujours ce que tu ressens, mais tu peux apprendre à choisir ce que tu fais ensuite.

La maîtrise de soi grandit dans ces petits moments.

Et plus tu prends l'habitude de réfléchir avant d'agir, plus il devient facile de ne pas laisser tes réactions immédiates diriger tes décisions.`,
        challengeTitle: "Apprends à faire une pause avant d'agir.",
        challenge: `Pendant sept jours, choisis une situation dans laquelle tu as tendance à réagir trop rapidement.

Cela peut être lorsque tu es contrarié, pressé, inquiet ou tenté de repousser une responsabilité.

Lorsque cette situation se présente :
1. Arrête-toi quelques secondes.
2. Identifie ce que tu ressens ou ce dont tu as envie.
3. Demande-toi : « Quelle serait la meilleure manière d'agir maintenant ? »
4. Choisis une réponse qui correspond à tes convictions plutôt qu'à ton impulsion immédiate.`,
        reflection: "Dans quelles situations est-ce que mes émotions ou mes envies prennent le plus facilement le dessus sur mes décisions ?",
      },
      discover: {
        discovery: `Tes réponses suggèrent qu'il peut être difficile pour toi de résister à certaines réactions ou envies immédiates.

Lorsque tu es contrarié, tu peux avoir tendance à dire ce que tu penses sans toujours mesurer les conséquences de tes paroles.

Quand une responsabilité devient fatigante ou contraignante, tu peux préférer la repousser.

Et lorsque tu traverses une période d'inquiétude, tu peux prendre des décisions rapidement pour retrouver le sentiment de contrôler la situation.

Cela ne signifie pas que tu manques de volonté ou que tu es incapable de changer.

Mais cela peut révéler que tes émotions et tes envies occupent parfois une place trop importante dans tes décisions.

Nous avons tous des désirs qui ne correspondent pas nécessairement à ce qui est bon pour nous.

Nous pouvons avoir envie de répondre durement à quelqu'un, de céder à une tentation ou d'abandonner un effort.

La maîtrise de soi nous apprend à reconnaître ces envies sans être obligés de leur obéir.`,
        growth: `Dans Matthieu 4:1-11, Jésus est tenté dans le désert.

Après avoir jeûné pendant quarante jours, il a faim.

Le diable lui propose alors de transformer des pierres en pains.

Jésus ressent un besoin réel : il a faim.

Mais il refuse de répondre à ce besoin en cédant à la tentation.

Plus loin, il est également tenté de rechercher le pouvoir et la gloire par des chemins contraires à la volonté de Dieu.

À chaque fois, Jésus choisit de rester fidèle à son Père.

Ce récit nous enseigne quelque chose d'essentiel : ressentir un désir ne signifie pas que nous devons automatiquement le satisfaire.

La maîtrise de soi commence lorsque nous apprenons à faire cette distinction.

Tu peux ressentir de la colère sans devoir prononcer toutes les paroles qui te viennent à l'esprit.

Tu peux avoir envie d'abandonner une responsabilité sans être obligé de le faire.

Tu peux être tenté de choisir une satisfaction immédiate tout en décidant de poursuivre ce qui est réellement important pour toi.

Mais tu n'as pas besoin d'essayer de tout changer en même temps.

Commence par identifier une situation dans laquelle tu as régulièrement du mal à maîtriser ta réaction.

Puis prépare une autre manière d'agir avant même que cette situation se présente.

Par exemple, si tu sais que tu réponds durement lorsque tu es fatigué, prends l'habitude de reporter certaines conversations.

Si tu repousses souvent tes responsabilités, commence par consacrer dix minutes à la tâche avant de faire autre chose.

Et si tu prends des décisions précipitées lorsque tu es inquiet, donne-toi un temps de réflexion avant de choisir.

La maîtrise de soi ne grandit pas uniquement lorsque nous résistons à une tentation. Elle grandit aussi lorsque nous préparons des habitudes qui nous aident à faire de meilleurs choix.`,
        challengeTitle: "Apprends à choisir plutôt qu'à réagir.",
        challenge: `Cette semaine, identifie une habitude ou une réaction que tu souhaites changer.

Choisis une seule situation précise.

Par exemple :
- Répondre sèchement lorsque tu es contrarié.
- Repousser une responsabilité importante.
- Prendre une décision sous le coup de l'inquiétude.
- Céder trop rapidement à une envie que tu regrettes ensuite.
Prépare une réponse différente à l'avance.

Chaque fois que cette situation se présente, essaie de mettre en pratique cette nouvelle réponse.

Si tu n'y arrives pas, ne considère pas que tout est perdu. Cherche à comprendre ce qui t'a mis en difficulté et recommence.`,
        reflection: "Est-ce que je prends le temps de choisir mes actions, ou est-ce que je laisse souvent mes émotions et mes envies décider à ma place ?",
      },
    },
  },
];

export const fruitSpiritRestitutionByKeyV2 = Object.fromEntries(
  fruitSpiritRestitutionsV2.map((fruit) => [fruit.key, fruit]),
) as Record<FruitSpiritKey, FruitSpiritRestitution>;
