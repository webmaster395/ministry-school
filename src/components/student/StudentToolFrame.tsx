import type { ReactNode } from "react";
import BackButton from "@/components/BackButton";

type StudentToolFrameProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  showBack?: boolean;
};

export default function StudentToolFrame({ children, className = "", contentClassName = "", showBack = true }: StudentToolFrameProps) {
  return (
    <section className={`student-tool-frame isolate flex h-[calc(100dvh-9.5rem)] min-h-[30rem] w-full flex-col overflow-hidden rounded-[22px] border border-border-soft bg-background shadow-[0_18px_55px_rgba(28,35,32,0.08)] max-md:h-[calc(100dvh-9.5rem-env(safe-area-inset-bottom))] max-md:min-h-0 max-md:rounded-[16px] ${className}`}>
      {showBack ? (
        <div className="flex h-14 shrink-0 items-center border-b border-black/[0.08] bg-white/[0.94] px-3 backdrop-blur-md sm:px-4">
          <BackButton fallbackHref="/etudiant/identite" fallbackLabel="Mon identité" className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-[#202622] transition hover:bg-black/[0.05]" />
        </div>
      ) : null}
      <div className={`student-tool-frame__content min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch] ${contentClassName}`}>
        {children}
      </div>
    </section>
  );
}
