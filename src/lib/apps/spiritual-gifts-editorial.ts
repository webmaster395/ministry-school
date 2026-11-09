export type SpiritualGiftEditorialPath = "grounded" | "unverified" | "emerging" | "quiet";

export type SpiritualGiftEditorial = {
  impactTitle: string;
  impact: string;
  interpretation: string;
  growth: string;
  challengeTitle: string;
  challenge: string;
};

type GiftEditorialLibrary = {
  impactTitle: string;
  impact: string;
  paths: Record<SpiritualGiftEditorialPath, Omit<SpiritualGiftEditorial, "impactTitle" | "impact">>;
};

const library: Record<string, GiftEditorialLibrary> = {
  discernement: {
    impactTitle: "Aider les autres à reconnaître ce qui les influence spirituellement.",
    impact: "Le discernement des esprits peut aider une personne ou une communauté à distinguer ce qui vient de Dieu, ce qui vient de l’être humain et ce qui cherche à détourner ou à troubler. Il protège sans nourrir la peur et conduit à rechercher la vérité avec paix.",
    paths: {
      grounded: {
        interpretation: "Tu sembles reconnaître certaines influences spirituelles et prendre du recul devant un message présenté comme venant de Dieu. Le fait que tes perceptions trouvent parfois une confirmation t’invite à approfondir ce discernement, tout en restant prudent : une impression juste ne rend pas toutes tes conclusions infaillibles.",
        growth: "Apprends à examiner ce que tu perçois avec trois repères : le caractère de Jésus, les Écritures et les fruits produits dans la situation. Partage tes conclusions avec des responsables mûrs avant d’alerter quelqu’un, surtout lorsque ton discernement concerne une influence négative.",
        challengeTitle: "Éprouve une perception avant de la nommer.",
        challenge: "Cette semaine, note une perception spirituelle sans l’annoncer comme une certitude. Écris les faits observables, les passages bibliques qui t’éclairent et ce qui pourrait aussi relever de ton ressenti. Présente ensuite cette note à un responsable mature et demande-lui ce qu’il discerne.",
      },
      unverified: {
        interpretation: "Tu sembles sensible à l’atmosphère spirituelle d’une situation et tu peux avoir rapidement une conviction sur l’origine d’un message. Comme ces perceptions ne trouvent pas encore souvent de confirmation, l’enjeu principal n’est pas de les affirmer davantage, mais d’apprendre à les vérifier avec patience.",
        growth: "Distingue ce que tu ressens, ce que tu observes et ce que tu conclus. Cette séparation t’aidera à ne pas attribuer trop vite une difficulté à une cause spirituelle et à accueillir d’autres explications possibles.",
        challengeTitle: "Sépare perception, faits et conclusion.",
        challenge: "Pour une situation qui t’interpelle, trace trois colonnes : « ce que je ressens », « ce que je sais » et « ce que je suppose ». Prie, relis ta note le lendemain, puis demande l’avis d’un chrétien mature avant d’en parler à la personne concernée.",
      },
      emerging: {
        interpretation: "Certains signes de discernement apparaissent dans ce que tu vis, mais ils ne forment pas encore un repère régulier. Tu peux parfois percevoir une influence ou questionner l’origine d’un message sans savoir clairement comment l’évaluer.",
        growth: "Développe d’abord une connaissance solide des Écritures et observe les fruits d’un message : conduit-il vers la vérité, l’amour, la liberté et la responsabilité ? Le discernement grandit moins par des conclusions rapides que par une attention fidèle à Dieu et aux faits.",
        challengeTitle: "Examine un message avec des repères simples.",
        challenge: "Choisis un message spirituel entendu cette semaine. Relève ce qu’il affirme, vérifie son accord avec la Bible et observe le fruit qu’il cherche à produire. Discute de ton analyse avec une personne mature sans chercher à avoir raison.",
      },
      quiet: {
        interpretation: "Le discernement des esprits ne semble pas être une expérience très présente pour toi aujourd’hui. Tu n’as pas besoin de provoquer des perceptions spirituelles ni de te comparer à ceux qui en parlent davantage.",
        growth: "Continue à construire ton discernement chrétien par la prière, la Bible et la vie communautaire. Si une perception inhabituelle survient un jour, tu pourras l’accueillir calmement et la soumettre à des personnes mûres.",
        challengeTitle: "Fortifie tes repères plutôt que de chercher une expérience.",
        challenge: "Demande à un responsable de te montrer comment il évalue un message présenté comme spirituel. Note les deux ou trois repères bibliques qu’il utilise et applique-les à un enseignement que vous connaissez tous les deux.",
      },
    },
  },
  connaissance: {
    impactTitle: "Éclairer une personne par une information que tu ne pouvais pas connaître seul.",
    impact: "La parole de connaissance peut mettre en lumière un élément précis d’une situation afin d’aider, d’encourager ou d’orienter une personne. Elle ne sert pas à impressionner ni à dévoiler la vie d’autrui, mais à manifester l’attention de Dieu avec amour et discrétion.",
    paths: {
      grounded: {
        interpretation: "Tu reconnais des moments où une information précise t’est venue sans explication naturelle, notamment dans la prière, un rêve ou une vision. Certaines de ces informations ont aussi été reconnues comme justes par les personnes concernées. Ces expériences méritent d’être approfondies avec humilité plutôt que transformées trop vite en certitude sur ton don.",
        growth: "Apprends à noter exactement ce que tu reçois avant de l’interpréter. Vérifie ce qui peut l’être, accepte de te tromper et demande à une personne mature de t’aider à choisir quand parler, comment parler et quand garder une impression pour la prière.",
        challengeTitle: "Construis un journal de discernement.",
        challenge: "Pendant sept jours, note chaque information précise qui te vient dans la prière, avec la date et les mots exacts. N’ajoute aucune interprétation. Lorsque cela peut se faire sans pression, vérifie les faits, puis relis ton journal avec un chrétien mature.",
      },
      unverified: {
        interpretation: "Tu sembles recevoir des impressions ou des informations dans la prière, les rêves ou les visions. Comme elles sont encore peu confirmées par les personnes ou les faits, elles constituent surtout une invitation à apprendre à distinguer une pensée personnelle d’une connaissance réellement donnée pour aider quelqu’un.",
        growth: "Ne partage pas chaque impression. Commence par la noter, laisse passer du temps et recherche une confirmation indépendante. Lorsque tu en parles, utilise des mots qui laissent l’autre libre : « J’ai eu cette pensée, mais je peux me tromper. »",
        challengeTitle: "Vérifie avant d’interpréter.",
        challenge: "Choisis une seule impression reçue cette semaine. Écris-la mot pour mot, cherche ce qui pourrait l’expliquer naturellement et demande à un accompagnateur mature de l’examiner avec toi. Ne la partage à la personne concernée que si cela peut réellement l’aider et sans l’imposer.",
      },
      emerging: {
        interpretation: "Tu rapportes quelques expériences qui peuvent évoquer une parole de connaissance, mais elles restent occasionnelles ou difficiles à reconnaître. Il est possible que tu sois en train d’apprendre à remarquer ce qui se passe dans la prière sans encore savoir comment le comprendre.",
        growth: "Accorde plus d’importance à la précision et au fruit qu’au caractère spectaculaire d’une impression. Une parole utile respecte la personne, ne la contrôle pas et peut être examinée sereinement.",
        challengeTitle: "Observe une impression avec précision.",
        challenge: "Lors d’un prochain temps de prière, note une éventuelle information concrète sans chercher à en produire une. Relis-la vingt-quatre heures plus tard, puis montre-la à un chrétien mature en lui demandant ce qui lui paraît prudent et utile.",
      },
      quiet: {
        interpretation: "La parole de connaissance ne ressort pas particulièrement de tes expériences actuelles. Cela ne dit rien de ta valeur spirituelle et ne ferme pas la possibilité que Dieu t’utilise un jour de cette manière.",
        growth: "Concentre-toi sur les dons qui se manifestent déjà plus clairement. Tu peux découvrir celui-ci en observant comment des personnes mûres l’exercent avec précision, discrétion et respect.",
        challengeTitle: "Découvre ce don sans chercher à le provoquer.",
        challenge: "Échange avec une personne reconnue pour exercer ce don avec équilibre. Demande-lui de raconter une expérience confirmée, une erreur qu’elle a dû reconnaître et les règles qu’elle suit pour protéger les personnes.",
      },
    },
  },
  foi: {
    impactTitle: "Communiquer une confiance particulière lorsque tout paraît impossible.",
    impact: "Le don de foi peut donner une assurance inhabituelle dans une situation précise. Cette confiance aide les autres à persévérer, à obéir à Dieu et à ne pas laisser la peur décider, sans nier les réalités ni promettre un résultat que Dieu n’a pas garanti.",
    paths: {
      grounded: {
        interpretation: "Tu sembles connaître des moments où une conviction profonde te conduit à agir avec assurance, et tu as déjà vu certaines situations évoluer dans le sens attendu. Cela peut encourager les autres, à condition de rester attaché à Dieu plutôt qu’au besoin de prouver que ta conviction était juste.",
        growth: "Continue à soumettre tes convictions aux Écritures et à la sagesse de la communauté. Une foi mûre sait poser un acte courageux tout en respectant les personnes, les délais et les conséquences concrètes.",
        challengeTitle: "Transforme une conviction en obéissance réfléchie.",
        challenge: "Choisis une situation pour laquelle tu portes une conviction claire. Écris la promesse biblique qui la soutient, présente-la à une personne mature, puis pose cette semaine une action mesurable qui ne mette personne en danger et ne force pas le résultat.",
      },
      unverified: {
        interpretation: "Tu peux ressentir une forte certitude que Dieu va intervenir et cette conviction peut te pousser à agir. Comme les événements ne viennent pas encore souvent confirmer ce que tu avais compris, tu es invité à discerner la différence entre la foi, l’espérance et ton propre désir de voir une issue particulière.",
        growth: "Garde une trace de tes convictions et formule-les avec humilité. Ne fais pas porter aux autres le poids de ta certitude et évite les décisions irréversibles sans confirmation, conseil et paix durable.",
        challengeTitle: "Éprouve une conviction dans le temps.",
        challenge: "Note une conviction actuelle, ce qui la fonde et l’action qu’elle t’inspire. Attends quarante-huit heures, prie à nouveau et présente-la à deux personnes sages. Ajuste ton action selon leurs questions avant de t’engager.",
      },
      emerging: {
        interpretation: "Tu sembles parfois recevoir une confiance particulière face à une situation difficile, mais cette assurance ne conduit pas encore toujours à une action claire ou à une confirmation observable. Ce don peut être en train de se développer dans ta manière de prier et de persévérer.",
        growth: "Commence par de petits actes d’obéissance plutôt que par de grandes déclarations. Observe si ta conviction produit la paix, le courage et une fidélité concrète, ou seulement de la précipitation.",
        challengeTitle: "Pose un acte de foi proportionné.",
        challenge: "Identifie une situation bloquée. Après en avoir parlé avec une personne de confiance, choisis une action simple que tu peux accomplir cette semaine : demander pardon, faire une démarche, offrir ton aide ou persévérer dans une prière précise.",
      },
      quiet: {
        interpretation: "Tu ne reconnais pas souvent cette assurance particulière face à l’impossible. Ta foi peut pourtant s’exprimer autrement, dans la fidélité quotidienne, la confiance progressive ou l’obéissance sans émotion forte.",
        growth: "Ne cherche pas à fabriquer une certitude. Nourris ta confiance en te souvenant de la fidélité de Dieu et en avançant dans les dons qui ressortent davantage chez toi.",
        challengeTitle: "Ancre ta foi dans la fidélité de Dieu.",
        challenge: "Choisis une difficulté actuelle et relève trois manières concrètes dont Dieu t’a déjà soutenu dans le passé. Partage-les avec une personne de confiance, puis définis une petite étape d’obéissance pour cette semaine.",
      },
    },
  },
  guerison: {
    impactTitle: "Porter avec compassion les personnes malades et prier pour leur guérison.",
    impact: "Le don de guérison peut permettre à une personne souffrante de recevoir une amélioration ou une guérison par l’action de Dieu. Il s’exerce avec compassion, consentement et humilité, sans culpabiliser le malade ni remplacer l’accompagnement médical.",
    paths: {
      grounded: {
        interpretation: "Tu sembles prier volontiers pour les personnes malades et tu as déjà observé des améliorations après certaines prières. Ces expériences peuvent t’encourager à continuer, sans conclure que chaque amélioration prouve à elle seule l’exercice d’un don ou que chaque personne sera guérie.",
        growth: "Apprends à prier simplement, à demander le consentement et à vérifier les évolutions sans les exagérer. Entoure-toi de responsables qui savent accueillir à la fois les guérisons, les progrès partiels et les situations où rien ne change.",
        challengeTitle: "Prie, accompagne et vérifie avec justesse.",
        challenge: "Avec son accord, prie cette semaine pour une personne malade. Note seulement ce qu’elle te dit avant la prière. Reprends ensuite de ses nouvelles et consigne ses propres mots, sans interpréter à sa place ni lui demander d’arrêter un traitement.",
      },
      unverified: {
        interpretation: "Tu as le réflexe de prier pour les malades ou tu peux recevoir une conviction de guérison pendant la prière. Comme tu observes encore peu d’améliorations vérifiables, ta compassion et ta foi sont réelles, mais elles ne suffisent pas à conclure qu’une guérison a eu lieu.",
        growth: "Continue à prier sans annoncer trop vite un résultat. Laisse la personne décrire elle-même son état, respecte le suivi médical et apprends à accompagner aussi lorsque la souffrance demeure.",
        challengeTitle: "Distingue conviction et observation.",
        challenge: "Lors d’une prochaine prière, demande d’abord à la personne ce qu’elle ressent précisément. Prie sans promesse, puis demande-lui ce qui a réellement changé. Note ses mots exacts et échange avec un responsable sur la manière d’en parler avec honnêteté.",
      },
      emerging: {
        interpretation: "Tu sembles ouvert à prier pour les malades et quelques éléments peuvent t’encourager à explorer ce don. Cette pratique reste cependant occasionnelle ou encore difficile à évaluer.",
        growth: "Développe d’abord une présence fidèle auprès des personnes souffrantes. La prière pour la guérison gagne en maturité lorsqu’elle s’accompagne d’écoute, d’aide concrète et du respect de la liberté de chacun.",
        challengeTitle: "Associe la prière à une aide concrète.",
        challenge: "Propose à une personne malade de prier pour elle, avec son accord, puis demande-lui quelle aide concrète lui serait utile cette semaine. Recontacte-la à la date convenue et écoute son évolution sans orienter sa réponse.",
      },
      quiet: {
        interpretation: "La prière pour la guérison et l’observation d’améliorations ne semblent pas très présentes dans ton expérience actuelle. Tu n’as pas à te sentir moins spirituel ni à rechercher une manifestation pour remplir une attente.",
        growth: "Tu peux continuer à aimer et soutenir les personnes malades par la présence, l’intercession et le service. Si tu souhaites découvrir ce don, fais-le dans un cadre d’Église sûr et accompagné.",
        challengeTitle: "Apprends à accompagner une personne souffrante.",
        challenge: "Demande à une personne malade si elle souhaite une prière ou une aide concrète. Respecte sa réponse, accomplis l’aide convenue et demande à un responsable comment l’Église encadre la prière pour la guérison.",
      },
    },
  },
  miracles: {
    impactTitle: "Ouvrir un chemin lorsque les possibilités humaines semblent épuisées.",
    impact: "Le don d’opérer des miracles manifeste la puissance de Dieu dans une situation qui dépasse les moyens ordinaires. Il tourne les regards vers Dieu et sert les personnes ; il ne cherche ni le spectaculaire, ni la réputation de celui qui prie.",
    paths: {
      grounded: {
        interpretation: "Tu sembles prier avec confiance dans des situations sans issue, et tu rapportes des événements que tu considères comme des interventions extraordinaires de Dieu. Le fait que d’autres te sollicitent peut aussi montrer qu’ils reconnaissent ta persévérance dans la prière. Ces éléments demandent encore d’être racontés avec précision et humilité.",
        growth: "Apprends à distinguer ce qui est objectivement arrivé de l’interprétation que tu en donnes. Cherche toujours le bien de la personne, accepte les vérifications et refuse de mettre en scène une intervention de Dieu.",
        challengeTitle: "Raconte une intervention avec vérité.",
        challenge: "Choisis une expérience que tu considères comme un miracle. Écris les faits avant, pendant et après, sans amplifier ce que tu ignores. Fais relire ce récit par une personne présente ou un responsable avant de le partager comme témoignage.",
      },
      unverified: {
        interpretation: "Tu as volontiers le réflexe de prier pour un miracle, mais tu rapportes encore peu d’événements précis ou de sollicitations extérieures qui permettraient d’évaluer cette pratique. Ton attente de Dieu peut être précieuse sans devenir une obligation de produire un résultat spectaculaire.",
        growth: "Persévère dans la prière tout en restant disponible aux réponses ordinaires : une aide, une décision sage, un délai ou une porte qui s’ouvre. Ne transforme pas ton désir de miracle en promesse faite aux autres.",
        challengeTitle: "Prie sans imposer la forme de la réponse.",
        challenge: "Choisis une situation difficile et prie avec une personne de confiance. Écrivez ensemble ce que vous demandez, mais aussi les démarches concrètes possibles. Dans une semaine, relevez uniquement les faits observés et remerciez Dieu sans exagération.",
      },
      emerging: {
        interpretation: "Certains éléments peuvent t’inviter à explorer la prière pour les situations impossibles, mais ils restent ponctuels. Tu peux avancer sans chercher à reproduire une expérience ni à porter seul le poids de l’issue.",
        growth: "Prie en équipe et laisse des responsables t’aider à discerner ce qui se passe. La maturité se voit aussi dans ta capacité à rester fidèle lorsque la réponse n’est pas celle que tu espérais.",
        challengeTitle: "Porte une situation en équipe.",
        challenge: "Présente une situation difficile à deux chrétiens de confiance. Priez ensemble, définissez une démarche concrète et convenez d’une date pour faire le point sur les faits, les besoins de la personne et la suite de l’accompagnement.",
      },
      quiet: {
        interpretation: "Les interventions que tu considérerais comme miraculeuses ne semblent pas fréquentes dans ton parcours actuel. Cela ne limite pas la puissance de Dieu et ne diminue pas les autres façons dont il peut agir à travers toi.",
        growth: "Concentre-toi sur les dons qui apparaissent plus clairement et demeure ouvert à prier lorsque la situation dépasse tes moyens. Tu peux apprendre sans rechercher le spectaculaire.",
        challengeTitle: "Découvre une pratique équilibrée de la prière.",
        challenge: "Demande à un responsable de te raconter comment il accompagne une demande de miracle, y compris lorsque rien ne change. Note les précautions qu’il prend pour protéger l’espérance et la personne concernée.",
      },
    },
  },
  prophetie: {
    impactTitle: "Transmettre une parole qui édifie, encourage, console ou avertit avec amour.",
    impact: "Le don de prophétie peut rendre actuel un message que Dieu veut adresser à une personne ou à une communauté. Une parole prophétique saine conduit vers Dieu, respecte la liberté de l’autre et peut être examinée ; elle ne sert jamais à contrôler une décision.",
    paths: {
      grounded: {
        interpretation: "Tu sembles recevoir et transmettre des paroles précises, et certaines personnes t’ont dit qu’elles avaient été encouragées, consolées ou interpellées. Ces retours peuvent t’inviter à approfondir ce don, tout en te rappelant que l’utilité d’une parole ne prouve pas que chacune de tes impressions vient de Dieu.",
        growth: "Continue à confronter tes paroles aux Écritures et à les soumettre à des responsables. Apprends à partager avec simplicité, sans dramatiser, et à accueillir paisiblement une correction ou l’absence de confirmation.",
        challengeTitle: "Partage une parole qui laisse l’autre libre.",
        challenge: "Si une parole d’encouragement précise te vient cette semaine, écris-la et fais-la relire par un responsable. Partage-la ensuite comme une impression, sans donner d’ordre. Demande plus tard à la personne ce qui lui a été utile.",
      },
      unverified: {
        interpretation: "Tu peux ressentir que Dieu te donne un message ou te pousse à avertir quelqu’un. Comme les retours des personnes restent encore rares, tu es surtout invité à apprendre comment vérifier ce que tu reçois et comment le transmettre sans pression.",
        growth: "Avant de parler, demande-toi si la parole est biblique, compréhensible, utile et donnée dans l’amour. Pour les avertissements et les décisions importantes, ne reste jamais seul avec ton interprétation.",
        challengeTitle: "Fais relire avant de transmettre.",
        challenge: "Note une parole que tu penses avoir reçue. Présente-la à un responsable sans lui expliquer d’abord ton interprétation et demande-lui ce qui paraît biblique, utile ou imprudent. Réécris-la ensuite dans un langage qui respecte la liberté de la personne.",
      },
      emerging: {
        interpretation: "Tu reconnais parfois un élan pour encourager, avertir ou transmettre un message, mais cette expérience reste occasionnelle ou peu confirmée. Tu peux apprendre à discerner sans te mettre la pression de devoir parler.",
        growth: "Commence par les paroles qui édifient et consolent, dans un cadre où elles peuvent être évaluées. La clarté, l’amour et l’humilité comptent davantage qu’un ton impressionnant.",
        challengeTitle: "Exerce-toi à encourager avec précision.",
        challenge: "Pendant un temps de prière, demande à Dieu une parole biblique d’encouragement pour une personne. Note-la, vérifie son sens dans le passage, puis partage-la simplement sans affirmer qu’elle vient nécessairement de Dieu.",
      },
      quiet: {
        interpretation: "La réception et la transmission de messages précis ne semblent pas très présentes dans ton expérience actuelle. Tu peux servir profondément les autres sans devoir exercer ce don.",
        growth: "Reste attentif à la manière dont la Bible peut t’aider à encourager une personne concrètement. Si ce don se manifeste un jour, avance dans un cadre où les paroles sont accueillies et examinées avec maturité.",
        challengeTitle: "Encourage à partir d’un texte biblique.",
        challenge: "Choisis une personne à encourager et un passage biblique adapté à sa situation. Explique-lui simplement pourquoi ce texte t’a fait penser à elle, sans ajouter de message que tu ne peux pas vérifier.",
      },
    },
  },
  sagesse: {
    impactTitle: "Aider une personne à discerner une décision juste dans une situation complexe.",
    impact: "La parole de sagesse peut apporter une compréhension et une direction adaptées lorsqu’une personne ne sait plus comment avancer. Elle relie la vérité biblique, la réalité concrète et les conséquences d’un choix, sans décider à la place de l’autre.",
    paths: {
      grounded: {
        interpretation: "Les autres semblent naturellement rechercher tes conseils, et tu reconnais des moments où une compréhension particulière t’aide à proposer une direction juste. Les retours reçus indiquent aussi que tes conseils ont parfois produit un effet concret. Ces éléments t’invitent à servir avec confiance sans te croire responsable de toutes les décisions.",
        growth: "Continue à écouter avant de répondre. Vérifie que ton conseil tient compte de la Bible, du contexte réel et de la liberté de la personne. Une parole sage n’a pas besoin d’être longue ni de rendre l’autre dépendant de toi.",
        challengeTitle: "Accompagne une décision sans la prendre.",
        challenge: "Lorsqu’une personne te demande conseil cette semaine, pose-lui d’abord trois questions sur sa situation. Résume ce que tu as compris, propose un principe biblique et deux conséquences possibles, puis laisse-la formuler elle-même sa prochaine étape.",
      },
      unverified: {
        interpretation: "Tu peux avoir rapidement une compréhension ou une solution lorsqu’une situation est compliquée. Comme les autres te sollicitent ou confirment encore peu l’utilité de tes conseils, l’enjeu est d’apprendre à écouter davantage et à vérifier si ta réponse correspond vraiment à leur besoin.",
        growth: "Résiste à l’envie de résoudre trop vite. Demande à la personne ce qu’elle a déjà compris, ce qu’elle redoute et ce qu’elle attend de toi. Ton conseil gagnera en justesse s’il naît d’une écoute réelle.",
        challengeTitle: "Écoute avant de proposer une solution.",
        challenge: "Dans ta prochaine conversation, pose au moins trois questions avant de donner ton avis. Demande ensuite à la personne de reformuler ce qu’elle retient et si ton conseil répond réellement à sa situation.",
      },
      emerging: {
        interpretation: "Certains signes montrent que tu peux apporter un regard utile dans des situations complexes, mais cette capacité reste occasionnelle ou encore peu reconnue par les autres. Elle peut grandir à mesure que tu apprends à unir écoute, Bible et compréhension du contexte.",
        growth: "Observe comment des personnes sages accompagnent une décision sans imposer leur préférence. Travaille aussi ta capacité à présenter plusieurs options plutôt qu’une réponse unique.",
        challengeTitle: "Transforme un avis en accompagnement.",
        challenge: "Choisis une situation simple qu’un proche accepte de partager. Écoute-la, identifie le principe biblique concerné et présente deux chemins possibles avec leurs conséquences. Demande-lui ce qui l’aide réellement à décider.",
      },
      quiet: {
        interpretation: "Le fait d’être sollicité pour des conseils ou de recevoir une compréhension particulière ne ressort pas fortement de ton expérience actuelle. Cela ne signifie pas que tu manques de sagesse ni que tu ne peux pas la développer.",
        growth: "Appuie-toi sur les dons qui se manifestent déjà et continue à apprendre auprès de personnes reconnues pour leur écoute et leur discernement. La sagesse grandit aussi par l’expérience et l’humilité.",
        challengeTitle: "Observe comment naît un conseil juste.",
        challenge: "Demande à une personne sage de t’expliquer une décision difficile qu’elle a accompagnée. Note les questions qu’elle a posées, les principes bibliques utilisés et ce qu’elle a volontairement laissé à la responsabilité de l’autre.",
      },
    },
  },
};

export function getSpiritualGiftEditorial(giftId: string, path: SpiritualGiftEditorialPath): SpiritualGiftEditorial {
  const gift = library[giftId];
  if (!gift) throw new Error(`Contenu éditorial introuvable pour le don ${giftId}`);
  return { impactTitle: gift.impactTitle, impact: gift.impact, ...gift.paths[path] };
}

