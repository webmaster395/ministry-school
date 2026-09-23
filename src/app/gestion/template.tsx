import ScrollReveal from "@/components/ScrollReveal";

// Remonté à chaque navigation : l'animation d'entrée se rejoue,
// tandis que le menu et l'en-tête (dans layout.tsx) restent en place.
export default function Template({ children }: { children: React.ReactNode }) {
  return <ScrollReveal>{children}</ScrollReveal>;
}
