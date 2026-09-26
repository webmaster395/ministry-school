"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const MEMBER_REGISTRATION_URL = "https://www.billetweb.fr/mlk-ministry-school&quick=7261552";
const GENERAL_REGISTRATION_URL = "https://www.billetweb.fr/mlk-ministry-school";
const MEMBER_REQUEST_URL = "https://eglisemlk.fr/devenir-membre-actif-mlk/";
const MEMBER_DISCOVERY_URL = "https://eglisemlk.fr/devenir-membre/";

type Answer = "yes" | "no" | "unknown" | null;
type Result = "member" | "eligible" | "general" | null;

function ExternalLink({ href, children, secondary = false }: { href: string; children: React.ReactNode; secondary?: boolean }) {
  return <a className={secondary ? "pricing-result__secondary" : "pricing-result__primary"} href={href} target="_blank" rel="noopener noreferrer">{children}<span aria-hidden="true">↗</span></a>;
}

function PricingJourney() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [member, setMember] = useState<Answer>(null);
  const [teammate, setTeammate] = useState<Answer>(null);
  const [donor, setDonor] = useState<Answer>(null);
  const [result, setResult] = useState<Result>(null);
  const [showInfo, setShowInfo] = useState(false);

  const showQuestion = (nextStep: 1 | 2 | 3) => {
    setResult(null);
    setStep(nextStep);
    if (nextStep !== 1) setShowInfo(false);
  };

  const answerQuestion = (answer: Exclude<Answer, null>) => {
    if (step === 1) {
      setMember(answer);
      if (answer === "yes") setResult("member");
      else showQuestion(2);
      return;
    }
    if (step === 2) {
      setTeammate(answer);
      showQuestion(3);
      return;
    }
    setDonor(answer);
    setResult(teammate === "yes" || answer === "yes" ? "eligible" : "general");
  };

  const editAnswers = () => showQuestion(result === "member" ? 1 : 3);
  const selected = step === 1 ? member : step === 2 ? teammate : donor;
  const progress = result ? 100 : (step / 3) * 100;

  return (
    <div className="pricing-journey__card reveal shown" aria-live="polite">
      <div className="pricing-progress" aria-label="Progression du questionnaire">
        <div className="pricing-progress__meta"><span>{result ? "Ton tarif" : `Question ${step} sur 3`}</span><strong>{result ? "Résultat" : `${step}/3`}</strong></div>
        <div className="pricing-progress__track"><span style={{ width: `${progress}%` }} /></div>
      </div>
      <div className="pricing-stage">
        {result ? <>
          {result === "member" && <div className="pricing-result pricing-result--member">
            <p className="pricing-result__eyebrow">Tarif membre actif MLK</p><div className="pricing-result__price"><strong>9&nbsp;€</strong><span>/ mois</span></div>
            <h3>Tu bénéficies du tarif membre actif</h3><p>Ton statut de membre actif te permet de bénéficier du tarif préférentiel Ministry School de <strong>9&nbsp;€/mois</strong>.</p>
            <ExternalLink href={MEMBER_REGISTRATION_URL}>M’inscrire à 9 €/mois</ExternalLink>
          </div>}
          {result === "eligible" && <div className="pricing-result pricing-result--eligible">
            <p className="pricing-result__eyebrow">Prochaine étape</p><div className="pricing-result__price"><strong>9&nbsp;€</strong><span>/ mois après validation</span></div>
            <h3>Tu peux faire une demande pour devenir membre actif</h3>
            <p>D’après tes réponses, ton engagement peut te permettre de prétendre au statut de membre actif MLK.</p>
            <p>Pour bénéficier du tarif préférentiel Ministry School, fais ta demande de membre actif, puis <strong>reviens ici après l’avoir effectuée</strong> pour poursuivre ton inscription. <strong>Les équipes MLK vérifieront ensuite ton éligibilité et te confirmeront ton statut.</strong></p>
            <p>Il vous sera proposé un RDV pastoral pour valider la demande d’intégration.</p>
            <ExternalLink href={MEMBER_REQUEST_URL}>Faire ma demande de membre actif</ExternalLink>
            <div className="pricing-result__next"><h4>Tu as déjà effectué ta demande&nbsp;?</h4><p>Une fois ta demande effectuée, reviens ici pour poursuivre ton inscription à Ministry School au tarif membre actif.</p><ExternalLink href={MEMBER_REGISTRATION_URL} secondary>J’ai fait ma demande — m’inscrire à 9 €/mois</ExternalLink></div>
          </div>}
          {result === "general" && <div className="pricing-result pricing-result--general">
            <p className="pricing-result__eyebrow">Tarif général</p><div className="pricing-result__price"><strong>90&nbsp;€</strong><span>/ mois</span></div>
            <h3>Le tarif général s’applique pour le moment</h3><p>D’après tes réponses, tu ne remplis pas actuellement les conditions permettant de demander le statut de membre actif MLK.</p>
            <p>Tu peux tout de même rejoindre Ministry School au <strong>tarif général de 90&nbsp;€/mois</strong>.</p><p>Si tu souhaites devenir membre actif par la suite, tu peux commencer à t’engager régulièrement comme <strong>Équipier MLK</strong> et/ou devenir <strong>donateur mensualisé</strong>.</p>
            <ExternalLink href={GENERAL_REGISTRATION_URL}>M’inscrire à Ministry School — 90 €/mois</ExternalLink><ExternalLink href={MEMBER_DISCOVERY_URL} secondary>Découvrir comment devenir membre actif</ExternalLink>
          </div>}
          <button className="pricing-back" type="button" onClick={editAnswers}>← Modifier mes réponses</button>
        </> : <div className="pricing-question">
          <p className="pricing-question__number">0{step}</p>
          <div className="pricing-question__title"><h3>{step === 1 ? "As-tu déjà le statut de membre actif MLK ?" : step === 2 ? "Es-tu régulièrement engagé(e) comme Équipier MLK ?" : "Fais-tu un don mensuel à l’Église MLK ?"}</h3>
            {step === 1 && <button className="pricing-info" type="button" aria-expanded={showInfo} aria-controls="pricing-member-info" aria-label="En savoir plus sur le statut de membre actif MLK" onClick={() => setShowInfo((open) => !open)}>i</button>}
          </div>
          {step === 1 && showInfo && <p className="pricing-info__panel" id="pricing-member-info">Un membre actif MLK est une personne majeure qui contribue régulièrement à la vie de l’Église, comme Équipier MLK et/ou comme donateur mensualisé. Le statut est validé par les équipes MLK.</p>}
          {step === 2 && <p className="pricing-question__help">Tu donnes régulièrement de ton temps dans un service de l’Église MLK.</p>}
          {step === 3 && <p className="pricing-question__help">Tu soutiens financièrement l’Église MLK par un don régulier chaque mois.</p>}
          <div className={`pricing-question__options${step === 1 ? "" : " pricing-question__options--two"}`} role="group" aria-label={`Question ${step} sur 3`}>
            <button type="button" className={selected === "yes" ? "is-selected" : ""} onClick={() => answerQuestion("yes")}>Oui<span aria-hidden="true">→</span></button>
            <button type="button" className={selected === "no" ? "is-selected" : ""} onClick={() => answerQuestion("no")}>Non<span aria-hidden="true">→</span></button>
            {step === 1 && <button type="button" className={member === "unknown" ? "is-selected" : ""} onClick={() => answerQuestion("unknown")}>Je ne sais pas<span aria-hidden="true">→</span></button>}
          </div>
          {step > 1 && <button className="pricing-back" type="button" onClick={() => showQuestion(step === 3 ? 2 : 1)}>← Retour</button>}
        </div>}
      </div>
    </div>
  );
}

/** Anime la landing et monte le parcours tarifaire interactif dans sa section. */
export default function LandingScripts() {
  const [pricingRoot, setPricingRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    (window as unknown as { __TICKET_URL__?: string }).__TICKET_URL__ = process.env.NEXT_PUBLIC_BILLETWEB_URL ?? "";
    const frame = window.requestAnimationFrame(() => {
      setPricingRoot(document.getElementById("pricing-journey-root"));
    });
    const script = document.createElement("script");
    script.src = "/landing/script.js?v=20260926b";
    document.body.appendChild(script);
    return () => {
      window.cancelAnimationFrame(frame);
      script.remove();
    };
  }, []);

  return pricingRoot ? createPortal(<PricingJourney />, pricingRoot) : null;
}
