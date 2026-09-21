import { getViewer } from "@/lib/data/viewer";
import HeaderTitle from "./HeaderTitle";
import LogoutButton from "./LogoutButton";
import MinistryPicto from "./MinistryPicto";

export default async function AppHeader() {
  const viewer = await getViewer();

  const firstName = viewer?.fullName.split(" ")[0] ?? "";
  const greeting = firstName ? `Bonjour ${firstName}` : "Bonjour";
  const hasPicto = viewer?.role !== "admin" && !!viewer?.ministrySlug;

  return (
    <header id="top" className="border-b border-border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-5 sm:px-7">
        <HeaderTitle greeting={greeting} />

        <div className="flex items-center gap-4">
          {firstName && (
            <span
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border py-[5px] text-sm font-medium text-foreground ${
                hasPicto ? "pl-2 pr-3.5" : "px-3.5"
              }`}
            >
              {hasPicto && <MinistryPicto slug={viewer.ministrySlug} size={20} />}
              {firstName}
            </span>
          )}
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
