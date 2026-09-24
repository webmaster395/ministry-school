"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LegalNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      document.referrer &&
      document.referrer.includes(window.location.host)
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- historique détecté uniquement après montage client
      setCanGoBack(true);
    }
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    if (canGoBack) {
      e.preventDefault();
      router.back();
    }
  };

  const fallbackHref = isLoggedIn ? "/app" : "/";
  const backLabel = canGoBack
    ? "← Retour"
    : isLoggedIn
      ? "← Retour à mon espace"
      : "← Retour au site";

  return (
    <header className="legal-nav">
      <Link
        className="footer-brand"
        href={fallbackHref}
        aria-label={isLoggedIn ? "Retour à mon espace Ministry School" : "Retour à Ministry School"}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/landing/ministry-icons-transparent.png" alt="" />
        <span>Ministry School</span>
      </Link>
      <Link href={fallbackHref} onClick={handleClick}>
        {backLabel}
      </Link>
    </header>
  );
}
