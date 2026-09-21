import { getViewer } from "@/lib/data/viewer";
import HeaderTitle from "./HeaderTitle";
import LogoutButton from "./LogoutButton";
import HeaderBadge from "./HeaderBadge";
import MobileNav from "./MobileNav";
import SpaceSwitcher from "./SpaceSwitcher";

export default async function AppHeader() {
  const viewer = await getViewer();

  const firstName = viewer?.fullName.split(" ")[0] ?? "";
  const greeting = firstName ? `Bonjour ${firstName}` : "Bonjour";
  const hasPicto = viewer?.role !== "admin" && !!viewer?.ministrySlug;

  return (
    <header id="top" className="border-b border-border bg-background md:h-[88px]">
      <div className="flex h-full flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-4 sm:gap-x-4 sm:px-7 md:flex-nowrap md:py-0">
        <div className="flex min-w-0 items-center gap-2">
          {viewer && (
            <MobileNav fullName={viewer.fullName} avatarUrl={viewer.avatarUrl} ministrySlug={viewer.ministrySlug} />
          )}
          <HeaderTitle greeting={greeting} />
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-2 sm:gap-x-4">
          <SpaceSwitcher />
          <HeaderBadge
            firstName={firstName}
            ministrySlug={viewer?.ministrySlug ?? null}
            showPicto={hasPicto}
            avatarUrl={viewer?.avatarUrl ?? null}
          />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
