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
} from "lucide-react";
import { isPlainStudent, type ViewerRoles } from "@/lib/roles";
import { QUESTIONS_ENABLED } from "@/lib/questions";

export type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
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
};

/** Le menu étudiant, toujours affiché : celui de la maquette de Rose Alice. */
export const studentSections: NavSection[] = [
  {
    title: "Principal",
    items: [
      { label: "Accueil", href: "/etudiant", icon: icons.home },
      {
        label: "Calendrier",
        href: "/etudiant/calendrier",
        icon: icons.calendar,
      },
    ],
  },
  {
    title: "Mon parcours",
    items: [
      { label: "Mes cours", href: "/etudiant/cours", icon: icons.book },
      { label: "Travail à faire", href: "/etudiant/travail", icon: icons.task },
      // Le ministère reste masqué tant que son espace n'est pas prêt.
      // { label: "Mon ministère", href: "/etudiant/formation", icon: icons.ministries },
      { label: "Projets et formations", href: "/etudiant/services", icon: icons.services },
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
 * Les onglets de l'espace Profil : le profil, la messagerie et, pour un étudiant simple,
 * la question à l'administration. Ils rassemblent des pages qui n'ont plus d'entrée de menu.
 */
export function profileTabs(roles: ViewerRoles): ProfileTab[] {
  const tabs: ProfileTab[] = [
    { label: "Profil", href: "/etudiant/profil" },
    { label: "Messagerie", href: "/etudiant/messages" },
    { label: "Préférences", href: "/etudiant/preferences" },
  ];
  if (QUESTIONS_ENABLED && isPlainStudent(roles))
    tabs.push({ label: "Une question ?", href: "/etudiant/aide" });
  return tabs;
}

export type SpaceKey = "superAdmin" | "admin" | "steering" | "projectsTraining";

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
      key: "superAdmin",
      label: "Super administration",
      icon: icons.adminHome,
      title: "Super administration",
      subtitle: "Supervisez la plateforme depuis un point d’entrée unique.",
      sections: [{
        title: "Super administration",
        items: [{ label: "Accueil", href: "/gestion/super-admin", icon: icons.adminHome }],
      }],
    });
  }

  if (roles.admin && !roles.superAdmin) {
    spaces.push({
      key: "admin",
      label: "Administrateur",
      icon: icons.adminHome,
      title: "Administrateur",
      subtitle: "Suivez les statistiques et organisez le programme général.",
      sections: [
        {
          title: "Administration",
          items: [
            {
              label: "Tableau de bord",
              href: "/gestion/admin",
              icon: icons.adminHome,
            },
            {
              label: "Statistiques",
              href: "/gestion/admin?onglet=statistiques",
              icon: icons.adminStats,
            },
            {
              label: "Programme",
              href: "/gestion/admin?onglet=programme",
              icon: icons.adminSessions,
            },
            {
              label: "Membres",
              href: "/gestion/admin?onglet=membres",
              icon: icons.profile,
            },
          ],
        },
      ],
    });
  }

  if (roles.steeringMinistryIds.length > 0) {
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

  if (roles.projectsTraining) {
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
