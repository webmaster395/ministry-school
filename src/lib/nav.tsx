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
  Megaphone,
  MessageSquare,
  Presentation,
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
  adminHome: <LayoutDashboard {...iconProps} />,
  adminSessions: <CalendarClock {...iconProps} />,
};

const baseStudentSections: NavSection[] = [
  {
    title: "Principale",
    items: [{ label: "Accueil", href: "/etudiant", icon: icons.home }],
  },
  {
    title: "Calendrier",
    items: [{ label: "Calendrier", href: "/etudiant/calendrier", icon: icons.calendar }],
  },
  {
    title: "Pédagogie",
    items: [
      { label: "Mes cours", href: "/etudiant/cours", icon: icons.book },
      { label: "Travail à faire", href: "/etudiant/travail", icon: icons.task },
      { label: "Ministères", href: "/etudiant/formation", icon: icons.ministries },
      { label: "Services et projets", href: "/etudiant/services", icon: icons.services },
    ],
  },
  {
    title: "Communication",
    items: [{ label: "Messages", href: "/etudiant/messages", icon: icons.messages }],
  },
  {
    title: "Compte",
    items: [{ label: "Profil", href: "/etudiant/profil", icon: icons.profile }],
  },
];

/** La vue étudiant ; « Une question ? » n'est proposée qu'aux étudiants simples. */
function studentSectionsFor(roles: ViewerRoles): NavSection[] {
  if (!isPlainStudent(roles)) return baseStudentSections;
  return baseStudentSections.map((section) =>
    section.title === "Compte"
      ? {
          ...section,
          items: [...section.items, { label: "Une question ?", href: "/etudiant/aide", icon: icons.help }],
        }
      : section
  );
}

/** Onglets en plus, selon les rôles : tout le monde garde la vue étudiant. */
function extraSections(roles: ViewerRoles): NavSection[] {
  const out: NavSection[] = [];

  if (roles.teacher) {
    out.push({
      title: "Vue enseignant",
      items: [
        { label: "Préparer mes cours", href: "/etudiant/enseignement", icon: icons.prep },
        { label: "Messages aux étudiants", href: "/enseignant/messages", icon: icons.announce },
      ],
    });
  }

  if (roles.steeringMinistryIds.length > 0) {
    out.push({
      title: "Vue pilotage ministériel",
      items: [{ label: "Pilotage", href: "/etudiant/pilotage", icon: icons.steer }],
    });
  }

  if (roles.serviceLead || roles.projectLead || roles.admin) {
    const label =
      roles.serviceLead && !roles.projectLead && !roles.admin
        ? "Proposer une formation"
        : roles.projectLead && !roles.serviceLead && !roles.admin
          ? "Proposer un projet"
          : "Proposer";
    const title =
      roles.serviceLead && roles.projectLead
        ? "Vue responsable et chef de projet"
        : roles.projectLead
          ? "Vue chef de projet"
          : roles.serviceLead
            ? "Vue responsable de service"
            : "Services et projets";
    out.push({
      title,
      items: [{ label, href: "/etudiant/services/nouveau", icon: icons.propose }],
    });
  }

  if (roles.admin) {
    out.push({
      title: "Administration",
      items: [
        { label: "Vue d'ensemble", href: "/admin", icon: icons.adminHome },
        { label: "Séances", href: "/admin/seances", icon: icons.adminSessions },
      ],
    });
  }

  return out;
}

/**
 * Les sections du menu, dans l'ordre affiché : les vues de rôle d'abord
 * (l'administration tout en haut), puis la vue étudiant, en bas.
 * Une section sans entrée sert de séparateur titré.
 */
export function navSections(roles: ViewerRoles): NavSection[] {
  const studentSections = studentSectionsFor(roles);
  const extras = extraSections(roles);
  if (extras.length === 0) return studentSections;

  const adminSection = extras.filter((e) => e.title === "Administration");
  const otherExtras = extras.filter((e) => e.title !== "Administration");
  return [
    ...adminSection,
    ...otherExtras,
    { title: "Vue étudiant", items: [] as NavItem[] },
    ...studentSections,
  ];
}
