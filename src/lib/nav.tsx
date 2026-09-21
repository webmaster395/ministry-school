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
  SlidersHorizontal,
} from "lucide-react";
import { isPlainStudent, type ViewerRoles } from "@/lib/roles";

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
  functions: <SlidersHorizontal {...iconProps} />,
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
      { label: "Ministères", href: "/etudiant/formation", icon: icons.ministries },
      { label: "Services et projets", href: "/etudiant/services", icon: icons.services },
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
  ];
  if (isPlainStudent(roles)) tabs.push({ label: "Une question ?", href: "/etudiant/aide" });
  return tabs;
}

export type SpaceKey = "admin" | "teacher" | "steering" | "services" | "project";

/** Une « casquette » : un ensemble d'entrées de menu que la personne choisit d'afficher. */
export type Space = {
  key: SpaceKey;
  label: string;
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
      sections: [
        {
          title: "Administration",
          items: [
            { label: "Vue d'ensemble", href: "/admin", icon: icons.adminHome },
            { label: "Séances", href: "/admin/seances", icon: icons.adminSessions },
          ],
        },
      ],
    });
  }

  if (roles.admin || roles.teacher) {
    spaces.push({
      key: "teacher",
      label: "Enseignant",
      sections: [
        {
          title: "Enseignement",
          items: [
            { label: "Préparer mes cours", href: "/etudiant/enseignement", icon: icons.prep },
            { label: "Messages aux étudiants", href: "/enseignant/messages", icon: icons.announce },
          ],
        },
      ],
    });
  }

  if (roles.admin || roles.steeringMinistryIds.length > 0) {
    spaces.push({
      key: "steering",
      label: "Pilotage ministériel",
      sections: [
        {
          title: "Pilotage",
          items: [{ label: "Pilotage", href: "/etudiant/pilotage", icon: icons.steer }],
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
      sections: [
        {
          title: "Services",
          items: [
            {
              label: "Proposer une formation",
              href: "/etudiant/services/nouveau?type=formation",
              icon: icons.propose,
            },
          ],
        },
      ],
    });
  }

  if (roles.admin || roles.projectLead) {
    spaces.push({
      key: "project",
      label: "Chef de projet",
      sections: [
        {
          title: "Projets",
          items: [
            {
              label: "Proposer un projet",
              href: "/etudiant/services/nouveau?type=projet",
              icon: icons.projectPropose,
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
