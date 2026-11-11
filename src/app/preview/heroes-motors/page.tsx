import { redirect } from "next/navigation";

export default function HeroesMotorsPreviewPage() {
  // L'ancien exemple fictif de Leïla ne doit plus être exposé. Le véritable
  // résultat est accessible uniquement depuis le compte auquel il est rattaché.
  redirect("/etudiant/identite");
}
