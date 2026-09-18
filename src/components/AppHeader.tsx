import { getViewer } from "@/lib/data/viewer";
import HeaderTitle from "./HeaderTitle";
import LogoutButton from "./LogoutButton";
import MinistryPicto from "./MinistryPicto";

export default async function AppHeader({ roleLabel }: { roleLabel: string }) {
  const viewer = await getViewer();

  const firstName = viewer?.fullName.split(" ")[0] ?? "";
  const greeting = firstName ? `Bonjour ${firstName}` : "Bonjour";

  // Pastille : « Pasteur · Étudiant », ou « Administrateur » seul
  const pillLabel =
    viewer?.role !== "admin" && viewer?.ministryName
      ? `${viewer.ministryName} · ${roleLabel}`
      : roleLabel;

  return (
    <header id="top" className="border-b border-border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-5 sm:px-7">
        <HeaderTitle greeting={greeting} />

        <div className="flex items-center gap-4">
          <span
            className={`label inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border py-[5px] text-xs tracking-[0.1em] text-foreground ${
              viewer?.role !== "admin" && viewer?.ministrySlug ? "pl-2 pr-3" : "px-3"
            }`}
          >
            {viewer?.role !== "admin" && <MinistryPicto slug={viewer?.ministrySlug} size={18} />}
            {pillLabel}
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
