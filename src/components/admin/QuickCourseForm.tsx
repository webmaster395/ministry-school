"use client";

import CourseCreationDialog from "@/components/gestion/CourseCreationDialog";

type Choice = { id: string; name: string };

/** Entrée compacte du programme Admin ; le formulaire est partagé par tous les cours. */
export default function QuickCourseForm({
  date,
  parking,
  trainers,
  ministries,
}: {
  date: string;
  parking: boolean;
  trainers: Choice[];
  ministries: Choice[];
}) {
  return (
    <CourseCreationDialog
      context="admin"
      defaultDate={date}
      defaultParking={parking}
      trainers={trainers}
      ministries={ministries}
      triggerLabel="Ajouter un cours"
      triggerClassName="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-foreground"
    />
  );
}
