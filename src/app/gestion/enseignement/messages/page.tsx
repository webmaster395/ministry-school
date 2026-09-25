import { redirect } from "next/navigation";

/** L'envoi de messages est désormais dans « Communication », commun à toutes les fonctions. */
export default function TeacherMessagesPage() {
  redirect("/gestion/communication");
}
