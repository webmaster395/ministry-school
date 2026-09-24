"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type BackButtonProps = {
  fallbackHref: string;
  fallbackLabel?: string;
  className?: string;
};

export default function BackButton({
  fallbackHref,
  fallbackLabel = "Retour",
  className = "inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition",
}: BackButtonProps) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // Si l'utilisateur est arrivé depuis une page interne (history > 1)
    if (typeof window !== "undefined" && window.history.length > 1) {
      setCanGoBack(true);
    }
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    if (canGoBack && typeof window !== "undefined" && document.referrer.includes(window.location.host)) {
      e.preventDefault();
      router.back();
    }
  };

  return (
    <Link href={fallbackHref} onClick={handleClick} className={className}>
      <ChevronLeft size={16} />
      <span>{fallbackLabel}</span>
    </Link>
  );
}
