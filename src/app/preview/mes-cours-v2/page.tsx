import Link from "next/link";
import { CalendarDays, CheckCircle2, ChevronRight, CircleUser, MapPin } from "lucide-react";

const courses = [
  { day: "15", month: "NOV", time: "09:30", kind: "Formation du cœur", color: "#c36b84", title: "Guérir de ses blessures", hours: "9 h 30 – 16 h 30", room: "Salle principale", trainer: "Nathalie Boudehent", work: "2 éléments à préparer" },
  { day: "29", month: "NOV", time: "09:30", kind: "Caractère", color: "#d69a33", title: "Grandir dans la fidélité", hours: "9 h 30 – 16 h 30", room: "Salle principale", trainer: "Ivan Carluer", work: "Tout est terminé", done: true },
  { day: "06", month: "DÉC", time: "10:00", kind: "Projet et formation", color: "#6556b3", title: "Choisir mon projet ou ma formation", hours: "10 h – 16 h", room: "Plusieurs espaces", trainer: "Équipe Ministry School", work: "Choix à effectuer" },
  { day: "13", month: "DÉC", time: "09:30", kind: "Sensibilité ministérielle", color: "#4f8b72", title: "Servir selon sa sensibilité", hours: "9 h 30 – 16 h 30", room: "Espace Martin Luther King", trainer: "Responsables ministériels", work: "Aucun travail" },
];

export default function CoursesPreviewPage() {
  return <main className="min-h-screen bg-[#f6f4ef] px-4 py-7 text-[#27302f] sm:px-8 sm:py-10">
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#dfddd5] bg-white px-4 py-3 text-sm">
        <span><strong>Aperçu</strong> · Nouvelle vue Mes cours</span>
        <span className="rounded-full bg-[#ece9df] px-3 py-1 text-xs">Données de démonstration</span>
      </div>

      <header>
        <div><p className="text-[13px] text-[#777b77]">Promotion 2026–2027</p><h1 className="mt-0.5 font-serif text-[29px] leading-tight">Mes cours</h1><p className="mt-1 text-sm text-[#777b77]">Ton calendrier, les informations utiles et le travail à préparer.</p></div>
      </header>

      <div className="space-y-3">
        <nav className="inline-flex rounded-full bg-[#eae7df] p-1 text-sm font-semibold"><span className="rounded-full bg-[#27302f] px-4 py-2 text-[#fff5dd]">À venir <span className="ml-1 opacity-70">4</span></span><span className="px-4 py-2 text-[#777b77]">Passés <span className="ml-1">12</span></span></nav>
        <nav className="flex gap-2 overflow-x-auto pb-1 text-[13px]"><span className="shrink-0 rounded-full bg-[#27302f] px-3.5 py-2 text-white">Tous les mois à venir</span>{["Novembre 2026", "Décembre 2026", "Janvier 2027"].map(label => <span key={label} className="shrink-0 rounded-full bg-[#eae7df] px-3.5 py-2 text-[#666b67]">{label}</span>)}</nav>
        <nav className="flex gap-2 overflow-x-auto pb-1 text-[13px]"><span className="shrink-0 rounded-full bg-[#27302f] px-3.5 py-2 text-white">Tous</span>{["Formation du cœur", "Caractère", "Sensibilité ministérielle", "Projet et formation"].map(label => <span key={label} className="shrink-0 rounded-full border border-[#d5d3cc] bg-white px-3.5 py-2 text-[#666b67]">{label}</span>)}</nav>
      </div>

      <ul className="overflow-hidden rounded-2xl border border-[#dedbd3] bg-white shadow-[0_16px_50px_rgba(39,48,47,.06)]">
        {courses.map(course => <li key={course.title} className="border-b border-[#ebe8e1] last:border-0"><article className="group relative grid gap-3 px-4 py-4 sm:grid-cols-[74px_minmax(0,1fr)_auto] sm:items-center sm:gap-5 sm:px-5 sm:py-5"><span className="absolute inset-y-3 left-0 w-[3px] rounded-r-full" style={{background:course.color}} />
          <div className="flex items-center gap-3 sm:block sm:text-center"><strong className="text-[25px] leading-none sm:block">{course.day}</strong><span className="text-[11px] font-bold tracking-[.12em] text-[#777b77] sm:mt-1 sm:block">{course.month}</span><span className="text-xs text-[#777b77] sm:mt-1 sm:block">{course.time}</span></div>
          <div className="min-w-0"><span className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{color:course.color,background:`color-mix(in srgb, ${course.color} 13%, transparent)`}}>{course.kind}</span><h2 className="mt-2 text-[17px] font-semibold">{course.title}</h2><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#777b77]"><span className="inline-flex items-center gap-1.5"><CalendarDays size={14}/>{course.hours}</span><span className="inline-flex items-center gap-1.5"><MapPin size={14}/>{course.room}</span><span className="inline-flex items-center gap-1.5"><CircleUser size={14}/>{course.trainer}</span></div></div>
          <div className="flex items-center justify-between gap-4 border-t border-[#ebe8e1] pt-3 sm:min-w-[165px] sm:justify-end sm:border-0 sm:pt-0"><span className={`text-xs font-semibold ${course.done ? "inline-flex items-center gap-1.5 text-emerald-700" : ""}`}>{course.done && <CheckCircle2 size={15}/>} {course.work}</span><ChevronRight size={19} className="text-[#777b77]"/></div>
        </article></li>)}
      </ul>

      <p className="text-center text-xs text-[#777b77]">Le calendrier est désormais intégré à Mes cours. Le travail détaillé reste accessible dans son onglet dédié.</p>
      <Link href="/" className="mx-auto block w-fit text-sm font-semibold underline underline-offset-4">Quitter l’aperçu</Link>
    </div>
  </main>;
}
