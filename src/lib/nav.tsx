import {
  BookOpen,
  CalendarClock,
  CalendarDays,
  Church,
  CircleUser,
  Compass,
  FileText,
  HandHeart,
  HelpCircle,
  House,
  LayoutDashboard,
  Lightbulb,
  Rocket,
  Megaphone,
  MessageSquare,
  Presentation,
  Briefcase,
  NotebookPen,
  ChartNoAxesColumnIncreasing,
  BadgeCheck,
  PanelsTopLeft,
  UserRound,
  ListChecks,
  FolderOpen,
  UsersRound,
  GraduationCap,
} from "lucide-react";
import { isPlainStudent, type ViewerRoles } from "@/lib/roles";
import { QUESTIONS_ENABLED } from "@/lib/questions";

export type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  target?: "_blank";
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

const iconProps = { size: 20, strokeWidth: 1.6 } as const;

/** Une icône différente par entrée du menu : aucune ne se répète, même pour un compte qui cumule les rôles. */
const icons = {
  home: <House {...iconProps} />,
  calendar: <CalendarDays {...iconProps} />,
  book: <BookOpen {...iconProps} />,
  task: <FileText {...iconProps} />,
  notes: <NotebookPen {...iconProps} />,
  ministries: <Church {...iconProps} />,
  services: <HandHeart {...iconProps} />,
  messages: <MessageSquare {...iconProps} />,
  profile: <CircleUser {...iconProps} />,
  help: <HelpCircle {...iconProps} />,
  prep: <Presentation {...iconProps} />,
  announce: <Megaphone {...iconProps} />,
  steer: <Compass {...iconProps} />,
  propose: <Lightbulb {...iconProps} />,
  projectPropose: <Rocket {...iconProps} />,
  adminHome: <LayoutDashboard {...iconProps} />,
  adminStats: <ChartNoAxesColumnIncreasing {...iconProps} />,
  adminSessions: <CalendarClock {...iconProps} />,
  functions: <Briefcase {...iconProps} />,
  validate: <BadgeCheck {...iconProps} />,
  apps: <PanelsTopLeft {...iconProps} />,
  identity: <UserRound {...iconProps} />,
  resources: <FolderOpen {...iconProps} />,
  studentTasks: <ListChecks {...iconProps} />,
  studentProjects: <UsersRound {...iconProps} />,
  formations: <GraduationCap {...iconProps} />,
};

/** Le menu étudiant, toujours affiché : celui de la maquette de Rose Alice. */
export const studentSections: NavSection[] = [
  {
    title: "Principal",
    items: [
      { label: "Accueil", href: "/etudiant", icon: icons.home },
    ],
  },
  {
    title: "Qui je suis",
    items: [
      { label: "Ma personnalité", href: "/etudiant/identite", icon: icons.identity },
      { label: "Ministère", href: "/etudiant/formation", icon: icons.steer },
    ],
  },
  {
    title: "Mon parcours",
    items: [
      { label: "Mes cours", href: "/etudiant/cours", icon: icons.book },
      { label: "Travail à faire", href: "/etudiant/travail", icon: icons.studentTasks },
      { label: "Mes ressources", href: "/etudiant/ressources", icon: icons.resources },
      { label: "Projets et formations", href: "/etudiant/services", icon: icons.studentProjects },
    ],
  },
];

export const notesNavItem: NavItem = {
  label: "Mes notes",
  href: "/etudiant/notes",
  icon: icons.notes,
};

/** Icône générique conservée pour les anciens appels qui représentent une fonction de gestion. */
export const functionsIcon = icons.functions;

export const validationNavItem: NavItem = {
  label: "À valider",
  href: "/gestion/a-valider",
  icon: icons.validate,
};

export type ProfileTab = { label: string; href: string };

/**
 * Les onglets de l'espace Profil. La messagerie et les notifications sont désactivées.
 */
export function profileTabs(roles: ViewerRoles): ProfileTab[] {
  const tabs: ProfileTab[] = [
    { label: "Profil", href: "/etudiant/profil" },
    { label: "Préférences", href: "/etudiant/preferences" },
  ];
  if (QUESTIONS_ENABLED && isPlainStudent(roles))
    tabs.push({ label: "Une question ?", href: "/etudiant/aide" });
  return tabs;
}

export type SpaceKey = "admin" | "steering" | "formations" | "projectsTraining";

/** Une « casquette » : un ensemble d'entrées de menu que la personne choisit d'afficher. */
export type Space = {
  key: SpaceKey;
  label: string;
  icon: React.ReactNode;
  /** Titre et sous-titre de l'en-tête quand la personne est dans cet espace */
  title: string;
  subtitle: string;
  sections: NavSection[];
};

