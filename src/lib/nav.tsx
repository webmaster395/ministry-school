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
  adminSessions: <CalendarClock {...iconProps} />,
  functions: <Briefcase {...iconProps} />,
};

/** Le menu étudiant, toujours affiché : celui de la maquette de Rose Alice. */
export const studentSections: NavSection[] = [
  {
    title: "Principal",
    items: [
      { label: "Accueil", href: "/etudiant", icon: icons.home },
      { label: "Calendrier", href: "/etudiant/calendrier", icon: icons.calendar },
    ],
  },
  {
    title: "Mon parcours",
    items: [
      { label: "Mes cours", href: "/etudiant/cours", icon: icons.book },
      { label: "Travail à faire", href: "/etudiant/travail", icon: icons.task },
      // Masquées aux étudiants tant que ces espaces ne sont pas prêts (pages et données conservées)
      // { label: "Mon ministère", href: "/etudiant/formation", icon: icons.ministries },
      // { label: "Services et projets", href: "/etudiant/services", icon: icons.services },
    ],
  },
];

/** L'entrée « Mes fonctions » du bloc « Mes espaces », en bas du menu. */
export const functionsIcon = icons.functions;

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
  if (QUESTIONS_ENABLED && isPlainStudent(roles)) tabs.push({ label: "Une question ?", href: "/etudiant/aide" });
  return tabs;
}

export type SpaceKey = "admin" | "teacher" | "steering" | "services" | "project";

/** Une « casquette » : un ensemble d'entrées de menu que la personne choisit d'afficher. */
export type Space = {
  key: SpaceKey;
  label: string;
  /** Titre et sous-titre de l'en-tête quand la personne est dans cet espace */
  title: string;
  subtitle: string;
  sections: NavSection[];
};

/**
 * Les espaces de gestion d'une personne (ses « casquettes »), dans l'ordre du sélecteur, l'administration
 * en tête. L'administrateur les a tous. Le menu étudiant, lui, est commun à tout le monde.
 */
export function navSpaces(roles: ViewerRoles): Space[] {
  const spaces: Space[] = [];

  if (roles.admin) {
    spaces.push({
      key: "admin",
      label: "Administration",
      title: "Administration",
      subtitle: "Administrez les espaces et les accès de la plateforme.",
      sections: [
        {
          title: "Administration",
          items: [
            { label: "Vue d'ensemble", href: "/gestion/admin", icon: icons.adminHome },
            { label: "Communication", href: "/gestion/communication", icon: icons.announce },
          ],
        },
      ],
    });
  }

  if (roles.admin || roles.teacher) {
    spaces.push({
      key: "teacher",
      label: "Formateur",
      title: "Mes cours",
      subtitle: "Préparez les cours que vous enseignez.",
      sections: [
        {
          title: "Enseignement",
          items: [
            { label: "Préparer mes cours", href: "/gestion/enseignement", icon: icons.prep },
            { label: "Communication", href: "/gestion/communication", icon: icons.announce },
          ],
        },
      ],
    });
  }

  if (roles.admin || roles.steeringMinistryIds.length > 0) {
    spaces.push({
      key: "steering",
      label: "Pilotage ministériel",
      title: "Pilotage du ministère",
      subtitle: "Organisez et supervisez les formations de votre ministère.",
      sections: [
        {
          title: "Pilotage",
          items: [
            { label: "Pilotage", href: "/gestion/pilotage", icon: icons.steer },
            { label: "Communication", href: "/gestion/communication", icon: icons.announce },
          ],
        },
      ],
    });
  }

  // Deux casquettes distinctes : le responsable de service propose des formations,
  // le chef de projet des projets. L'administrateur a les deux.
  if (roles.admin || roles.serviceLead) {
    spaces.push({
      key: "services",
      label: "Responsable de service",
      title: "Responsable de service",
      subtitle: "Créez et pilotez les formations de votre service.",
      sections: [
        {
          title: "Services",
          items: [
            { label: "Mes formations", href: "/gestion/services", icon: icons.propose },
            { label: "Communication", href: "/gestion/communication", icon: icons.announce },
          ],
        },
      ],
    });
  }

  if (roles.admin || roles.projectLead) {
    spaces.push({
      key: "project",
      label: "Chef de projet",
      title: "Chef de projet",
      subtitle: "Créez et pilotez les projets dont vous êtes responsable.",
      sections: [
        {
          title: "Projets",
          items: [
            { label: "Mes projets", href: "/gestion/projets", icon: icons.projectPropose },
            { label: "Communication", href: "/gestion/communication", icon: icons.announce },
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
