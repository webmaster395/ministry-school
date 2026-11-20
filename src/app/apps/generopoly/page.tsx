import type { Metadata } from "next";
import GeneropolyExperience from "./GeneropolyExperience";
import "./generopoly.css";

export const metadata: Metadata = {
  title: "Généropoly — Le jeu où chaque choix compte",
  description: "Répartissez votre budget et votre temps, traversez les imprévus et découvrez ce que vos choix révèlent.",
};

export default function GeneropolyPage() {
  return (
    <div className="generopoly-root">
      <GeneropolyExperience />
    </div>
  );
}