/**
 * Les espaces de gestion d'une personne, dans l'ordre demandé. Chaque espace dépend de la
 * permission effective correspondante ; le rôle Administrateur ne donne pas implicitement accès aux autres.
 */
export function navSpaces(roles: ViewerRoles): Space[] {
  const spaces: Space[] = [];

  if (roles.superAdmin) {
    spaces.push({
      key: "admin",
      label: "Admin",
      icon: icons.functions,
      title: "Admin",
      subtitle: "",
      sections: [
        {
          title: "Admin",
          items: [
            { label: "Pilotage", href: "/gestion/admin?onglet=pilotage", icon: icons.adminStats },
            { label: "Membres", href: "/gestion/admin?onglet=membres", icon: icons.profile },
            { label: "Gestion des outils", href: "/gestion/admin?onglet=outils", icon: icons.apps },
            { label: "Gestion des ressources", href: "/gestion/admin?onglet=ressources", icon: icons.resources },
          ],
        },
      ],
    });
  }

  if (roles.superAdmin || roles.steeringMinistryIds.length > 0) {
    spaces.push({
      key: "steering",
      label: "Pilotage ministère",
      icon: icons.steer,
      title: "Pilotage du ministère",
      subtitle: "Organisez et supervisez les formations de votre ministère.",
      sections: [
        {
          title: "Pilotage",
          items: [
            { label: "Pilotage", href: "/gestion/pilotage", icon: icons.steer },
          ],
        },
      ],
    });
  }

  if (roles.superAdmin || roles.formationCategoryKeys.length > 0) {
    const allowed = roles.superAdmin
      ? ["heart", "character", "sensitivity", "deepening"]
      : roles.formationCategoryKeys;
    const candidates = [
      { key: "heart", label: "Formation du cœur", href: "/gestion/formations?onglet=coeur" },
      { key: "character", label: "Formation du caractère", href: "/gestion/formations?onglet=caractere" },
      { key: "sensitivity", label: "Formation des sensibilités", href: "/gestion/formations?onglet=sensibilites" },
      { key: "deepening", label: "Formations d’approfondissement", href: "/gestion/formations?onglet=approfondissements" },
    ];
    spaces.push({
      key: "formations",
      label: "Formations",
      icon: icons.formations,
      title: "Formations",
      subtitle: "Gérez les parcours pédagogiques qui vous sont confiés.",
      sections: [{
        title: "Formations",
        items: candidates.filter((item) => allowed.includes(item.key)).map((item) => ({
          label: item.label,
          href: item.href,
          icon: icons.formations,
        })),
      }],
    });
  }

  if (roles.superAdmin || roles.projectsTraining) {
    spaces.push({
      key: "projectsTraining",
      label: "Projets et formations",
      icon: icons.projectPropose,
      title: "Projets et formations",
      subtitle: "Gérez uniquement les éléments auxquels vous êtes affecté.",
      sections: [
        {
          title: "Projets et formations",
          items: [
            {
              label: "Mes affectations",
              href: "/gestion/projets-formations",
              icon: icons.propose,
            },
          ],
        },
      ],
    });
  }

  return spaces;
}

/** La page d'accueil d'un espace : sa première entrée. */
export function spaceHome(space: Space): string {
  return space.sections[0]?.items[0]?.href ?? "/etudiant";
}

/**
 * Les espaces auxquels une page peut appartenir, d'après le menu : une entrée exacte l'emporte,
 * sinon la plus longue entrée dont l'adresse est un préfixe. Plusieurs espaces peuvent
 * partager une même page (« Proposer ») ; l'appelant garde alors celui déjà choisi.
 * Liste vide pour une page absente du menu (par exemple le détail d'une séance).
 */
export function spacesForPath(spaces: Space[], pathname: string): SpaceKey[] {
  let bestLength = -1;
  let keys: SpaceKey[] = [];
  for (const space of spaces) {
    for (const section of space.sections) {
      for (const item of section.items) {
        const path = item.href.split("?")[0];
        const exact = pathname === path;
        const prefix = path !== "/etudiant" && pathname.startsWith(path + "/");
        if (!exact && !prefix) continue;
        const length = exact ? Infinity : path.length;
        if (length > bestLength) {
          bestLength = length;
          keys = [space.key];
        } else if (length === bestLength && !keys.includes(space.key)) {
          keys.push(space.key);
        }
      }
    }
  }
  return keys;
}
