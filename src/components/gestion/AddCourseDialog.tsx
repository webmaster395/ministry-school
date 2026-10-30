"use client";

import CourseCreationDialog from "@/components/gestion/CourseCreationDialog";

/** Entrée Pilotage : même formulaire, sensibilité et horaire imposés par le serveur. */
export default function AddCourseDialog({
  ministryId,
}: {
  ministryId: string;
  drafts?: boolean;
}) {
  return (
    <CourseCreationDialog
      context="ministry"
      parentId={ministryId}
      triggerLabel="Ajouter un cours"
    />
  );
}
