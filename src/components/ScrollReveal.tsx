"use client";

import { useEffect, useRef } from "react";

// Même apparition que la landing : les blocs situés sous la ligne de flottaison
// montent en fondu quand ils entrent à l'écran. Ceux déjà visibles ne sont jamais
// masqués (pas de clignotement) : l'entrée de page s'en charge.
const SELECTOR = "section, article, ul > li, table, form";

export default function ScrollReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window) || window.innerHeight === 0) return;

    const seen = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        let delay = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.style.transitionDelay = `${delay}ms`;
          delay += 70;
          el.classList.add("is-revealed");
          observer.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );

    // Le contenu arrive en streaming (squelette puis vraie page) : on rescanne à chaque ajout
    // en différant pour laisser React terminer l'hydratation sans conflit d'attributs
    const scan = () => {
      requestAnimationFrame(() => {
        if (!ref.current) return;
        for (const el of root.querySelectorAll<HTMLElement>(SELECTOR)) {
          if (seen.has(el)) continue;
          seen.add(el);
          // Les blocs imbriqués suivent leur parent : on n'anime que le plus haut
          if (el.parentElement?.closest(SELECTOR)) continue;
          if (el.getBoundingClientRect().top <= window.innerHeight) continue;
          el.classList.add("reveal-on-scroll");
          observer.observe(el);
        }
      });
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    const mutations = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(scan, 200);
    });

    // Laisse l'hydratation React initiale se terminer avant de scanner
    timer = setTimeout(scan, 150);
    mutations.observe(root, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      mutations.disconnect();
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={ref} className="page-enter space-y-5">
      {children}
    </div>
  );
}
