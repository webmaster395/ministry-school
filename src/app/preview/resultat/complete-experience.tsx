"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { normalizeIntegralV10 } from "@/lib/editorial/integral-v10";
import { formatBibleReference, resolveScriptureLinks } from "@/lib/editorial/scripture-references";
import styles from "./result-preview.module.css";
import { formatRelativePercentage, toRelativePercentages } from "@/lib/results/relative-percentages";
import { discV2Source } from "@/lib/disc-v2/source";
import { identityInterpretation, type IdentityInterpretation } from "@/lib/results/identity-interpretation";
import { identityProfilePresentations } from "@/lib/editorial/identity-profile-presentations";
import FunctioningDemo, { type DailyCombination, type StoredPressureResult } from "../fonctionnement-v2/preview";
import ForcesDefis from "../forces-et-defis-v2/preview";
import AvecLesAutres from "../avec-les-autres-v2/preview";
import Grandir from "../grandir-v1/preview";
import OrganisationPreview from "../dans-une-organisation-v1/preview";
import { ORGANISATION_MANUAL_SOURCE, defaultContextForRole, normalizeManualOrganisationContent } from "../dans-une-organisation-v1/dataset";
import { withMappBasePath } from "@/lib/routing/base-path";

const source = normalizeIntegralV10();
const editorialLibrary = source;
const biblicalV10 = source.biblical;
export type PreviewProfileCode = "conquerant" | "communiquant" | "facilitateur" | "analyste";

const resultProfileColor: Record<PreviewProfileCode, string> = {
  conquerant: "var(--results-conquerant)",
  communiquant: "var(--results-communiquant)",
  facilitateur: "var(--results-facilitateur)",
  analyste: "var(--results-analyste)",
};

function assignTypographyRoles(doc: Document) {
  doc.body.classList.add("results-design-system");
  for (const page of doc.querySelectorAll<HTMLElement>("#page-1,#page-3,#page-4,#page-5,#page-6,#page-7")) {
    page.querySelectorAll("h1").forEach(element => element.classList.add("ds-page-title"));
    page.querySelectorAll("h2").forEach(element => element.classList.add(element.closest(".panel") ? "ds-card-title" : "ds-section-title"));
    page.querySelectorAll("h3").forEach(element => element.classList.add("ds-card-title"));
    page.querySelectorAll("p").forEach(element => element.classList.add("ds-body"));
    page.querySelectorAll(".kicker,.section-label,.eyeline,.identity-profile-eyebrow,.fd-overline,.grow-overline,.bible-label").forEach(element => element.classList.add("ds-eyebrow"));
    page.querySelectorAll(".hero>p,.fd-heading>p,.relation-head>p,.grow-head>p,.bible-top>p").forEach(element => { element.classList.remove("ds-body"); element.classList.add("ds-page-intro"); });
  }
}

const dimensionOrder: PreviewProfileCode[] = ["conquerant", "communiquant", "analyste", "facilitateur"];
const profileLabels: Record<PreviewProfileCode, string> = { conquerant: "Conquérant", communiquant: "Communiquant", facilitateur: "Facilitateur", analyste: "Analyste" };
const demoValues: Record<PreviewProfileCode, number> = { conquerant: 48, communiquant: 56, facilitateur: 61, analyste: 52 };

function setText(root: ParentNode, selector: string, value?: string | null) {
  const element = root.querySelector<HTMLElement>(selector);
  if (element && value) element.textContent = value;
}

function setParagraphs(root: ParentNode, selector: string, values: readonly string[]) {
  const elements = root.querySelectorAll<HTMLElement>(selector);
  values.forEach((value, index) => { if (elements[index]) elements[index].textContent = value; });
}

function createIdentityProfileSection(doc: Document, code: PreviewProfileCode, rank: "primary" | "secondary") {
  const content = identityProfilePresentations[code];
  const section = doc.createElement("section");
  section.className = "identity-profile-section";
  section.dataset.rank = rank;
  section.dataset.profile = code;
  section.style.setProperty("--identity-accent", resultProfileColor[code]);

  const copy = doc.createElement("div");
  copy.className = "identity-profile-copy";
  const eyebrow = doc.createElement("div");
  eyebrow.className = "identity-profile-eyebrow";
  const number = doc.createElement("span");
  number.className = "identity-profile-number";
  number.textContent = rank === "primary" ? "01" : "02";
  const role = doc.createElement("span");
  role.textContent = rank === "primary" ? "Ton profil principal" : "Ton profil secondaire";
  eyebrow.append(number, role);
  const name = doc.createElement("h2");
  name.textContent = profileLabels[code];
  const title = doc.createElement("h3");
  title.textContent = content.title;
  const paragraph = doc.createElement("p");
  paragraph.textContent = rank === "primary" ? content.primary : content.secondary;
  copy.append(eyebrow, name, title, paragraph);

  const keywords = doc.createElement("div");
  keywords.className = "identity-keywords";
  keywords.setAttribute("aria-label", `Dix mots-clés du profil ${profileLabels[code]}`);
  const heading = doc.createElement("span");
  heading.className = "identity-keywords-heading";
  heading.textContent = "En dix mots";
  const list = doc.createElement("ol");
  content.keywords.forEach((word) => {
    const item = doc.createElement("li");
    item.textContent = word;
    list.append(item);
  });
  keywords.append(heading, list);
  section.append(copy, keywords);
  return section;
}

function renderHighlightedText(doc: Document, element: HTMLElement | null, text: string, highlights: readonly string[]) {
  if (!element) return;
  element.replaceChildren();
  let cursor = 0;
  const ranges = highlights
    .map((highlight) => ({ highlight, index: text.indexOf(highlight) }))
    .filter(({ index }) => index >= 0)
    .sort((left, right) => left.index - right.index);
  ranges.forEach(({ highlight, index }) => {
    if (index < cursor) return;
    element.append(doc.createTextNode(text.slice(cursor, index)));
    const strong = doc.createElement("strong");
    strong.textContent = highlight;
    element.append(strong);
    cursor = index + highlight.length;
  });
  element.append(doc.createTextNode(text.slice(cursor)));
}

function renderReferenceLinks(doc: Document, element: HTMLElement | null, references: readonly string[]) {
  if (!element) return;
  element.replaceChildren();
  const links = references.flatMap(resolveScriptureLinks);
  links.forEach((item, index) => {
    if (index) element.append(doc.createTextNode(" · "));
    if (!item.url) { element.append(doc.createTextNode(item.label)); return; }
    const anchor = doc.createElement("a");
    anchor.href = item.url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.setAttribute("aria-label", `${item.label}, ouvrir dans YouVersion`);
    anchor.textContent = `${item.label} ↗`;
    element.append(anchor);
  });
}

function appendDetailSection(doc: Document, container: HTMLElement, label: string, body: string) {
  const heading = doc.createElement("strong"); heading.textContent = label;
  const paragraph = doc.createElement("p"); paragraph.textContent = body;
  container.append(heading, paragraph);
}

export function ensureCompleteResultsJourney(doc: Document, initialPage = 1) {
  if (doc.getElementById("page-7")) return;
  const legacyGrowth = doc.getElementById("page-5");
  const legacyBible = doc.getElementById("page-6");
  if (!legacyGrowth || !legacyBible) return;

  legacyGrowth.id = "page-6";
  legacyBible.id = "page-7";
  doc.querySelectorAll<HTMLElement>("[data-page], [data-go]").forEach(element => {
    const attribute = element.hasAttribute("data-page") ? "data-page" : "data-go";
    const value = Number(element.getAttribute(attribute));
    if (value >= 5) element.setAttribute(attribute, String(value + 1));
  });

  const growthButton = doc.querySelector<HTMLElement>('.nav [data-page="6"]');
  const organisationButton = doc.createElement("button");
  organisationButton.setAttribute("data-page", "5");
  organisationButton.innerHTML = '<span class="num">05</span> Dans une organisation';
  growthButton?.before(organisationButton);
  const growthNumber = growthButton?.querySelector<HTMLElement>(".num");
  if (growthNumber) growthNumber.textContent = "06";
  const bibleNumber = doc.querySelector<HTMLElement>('.nav [data-page="7"] .num');
  if (bibleNumber) bibleNumber.textContent = "07";

  const organisationPage = doc.createElement("section");
  organisationPage.id = "page-5";
  organisationPage.className = "page";
  legacyGrowth.before(organisationPage);
  doc.querySelectorAll<HTMLElement>(".page").forEach(page => page.classList.toggle("active", page.id === `page-${initialPage}`));
  doc.querySelectorAll<HTMLElement>(".nav [data-page]").forEach(button => button.classList.toggle("active", button.dataset.page === String(initialPage)));
}

export function hydrateDraftProfile(
  doc: Document,
  profileCode: PreviewProfileCode,
  secondaryCode: PreviewProfileCode,
  _legacyPressureCode?: PreviewProfileCode,
  scoreValues?: Partial<Record<PreviewProfileCode, number | null>>,
  isPreview = true,
  pdfUrl = withMappBasePath("/api/preview/profile-pdf"),
) {
  ensureCompleteResultsJourney(doc);
  const profile = source.profiles[profileCode];
  const secondary = source.profiles[secondaryCode];
  const combination = source.orientedCombinations[`${profileCode}__${secondaryCode}` as keyof typeof source.orientedCombinations];
  const color = resultProfileColor[profileCode];
  const rawDisplayScores = scoreValues
    ? { ...demoValues, ...scoreValues }
    : { ...demoValues, [profileCode]: 87, [secondaryCode]: 72 };
  const normalized = toRelativePercentages(dimensionOrder.map((code) => ({ code, value: Number(rawDisplayScores[code] ?? 0) })));
  const scores = Object.fromEntries(dimensionOrder.map((code) => [code, normalized[code] ?? 0])) as Record<PreviewProfileCode, number>;
  const scoreOrder = [...dimensionOrder].sort((left, right) => scores[right] - scores[left]);
  doc.documentElement.style.setProperty("--red", color);
  let dynamicStyle = doc.querySelector<HTMLStyleElement>("#profile-dynamic-color");
  if (!dynamicStyle) { dynamicStyle = doc.createElement("style"); dynamicStyle.id = "profile-dynamic-color"; doc.head.appendChild(dynamicStyle); }
  dynamicStyle.textContent = `
    :root{--profile:${color};--profile-ink:${profileCode === "communiquant" || profileCode === "facilitateur" ? "#202124" : "#fff"};--profile-pale:color-mix(in srgb,${color} 10%,white);--profile-soft:color-mix(in srgb,${color} 22%,white);--neutral:#7b7b82;--neutral-dark:#595960;--neutral-pale:#f2f2f4}
    .relation-source strong,#page-1 .editorial-art strong,#page-1 .combination-copy small{color:var(--profile)!important}
    .kicker,.eyeline,.section-label,.function-overline,.function-detail-num,.function-example span,
    .fd-overline,.fd-dark,.fd-row-num,.fd-row-number,.fd-index,.fd-number,.relation-overline,
    .grow-eyebrow,.grow-number,.grow-detail-eyebrow,.grow-test span,.grow-question span{color:var(--neutral)!important}
    #page-1 .red,.pull-quote,.function-tabs button.selected,.fd-switch button[aria-selected="true"],
    .fd-switch button.active,.relation-picker button[aria-pressed="true"]{background:var(--profile)!important}
    #page-1 .editorial-art,#page-1 .combination-visual,#page-2 .function-feature,#page-3 .fd-feature,
    #page-6 .grow-feature,.grow-choice.selected{background:var(--profile-pale)!important}
    #page-1 .art-line,#page-2 .function-feature-visual:before,#page-6 .grow-point.d{background:var(--profile)!important}
    #page-1 .combination-copy small,#page-3 .fd-feature,.grow-choice.selected{border-color:var(--profile)!important}
    #page-1 .combination-visual:after{border-color:color-mix(in srgb,var(--profile) 30%,transparent)!important}
    #page-1 .editorial-art:before{border-color:color-mix(in srgb,var(--profile) 11%,transparent)!important}
    #page-1 .editorial-art>span,#page-1 .combination-visual>span{color:var(--profile)!important}
    #page-1 .combination-symbols b:first-child{background:var(--profile)!important}
    #page-2{--red:var(--profile)!important}
    #page-2 .function-intro>.eyeline,#page-2 .function-section-head .eyeline,#page-2 .function-ending .eyeline{color:var(--neutral)!important}
    #page-2 .function-steps b,#page-2 .function-steps i{background:transparent!important;color:var(--profile)!important}
    #page-2 .function-tabs button.selected{background:var(--profile-pale)!important;color:var(--profile)!important;box-shadow:inset 3px 0 0 var(--profile)!important}
    #page-2 .function-ending{background:var(--profile-pale)!important}
    #page-2 .pressure-intro,#page-2 .pressure-takeaway{background:color-mix(in srgb,${resultProfileColor[profileCode]} 8%,white)!important}
    #page-2 .pressure-intro{max-width:none!important;margin:32px 0 48px!important;padding:40px 44px!important;border-radius:24px!important}
    #page-2 .pressure-intro h3{margin:0 0 28px!important;max-width:820px!important}
    #page-2 .pressure-intro p{max-width:900px!important;margin:0 0 22px!important;line-height:1.85!important}
    #page-2 .pressure-intro p:last-child{margin-bottom:0!important}
    #page-2 .pressure-profile-badge{display:inline-flex;align-items:center;gap:9px;margin:0 0 18px;padding:8px 12px;border-radius:999px;background:${resultProfileColor[profileCode]};color:var(--profile-ink);font-size:12px;font-weight:750;letter-spacing:.055em;text-transform:uppercase}
    #page-2 .function-overline,#page-2 .function-example span,#page-2 .pressure-plus{color:var(--neutral)!important}
    #page-3{--fd-red:var(--profile)!important;--fd-pale:var(--profile-pale)!important}
    #page-3 .fd-stage{background:var(--neutral-pale)!important}
    #page-3 .fd-feature .section-label,
    #page-3 .fd-row-num,#page-3 .fd-row-number,#page-3 .fd-index,#page-3 .fd-number{color:var(--neutral)!important}
    #page-3 .eyeline,#page-3 .fd-eyebrow,#page-3 .fd-overline,#page-3 .fd-dark,#page-3 .fd-content .fd-overline,#page-3 .fd-example span{color:var(--neutral)!important}
    #page-3 .fd-example{border-left-color:var(--neutral)!important}
    #page-3 .fd-row:hover,#page-3 .fd-row[open],#page-3 .fd-row[aria-expanded="true"]{background:var(--profile-pale)!important}
    #page-3 .fd-row[open] .fd-plus{background:var(--neutral-pale)!important;color:var(--neutral-dark)!important}
    #page-3 .fd-mark{background:var(--profile)!important}
    #page-3 .fd-tab[aria-selected="true"],#page-3 [data-fd-tab][aria-selected="true"]{border-color:var(--profile)!important}
    #page-4 .relation-feature-copy{background:var(--neutral-pale)!important}
    #page-4 .relation-overline{color:var(--neutral)!important}
    #page-4 .relation-feature-art{background:var(--profile-pale)!important}
    #page-4 .relation-orbit,#page-4 .relation-orbit:before{border-color:var(--profile-soft)!important}
    #page-4 .relation-center{background:var(--profile)!important}
    #page-4 .relation-satellite{border-color:var(--profile)!important}
    #page-4 .relation-index,#page-4 .relation-key strong{color:var(--profile)!important}
    #page-4 .relation-practice>div:last-child{background:var(--profile-pale)!important}
    #page-6{--grow-red:var(--profile)!important;--grow-pale:var(--profile-pale)!important}
    #page-6 .grow-choice.selected{background:var(--profile-pale)!important;box-shadow:inset 3px 0 0 var(--profile)!important}
    #page-6 .grow-eyebrow,#page-6 .grow-detail-eyebrow,#page-6 .grow-test span,#page-6 .grow-test strong,#page-6 .grow-question span{color:var(--neutral)!important}
    #page-6 .grow-test{border-left-color:var(--neutral)!important}
    #page-6 .grow-art-caption{color:var(--neutral)!important}
    #page-6 .grow-path{background:linear-gradient(90deg,var(--profile-soft),var(--profile))!important}
    #page-6 .grow-point.a{background:color-mix(in srgb,var(--profile) 28%,white)!important}
    #page-6 .grow-point.b{background:color-mix(in srgb,var(--profile) 48%,white)!important}
    #page-6 .grow-point.c{background:color-mix(in srgb,var(--profile) 72%,white)!important}
    #page-1 .shape{fill-opacity:.13!important}
    #page-1 .identity-signature-word{display:flex;align-items:baseline;margin:8px 0 0;font-family:var(--results-font);font-size:var(--results-h3-size);font-weight:600;line-height:var(--results-h3-line-height);letter-spacing:-.025em}
    #page-1 .identity-signature-word span:nth-child(1){color:var(--results-analyste)}
    #page-1 .identity-signature-word span:nth-child(2){color:var(--results-facilitateur)}
    #page-1 .identity-signature-word span:nth-child(3){color:var(--results-communiquant)}
    #page-1 .identity-signature-word span:nth-child(4){color:var(--results-conquerant)}
    #page-1 .identity-signature-word span:nth-child(5){color:#202124}
    .nav button.active{background:#1d1d1f!important}
    .nav-wrap.has-pdf-action{position:sticky!important}
    .mobile-nav-toggle{display:none}
    .nav-wrap.has-pdf-action .nav{padding-right:112px!important}
    .nav{gap:4px!important}
    .nav button{padding-inline:10px!important;font-size:13px!important;white-space:nowrap!important}
    .pdf-download-action{position:absolute;top:10px;right:max(14px,calc((100vw - 1190px)/2 + 20px));display:inline-flex;width:78px;min-height:44px;align-items:center;justify-content:center;gap:7px;padding:0 12px;border:1px solid #d8e4e5;border-radius:999px;background:#f4f9f9;color:#176f78;font-size:11px;font-weight:780;letter-spacing:.06em;white-space:nowrap;cursor:pointer;box-shadow:none;transition:transform .18s ease,background .18s ease,border-color .18s ease}
    .pdf-download-action:hover{border-color:#9dc1c5;background:#e8f3f4;transform:translateY(-1px)}
    .pdf-download-action:disabled{cursor:wait;opacity:.68;transform:none}
    .pdf-download-action .pdf-download-icon{font-size:17px;line-height:1}
    .pdf-download-status{position:absolute;right:max(18px,calc((100vw - 1190px)/2 + 20px));top:59px;max-width:230px;margin:0;color:#a63d35;font-size:11px;font-weight:650;text-align:right}
    .pressure-kicker{color:var(--neutral)!important}
    .pressure-number,.pressure-tip-index{color:${resultProfileColor[profileCode]}!important}
    .pressure-takeaway{border-left-color:${resultProfileColor[profileCode]}!important}
    #page-7{--br:var(--profile)!important}
    #page-7 .bible-label,#page-7 .bible-copy>span,#page-7 .bible-chapter>span,#page-7 .bible-gallery span{color:var(--profile)!important}
    #page-7 .bible-feature,#page-7 .bible-menu button.chosen,#page-7 .bible-menu button[aria-selected="true"]{background:var(--profile-pale)!important}
    #page-7 .bible-figure:before{background:var(--profile-soft)!important}
    #page-7 .bible-menu button.chosen,#page-7 .bible-menu button[aria-selected="true"]{border-color:var(--profile-soft)!important}
    #page-7 .bible-detail>small,#page-7 .bible-detail strong,#page-7 .bible-menu button{color:var(--profile)!important}
    #page-7 .bible-feature{display:grid!important;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr)!important;min-height:395px!important;overflow:hidden!important}
    #page-7 .bible-copy,#page-7 .bible-figure,#page-7 .bible-reader>*{min-width:0!important}
    #page-7 .bible-copy p,#page-7 .bible-explain p{font-size:17px!important;line-height:1.78!important}
    #page-7 .bible-explain{padding:42px 0!important}
    #page-7 .bible-explain p{max-width:900px!important}
    #page-7 .bible-chapter{padding-bottom:28px!important}
    #page-7 .bible-chapter>p{font-size:16px!important;line-height:1.7!important}
    #page-7 .bible-reader{display:grid!important;grid-template-columns:minmax(300px,.72fr) minmax(0,1.28fr)!important;gap:28px!important;align-items:start!important}
    #page-7 .bible-menu{display:flex!important;flex-direction:column!important;gap:8px!important;position:sticky!important;top:86px!important}
    #page-7 .bible-menu button{width:100%!important;min-width:0!important;min-height:88px!important;padding:16px 18px!important;grid-template-columns:28px minmax(0,1fr)!important;grid-template-rows:auto auto!important;gap:5px 10px!important;align-content:center!important;border:1px solid #e8e8ec!important;border-radius:15px!important;text-align:left!important}
    #page-7 .bible-menu button.chosen,#page-7 .bible-menu button[aria-selected="true"]{box-shadow:inset 3px 0 0 var(--profile)!important}
    #page-7 .bible-menu strong{font-size:15px!important;line-height:1.3!important;color:#29292d!important}
    #page-7 .bible-menu small{grid-column:2!important;font-size:12px!important;line-height:1.4!important;font-weight:400!important;letter-spacing:0!important;color:#707077!important;text-align:left!important}
    #page-7 .bible-reference-links{display:flex;flex-wrap:wrap;gap:7px 10px;align-items:center;color:var(--profile)!important;font-size:15px;font-weight:400;letter-spacing:0}
    #page-7 .bible-detail{min-height:620px!important;padding:42px 46px!important;border:1px solid #ececf0!important;background:#f8f8fa!important}
    #page-7 .bible-detail h3{margin-top:22px!important;font-size:clamp(28px,3vw,38px)!important;line-height:1.15!important}
    #page-7 .bible-detail>p,#page-7 .bible-detail>div p{font-size:16.5px!important;line-height:1.76!important;color:#56565e!important;white-space:pre-line}
    #page-7 .bible-detail>div>strong{display:block!important;margin-top:30px!important;padding-top:26px!important;border-top:1px solid #dedee4!important;font-size:11px!important;letter-spacing:.11em!important}
    #page-7 .bible-detail>div>strong:first-child{margin-top:10px!important}
    #page-7 .bible-quote{display:grid!important;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr)!important;gap:38px!important;align-items:start!important;margin-top:52px!important;padding:42px 44px!important;border:1px solid var(--profile-soft)!important;border-top:4px solid var(--profile)!important;border-radius:24px!important;background:var(--profile-pale)!important;color:#242429!important}
    #page-7 .bible-quote[data-has-highlight="false"]{grid-template-columns:minmax(0,860px)!important}
    #page-7 .bible-closing-copy>span{display:inline-flex!important;margin-bottom:14px!important;padding:7px 10px!important;border-radius:999px!important;background:#fff!important;color:var(--profile)!important;font-size:10px!important;font-weight:780!important;letter-spacing:.13em!important}
    #page-7 .bible-closing-copy h2{margin:0 0 22px!important;color:#202024!important;font-size:clamp(28px,3vw,38px)!important;line-height:1.12!important;letter-spacing:-.045em!important}
    #page-7 .bible-closing-copy p{max-width:780px!important;margin:0 0 15px!important;color:#55555d!important;font-size:16px!important;line-height:1.76!important}
    #page-7 .bible-closing-copy p:last-child{margin-bottom:0!important}
    #page-7 .bible-question{align-self:stretch!important;margin:0!important;padding:26px 27px!important;border:0!important;border-radius:18px!important;background:#fff!important;color:#29292e!important;font-size:19px!important;font-weight:680!important;line-height:1.52!important;box-shadow:0 12px 34px rgba(25,28,35,.055)!important}
    #page-7 .bible-question:before{content:"L’ESSENTIEL";display:block;margin-bottom:15px;color:var(--profile);font-size:10px;font-weight:800;letter-spacing:.13em}
    #page-7 .bible-gallery{display:block!important;margin-top:72px!important;padding:clamp(38px,5vw,76px)!important;border-radius:32px!important;background:#f5f5f7!important;color:#202124!important}
    #page-7 .bible-gallery p{font-size:17px!important;line-height:1.72!important}
    #page-7 .bible-note{font-size:14px!important;line-height:1.75!important}
    #page-7 .bible-reference-links a{display:inline-flex;min-height:44px;align-items:center;color:inherit;text-decoration:none;border-bottom:1px solid color-mix(in srgb,var(--profile) 45%,transparent);padding:8px 0}
    #page-7 .bible-reference-links a:hover,#page-7 .bible-reference-links a:focus-visible{border-bottom-color:var(--profile)}
    #page-7 .bible-top{max-width:1120px!important;padding:78px 24px 58px!important}
    #page-7 .bible-top h1{margin:18px 0 30px!important;font-size:clamp(35px,4.2vw,54px)!important;font-weight:650!important;line-height:1.06!important;letter-spacing:-.055em!important}
    #page-7 .bible-hero-name-line{display:block;margin-top:3px}
    #page-7 .bible-top h1 em{display:inline;color:var(--profile)!important;font-size:.96em;font-style:normal!important;font-weight:690!important}
    #page-7 .bible-hero-suffix{color:#1d1d1f!important;font-size:.96em;font-weight:690!important}
    #page-7 .bible-top p{max-width:760px!important;margin:0 auto!important;color:#66666d!important;font-size:clamp(16.5px,1.35vw,19px)!important;line-height:1.78!important;text-align:left!important}
    #page-7 .bible-top p strong{color:#303036!important;font-weight:720!important}
    #page-7 .bible-copy b{background:var(--profile)!important}
    #page-7 .bible-top p,#page-7 .bible-copy p,#page-7 .bible-detail>p,#page-7 .bible-closing p{white-space:pre-line}
    #page-7 .bible-characteristic{display:block;margin-bottom:9px;color:var(--profile);font-size:11px;font-weight:760;letter-spacing:.12em;text-transform:uppercase}
    #page-7 .bible-closing{margin-top:48px;padding:38px 42px;border-radius:24px;background:var(--profile-pale)}
    #page-7 .bible-closing h2{margin:0 0 16px;font-size:clamp(24px,2.8vw,34px);line-height:1.16;letter-spacing:-.045em}
    #page-7 .bible-closing p{max-width:900px;margin:0;color:#55555d;font-size:17px;line-height:1.82}
    #page-7 .bible-closing p+p{margin-top:15px}
    #page-7 .bible-closing-highlight{margin-top:24px!important;padding-top:22px;border-top:1px solid var(--profile-soft);color:#252529!important;font-weight:680}
    #page-7 .bible-scripture-quote{margin:26px 0;padding:27px 29px;border-left:4px solid var(--profile);border-radius:0 18px 18px 0;background:var(--profile-pale)}
    #page-7 .bible-scripture-quote blockquote{margin:17px 0 14px;color:#34343a;font-size:15px;line-height:1.82}
    #page-7 .bible-scripture-quote cite{display:block;color:#6c6c73;font-size:12px;font-style:normal}
    #page-7 .bible-scripture-followup{margin-top:18px!important}
    #page-7 .bible-jesus-head{max-width:780px;margin:0 0 42px;text-align:left}
    #page-7 .bible-jesus-head>span{display:block;color:#77777f!important;font-size:10px;font-weight:780;letter-spacing:.16em}
    #page-7 .bible-jesus-head h2{display:flex;max-width:780px;margin:13px 0 10px;align-items:center;gap:14px;font-size:clamp(34px,3.7vw,48px);font-weight:650;line-height:1.04;letter-spacing:-.05em}
    #page-7 .bible-four-color-mark{display:inline-flex;height:30px;flex:none;align-items:flex-end;gap:3px}
    #page-7 .bible-four-color-mark i{display:block;width:6px;border-radius:999px}
    #page-7 .bible-four-color-mark i{height:100%}
    #page-7 .bible-jesus-head h3{margin:0;color:#67676f;font-size:clamp(17px,1.65vw,20px);font-weight:500}
    #page-7 .bible-jesus-copy{max-width:820px;margin:0}
    #page-7 .bible-jesus-copy p{margin:0 0 18px;color:#4f4f57;font-size:17px!important;line-height:1.72!important}
    #page-7 .bible-jesus-quote{max-width:920px;margin:46px auto 28px;padding:42px 46px;border:1px solid #e2e2e7;border-radius:24px;background:#fff;text-align:center;box-shadow:0 18px 50px rgba(25,25,30,.045)}
    #page-7 .bible-jesus-quote blockquote{max-width:720px;margin:18px auto;color:#242428;font-size:clamp(16px,1.3vw,20px)!important;font-weight:480!important;line-height:1.56!important;letter-spacing:-.008em}
    #page-7 .bible-jesus-quote cite{display:block;color:#6a6a72;font-size:13px;font-style:normal}
    #page-7 .bible-jesus-bridge{max-width:760px;margin:28px auto 34px!important;color:#3c3c42!important;font-size:18px!important;font-weight:560;text-align:center}
    #page-7 .bible-jesus-final{max-width:760px;margin:0 auto;padding:34px 38px;border-radius:22px;background:#202124;color:#fff;text-align:center}
    #page-7 .bible-jesus-final .bible-reference-links{justify-content:center;color:#d5d5da!important}
    #page-7 .bible-jesus-final blockquote{max-width:680px;margin:18px auto;color:#fff;font-size:clamp(16px,1.35vw,21px)!important;font-weight:500!important;line-height:1.52!important;letter-spacing:-.008em}
    #page-7 .bible-jesus-final cite{color:#bdbdc4;font-size:13px;font-style:normal}
    #page-7 .bible-journey-navigation{margin-top:64px;padding-top:42px;border-top:1px solid #dddde2}
    #page-7 .bible-journey-navigation h3{margin:0 0 10px;font-size:clamp(26px,3vw,38px);letter-spacing:-.04em}
    #page-7 .bible-journey-navigation>p{max-width:760px;margin:0;color:#66666e;font-size:16px!important}
    #page-7 .bible-journey-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-top:28px}
    #page-7 .bible-journey-card{overflow:hidden;padding:0;border:1px solid #e1e1e5;border-top:4px solid var(--journey-color);border-radius:18px;background:#fff;text-align:left;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease}
    #page-7 .bible-journey-card:hover{transform:translateY(-3px);box-shadow:0 14px 32px rgba(25,25,30,.08)}
    #page-7 .bible-journey-card img{display:block;width:100%;aspect-ratio:1.15;object-fit:cover;object-position:top}
    #page-7 .bible-journey-card div{padding:16px}
    #page-7 .bible-journey-card strong{display:block;color:#222226;font-size:17px}
    #page-7 .bible-journey-card small{display:block;margin-top:5px;color:#6b6b72;font-size:13px;line-height:1.4}
    #page-7 .bible-journey-card[data-current="true"]{box-shadow:inset 0 0 0 2px var(--journey-color)}
    :is(#page-2,#page-3,#page-4,#page-6,#page-7) :is(.eyeline,.section-label,.function-overline,.fd-eyebrow,.fd-overline,.relation-overline,.grow-eyebrow,.grow-detail-eyebrow,.bible-label,.bible-characteristic){display:inline-flex!important;width:fit-content!important;padding:6px 9px 5px!important;border-radius:999px!important;background:var(--profile)!important;color:var(--profile-ink)!important;line-height:1.2!important}
    #page-7 .bible-closing-copy>span{background:var(--profile)!important;color:var(--profile-ink)!important}
    .nav button:focus-visible,button:focus-visible,.score:focus-visible{outline-color:var(--neutral)!important}
    @media(max-width:1100px){.nav-wrap.has-pdf-action .nav{padding-right:82px!important;overflow-x:auto!important}.nav button{flex:0 0 auto!important}.pdf-download-action{top:9px;right:12px;width:48px;min-height:44px;padding:0;border-color:#d8e4e5;background:#f4f9f9}.pdf-download-action .pdf-download-label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}.pdf-download-status{right:12px;top:58px;max-width:210px}}
    @media(max-width:650px){.nav-wrap.has-pdf-action{min-height:64px;background:rgba(255,255,255,.97)!important}.mobile-nav-toggle{position:absolute;z-index:2;top:10px;left:12px;display:inline-flex;min-width:92px;min-height:44px;padding:0 14px;align-items:center;justify-content:center;gap:9px;border:1px solid #dedee3;border-radius:999px;background:#fff;color:#242428;font-size:12px;font-weight:760;cursor:pointer}.mobile-nav-toggle-icon{position:relative;display:block;width:17px;height:12px;border-top:2px solid currentColor;border-bottom:2px solid currentColor}.mobile-nav-toggle-icon:after{content:"";position:absolute;top:4px;left:0;width:17px;border-top:2px solid currentColor}.nav-wrap.has-pdf-action .nav{display:none!important;padding:68px 12px 12px!important;flex-direction:column!important;align-items:stretch!important;gap:5px!important;overflow:visible!important}.nav-wrap.mobile-nav-open .nav{display:flex!important}.nav-wrap.mobile-nav-open{box-shadow:0 18px 42px rgba(20,25,30,.12)}.nav-wrap.mobile-nav-open .nav button{width:100%!important;min-height:48px!important;padding:12px 15px!important;text-align:left!important;border:1px solid #ececef!important;border-radius:12px!important;background:#fff!important;color:#404047!important}.nav-wrap.mobile-nav-open .nav button.active{border-color:#1d1d1f!important;background:#1d1d1f!important;color:#fff!important}.pdf-download-action{z-index:2;top:10px!important;right:12px!important;width:auto!important;min-width:154px!important;padding:0 15px!important;letter-spacing:0!important}.pdf-download-action .pdf-download-label{position:static!important;width:auto!important;height:auto!important;overflow:visible!important;clip:auto!important;font-size:0!important;white-space:nowrap!important}.pdf-download-action .pdf-download-label:after{content:"Télécharger PDF";font-size:12px}.pdf-download-status{top:62px!important;right:12px!important;max-width:calc(100vw - 24px)!important}}
    @media(max-width:950px){#page-7 .bible-feature{display:flex!important;flex-direction:column-reverse!important}#page-7 .bible-reader{grid-template-columns:1fr!important}#page-7 .bible-menu{position:static!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important}#page-7 .bible-detail{padding:38px 34px!important}#page-7 .bible-quote{grid-template-columns:1fr!important;gap:24px!important}#page-7 .bible-journey-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:650px){#page-2 .pressure-intro{padding:28px 24px!important;margin:26px 0 38px!important}#page-2 .pressure-intro h3{margin-bottom:22px!important}#page-2 .pressure-intro p{margin-bottom:18px!important}#page-7 .bible-top{padding:50px 18px 38px!important}#page-7 .bible-top h1{font-size:35px!important;line-height:1.08!important}#page-7 .bible-top p{font-size:17px!important;line-height:1.68!important}#page-7 .bible-copy{padding:30px 24px!important}#page-7 .bible-copy p,#page-7 .bible-explain p,#page-7 .bible-detail>p,#page-7 .bible-detail>div p,#page-7 .bible-closing p{font-size:16px!important;line-height:1.72!important}#page-7 .bible-scripture-quote{padding:23px 21px}#page-7 .bible-reference-links{font-size:14px;line-height:1.65}#page-7 .bible-menu{display:flex!important;flex-direction:row!important;overflow-x:auto!important;scroll-snap-type:x mandatory!important;padding-bottom:8px!important}#page-7 .bible-menu button{flex:0 0 82%!important;scroll-snap-align:start;min-height:82px!important;padding:15px 16px!important;border-radius:14px!important}#page-7 .bible-menu strong{font-size:15px!important}#page-7 .bible-menu small{font-size:12px!important}#page-7 .bible-detail{padding:30px 22px!important;border-radius:18px!important}#page-7 .bible-detail h3{font-size:27px!important}#page-7 .bible-gallery{padding:36px 20px!important;border-radius:22px!important}#page-7 .bible-jesus-head{text-align:left}#page-7 .bible-jesus-head h2{gap:10px}#page-7 .bible-four-color-mark{height:23px;gap:2px}#page-7 .bible-four-color-mark i{width:5px}#page-7 .bible-jesus-quote{padding:30px 22px!important;text-align:left}#page-7 .bible-jesus-quote blockquote,#page-7 .bible-jesus-final blockquote{font-size:16px!important;font-weight:480!important;line-height:1.56!important}#page-7 .bible-jesus-bridge{text-align:left}#page-7 .bible-jesus-final{padding:28px 22px!important;text-align:left}#page-7 .bible-jesus-final .bible-reference-links{justify-content:flex-start}#page-7 .bible-journey-grid{grid-template-columns:1fr 1fr;gap:9px}#page-7 .bible-journey-card div{padding:12px}}
    @media(max-width:650px){#page-7 .bible-top h1{font-size:33px!important}}
    @media(max-width:390px){#page-7 .bible-journey-grid{grid-template-columns:1fr!important}#page-7 .bible-journey-card img{aspect-ratio:1.8!important;object-position:center 18%!important}}
  `;

  const navWrap = doc.querySelector<HTMLElement>(".nav-wrap");
  if (navWrap && !navWrap.querySelector(".pdf-download-action")) {
    navWrap.classList.add("has-pdf-action");
    const navigation = navWrap.querySelector<HTMLElement>(".nav");
    if (navigation) {
      navigation.id = "result-mobile-navigation";
      const menuToggle = doc.createElement("button");
      menuToggle.type = "button";
      menuToggle.className = "mobile-nav-toggle";
      menuToggle.setAttribute("aria-controls", navigation.id);
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Ouvrir le menu des résultats");
      const menuIcon = doc.createElement("span");
      menuIcon.className = "mobile-nav-toggle-icon";
      menuIcon.setAttribute("aria-hidden", "true");
      const menuLabel = doc.createElement("span");
      menuLabel.textContent = "Menu";
      menuToggle.append(menuIcon, menuLabel);
      menuToggle.addEventListener("click", () => {
        const open = navWrap.classList.toggle("mobile-nav-open");
        menuToggle.setAttribute("aria-expanded", String(open));
        menuToggle.setAttribute("aria-label", open ? "Fermer le menu des résultats" : "Ouvrir le menu des résultats");
      });
      navigation.querySelectorAll("button[data-page]").forEach(button => button.addEventListener("click", () => {
        navWrap.classList.remove("mobile-nav-open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Ouvrir le menu des résultats");
      }));
      navWrap.prepend(menuToggle);
    }
    const download = doc.createElement("button");
    download.type = "button";
    download.className = "pdf-download-action";
    download.setAttribute("aria-label", isPreview ? "Télécharger mon profil en PDF, preview draft" : "Télécharger mon profil en PDF");
    const icon = doc.createElement("span");
    icon.className = "pdf-download-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "⇩";
    const label = doc.createElement("span");
    label.className = "pdf-download-label";
    label.textContent = "PDF";
    const status = doc.createElement("p");
    status.className = "pdf-download-status";
    status.setAttribute("role", "status");
    status.hidden = true;
    download.append(icon, label);
    download.addEventListener("click", async () => {
      download.disabled = true;
      label.textContent = "…";
      status.hidden = true;
      try {
        const response = await fetch(pdfUrl, { cache: "no-store" });
        if (!response.ok) throw new Error("Le livret n’a pas pu être généré.");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = doc.createElement("a");
        anchor.href = url;
        anchor.download = isPreview ? "profil-mapp-livret-preview.pdf" : "profil-mapp.pdf";
        doc.body.append(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      } catch (cause) {
        status.textContent = cause instanceof Error ? cause.message : "Le téléchargement a échoué. Réessaie dans quelques instants.";
        status.hidden = false;
      } finally {
        download.disabled = false;
        label.textContent = "PDF";
      }
    });
    navWrap.append(download, status);
  }

  // 01: identity: same DOM and radar as the validated Conquérant reference.
  const identity = profile.pages["01_identite"];
  setText(doc, "#page-1 .hero h1", "Ton profil unique.");
  setText(doc, "#page-1 .hero p", identity.subtitle);
  const scorePanel = doc.querySelector<HTMLElement>("#page-1 .panel.red");
  if (scorePanel) scorePanel.dataset.profile = profileCode;
  const rows = doc.querySelectorAll<HTMLElement>("#page-1 .score");
  setText(doc, "#page-1 .panel.red .lead", "Cette répartition relative compare tes quatre tendances et totalise toujours 100 %.");
  setText(doc, "#page-1 .radar-head h2", "La signature de ton profil");
  doc.querySelector("#page-1 .radar-head p")?.remove();
  doc.querySelector("#page-1 .identity-signature-word")?.remove();
  const signatureHeading = doc.querySelector<HTMLElement>("#page-1 .radar-head h2");
  if (signatureHeading) {
    const signature = doc.createElement("div");
    signature.className = "identity-signature-word";
    signature.setAttribute("aria-label", "mapp.");
    for (const letter of "mapp.") {
      const glyph = doc.createElement("span");
      glyph.setAttribute("aria-hidden", "true");
      glyph.textContent = letter;
      signature.append(glyph);
    }
    signatureHeading.insertAdjacentElement("afterend", signature);
  }
  doc.querySelector("#page-1 .panel.grey .note")?.remove();
  const scoreDescriptions = Object.fromEntries(dimensionOrder.map((code, index) => [code, rows[index]?.querySelector("small")?.textContent ?? ""])) as Record<PreviewProfileCode, string>;
  scoreOrder.forEach((code, index) => {
    const row = rows[index]; if (!row) return;
    setText(row, "strong", profileLabels[code]);
    setText(row, "small", scoreDescriptions[code]);
    setText(row, ".value", `${formatRelativePercentage(normalized[code])} %`);
    row.dataset.color = resultProfileColor[code];
    row.dataset.profile = code;
    row.dataset.idx = String(dimensionOrder.indexOf(code));
    row.setAttribute("aria-label", `${profileLabels[code]}, ${formatRelativePercentage(normalized[code])} %, ${scoreDescriptions[code]}`);
    const label = row.querySelector("strong");
    if (label && code !== profileCode) {
      const marker = doc.createElement("span");
      marker.className = "identity-profile-marker";
      marker.style.setProperty("--marker-color", resultProfileColor[code]);
      marker.setAttribute("aria-hidden", "true");
      label.prepend(marker);
    }
  });
  const chartPanel = doc.querySelector<HTMLElement>("#page-1 .panel.grey");
  const chartHead = chartPanel?.querySelector<HTMLElement>(".radar-head");
  const radar = chartPanel?.querySelector<SVGElement>(".radar");
  const chartSwitch = doc.createElement("div");
  chartSwitch.className = "identity-chart-switch";
  chartSwitch.setAttribute("role", "group");
  chartSwitch.setAttribute("aria-label", "Type de graphique");
  const bars = doc.createElement("div");
  bars.className = "identity-bars";
  bars.setAttribute("role", "group");
  bars.setAttribute("aria-label", "Répartition des quatre tendances en bâtons verticaux");
  bars.hidden = true;
  const barButtons = new Map<PreviewProfileCode, HTMLButtonElement>();
  const biblicalBarOrder: { code: PreviewProfileCode; firstName: string }[] = [
    { code: "analyste", firstName: "Moïse" },
    { code: "facilitateur", firstName: "Abraham" },
    { code: "communiquant", firstName: "Pierre" },
    { code: "conquerant", firstName: "Paul" },
  ];
  biblicalBarOrder.forEach(({ code, firstName }) => {
    const button = doc.createElement("button");
    button.type = "button";
    button.className = "identity-bar";
    button.dataset.profile = code;
    button.style.setProperty("--bar-color", resultProfileColor[code]);
    button.setAttribute("aria-label", `${firstName}, ${profileLabels[code]} : ${formatRelativePercentage(normalized[code])} %`);
    button.setAttribute("aria-pressed", "false");
    const value = doc.createElement("span"); value.className = "identity-bar-value"; value.textContent = `${formatRelativePercentage(normalized[code])} %`;
    const track = doc.createElement("span"); track.className = "identity-bar-track";
    const fill = doc.createElement("span"); fill.className = "identity-bar-fill"; fill.style.height = `${Math.max(0, Math.min(100, scores[code]))}%`;
    track.append(fill);
    const name = doc.createElement("span"); name.className = "identity-bar-name"; name.textContent = firstName;
    const profileName = doc.createElement("span"); profileName.className = "identity-bar-profile"; profileName.textContent = profileLabels[code];
    button.append(value, track, name, profileName);
    bars.append(button);
    barButtons.set(code, button);
  });
  if (chartHead && radar && chartPanel) {
    for (const mode of ["Radar", "Bâtons"] as const) {
      const button = doc.createElement("button");
      button.type = "button";
      button.textContent = mode;
      button.setAttribute("aria-pressed", String(mode === "Radar"));
      button.addEventListener("click", () => {
        const showRadar = mode === "Radar";
        if (showRadar) radar.removeAttribute("hidden"); else radar.setAttribute("hidden", "");
        bars.hidden = showRadar;
        chartSwitch.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      });
      chartSwitch.append(button);
    }
    chartHead.append(chartSwitch);
    radar.after(bars);
  }
  const scale = 1.28;
  const points = `0,${-scores.conquerant * scale} ${scores.communiquant * scale},0 0,${scores.analyste * scale} ${-scores.facilitateur * scale},0`;
  doc.querySelector<SVGPolygonElement>("#page-1 #shape")?.setAttribute("points", points);
  const dots = doc.querySelectorAll<SVGCircleElement>("#page-1 .dot");
  [[0,-scores.conquerant*scale],[scores.communiquant*scale,0],[0,scores.analyste*scale],[-scores.facilitateur*scale,0]].forEach(([x,y],i)=>{dots[i]?.setAttribute("cx",String(x));dots[i]?.setAttribute("cy",String(y));});
  doc.querySelector<HTMLElement>("#page-1 [aria-label^='Radar :']")?.setAttribute(
    "aria-label",
    `Radar : Conquérant ${scores.conquerant} sur 100, Communiquant ${scores.communiquant}, Analyste ${scores.analyste}, Facilitateur ${scores.facilitateur}`,
  );
  const shape = doc.querySelector<SVGPolygonElement>("#page-1 #shape");
  shape?.style.setProperty("--accent", color);
  dots.forEach((dot, index) => dot.style.setProperty("--accent", resultProfileColor[dimensionOrder[index]]));
  let pinnedCode: PreviewProfileCode | null = null;
  const highlight = (code: PreviewProfileCode | null) => {
    shape?.style.setProperty("--accent", code ? resultProfileColor[code] : color);
    dots.forEach((dot, dotIndex) => dot.setAttribute("r", String(code && dimensionOrder[dotIndex] === code ? 7 : 4)));
    barButtons.forEach((button, barCode) => {
      button.dataset.active = String(barCode === code);
      button.setAttribute("aria-pressed", String(barCode === pinnedCode));
    });
  };
  rows.forEach((row, index) => {
    const code = scoreOrder[index];
    const activate = () => highlight(code);
    const restore = () => highlight(pinnedCode);
    const pin = () => { pinnedCode = pinnedCode === code ? null : code; highlight(pinnedCode); };
    row.addEventListener("mouseenter", activate);
    row.addEventListener("focus", activate);
    row.addEventListener("click", pin);
    row.addEventListener("mouseleave", restore);
    row.addEventListener("blur", restore);
    const bar = barButtons.get(code);
    bar?.addEventListener("mouseenter", activate);
    bar?.addEventListener("focus", activate);
    bar?.addEventListener("click", pin);
    bar?.addEventListener("mouseleave", restore);
    bar?.addEventListener("blur", restore);
  });
  doc.querySelector("#page-1 .editorial")?.replaceWith(
    createIdentityProfileSection(doc, profileCode, "primary"),
    createIdentityProfileSection(doc, secondaryCode, "secondary"),
  );
  if (combination) {
    setText(doc, "#page-1 .combination-copy h2", combination.pages["01_identite"].heading);
    setParagraphs(doc, "#page-1 .combination-copy p", [combination.pages["01_identite"].summary, combination.pages["01_identite"].watchpoint]);
    setText(doc, "#page-1 .combination-copy small", `L’ordre compte : ${profile.name} avec ${secondary.name} est différent de ${secondary.name} avec ${profile.name}.`);
    setText(doc, "#page-1 .combination-visual > strong", `${profile.name} × ${secondary.name}.`);
    const symbols = doc.querySelectorAll<HTMLElement>("#page-1 .combination-symbols b");
    if (symbols[0]) symbols[0].textContent = profile.name.slice(0,2);
    if (symbols[1]) { symbols[1].textContent = secondary.name.slice(0,2); symbols[1].style.background = secondary.color; }
  }

  // 02: functioning and the independently selected pressure reading.
  const functioning = profile.pages["02_fonctionnement"];
  setText(doc, "#page-2 .function-intro h1", functioning.title);
  setText(doc, "#page-2 .function-intro p", combination?.pages["02_fonctionnement"].intro ?? functioning.intro);
  setText(doc, "#page-2 .function-feature-copy h2", functioning.feature);
  setParagraphs(doc, "#page-2 .function-feature-copy p", [functioning.intro, combination?.pages["02_fonctionnement"].intro ?? functioning.intro]);
  setText(doc, "#page-2 .function-feature-visual footer", `${profile.name} + ${secondary.name}`);
  const dimensionTabs = doc.querySelectorAll<HTMLButtonElement>("#page-2 .function-tabs button");
  const renderDimension = (index: number) => {
    const item = functioning.dimensions[index]; if (!item) return;
    dimensionTabs.forEach((tab, tabIndex) => { tab.classList.toggle("selected", tabIndex === index); tab.setAttribute("aria-selected", String(tabIndex === index)); });
    setText(doc, "#dimension-number", `${String(index + 1).padStart(2,"0")} / 05`);
    setText(doc, "#dimension-title", item.heading);
    setText(doc, "#dimension-text", item.explanation);
    setText(doc, "#dimension-example", item.example);
    setText(doc, "#dimension-advice", item.perspective);
  };
  dimensionTabs.forEach((tab,index)=>{ setText(tab, ":scope", `${String(index+1).padStart(2,"0")} ${functioning.dimensions[index]?.title ?? ""} ↗`); tab.addEventListener("click",event=>{event.stopImmediatePropagation();renderDimension(index);},true); });
  renderDimension(0);
  hydratePressurePreview(doc, profileCode);

  // 03: exactly six strengths and six watchpoints in the existing accordions.
  const forces = profile.pages["03_forces_defis"];
  setText(doc, "#page-3 .fd-heading p", forces.intro);
  setText(doc, "#page-3 .fd-feature h2", forces.strengths[0].title);
  setText(doc, "#page-3 .fd-feature p", forces.strengths[0].body);
  const hydrateRows = (selector: string, items: readonly { title: string; body: string; example?: string; improvement?: string }[], watchpoints = false) => {
    doc.querySelectorAll<HTMLElement>(selector).forEach((row,index)=>{
      const item = items[index]; if (!item) return;
      setText(row,".fd-row-title",item.title); setText(row,".fd-answer p",item.body);
      const example = row.querySelector<HTMLElement>(".fd-example");
      if (example) example.innerHTML = `<span>${watchpoints ? "À essayer" : "Exemple concret"}</span>${watchpoints ? item.improvement ?? "" : item.example ?? ""}`;
    });
  };
  hydrateRows("#fd-strengths .fd-row", forces.strengths);
  hydrateRows("#fd-challenges .fd-row", forces.watchpoints, true);

  // 04: profile and oriented interaction content, preserving the reference composition.
  const relations = profile.pages["04_avec_les_autres"];
  setText(doc,"#page-4 .relation-head h1",relations.title);
  setText(doc,"#page-4 .relation-head p",relations.intro);
  setText(doc,"#page-4 .relation-overline",`${profile.name.toUpperCase()} + ${secondary.name.toUpperCase()}`);
  const relationCards = doc.querySelectorAll<HTMLElement>("#page-4 .relation-card");
  const relationContent = [relations.communication, relations.collaboration];
  relationCards.forEach((card,index)=>{const item=relationContent[index];if(!item)return;setText(card,"h3",item.title);setParagraphs(card,"p",item.paragraphs);});
  const interaction = source.orientedInteractions[`${profileCode}__${secondaryCode}` as keyof typeof source.orientedInteractions];
  if (interaction) {
    const copy = doc.querySelectorAll<HTMLElement>("#page-4 .relation-wide p");
    if(copy[0]) copy[0].textContent=interaction.whatHelps;
    if(copy[1]) copy[1].textContent=interaction.practicalTip;
  }

  // 05: five actions and three reflection questions.
  const growth = profile.pages["05_grandir"];
  setText(doc,"#page-6 .grow-head h1",growth.title);
  setText(doc,"#page-6 .grow-head p",growth.intro);
  setText(doc,"#page-6 .grow-feature-copy p",growth.intro);
  const growthRows=doc.querySelectorAll<HTMLElement>("#page-6 .grow-choice");
  const renderGrowth=(index:number)=>{const item=growth.actions[index];if(!item)return;setText(doc,"#page-6 .grow-detail h3",item.title);setText(doc,"#page-6 .grow-detail > p",item.body);setText(doc,"#page-6 .grow-test p",item.try);};
  growthRows.forEach((row,index)=>{const item=growth.actions[index];if(!item)return;const spans=row.querySelectorAll("span");if(spans[1])spans[1].textContent=item.title;row.addEventListener("click",event=>{event.stopImmediatePropagation();renderGrowth(index);},true);});
  renderGrowth(0);
  setParagraphs(doc,"#page-6 .grow-question p",growth.reflectionQuestions);
  doc.querySelector<HTMLElement>("#page-6 .grow-pressure")?.remove();

  // 06: the V10 source for the four complete biblical journeys.
  const originalBibleProfile = profileCode;
  const renderBibleProfile = (activeCode: PreviewProfileCode) => {
    const journey = biblicalV10.profiles[activeCode];
    const journeyColor = resultProfileColor[activeCode];
    const page = doc.querySelector<HTMLElement>("#page-7");
    if (!page) return;
    if (page.dataset.editorialSource !== "editorial-v10") {
      page.dataset.editorialSource = "editorial-v10";
      page.innerHTML = `
        <header class="bible-top"><div class="kicker">06 / Dans la Bible</div><h1></h1><p></p></header>
        <section class="bible-feature">
          <div class="bible-copy"><span></span><h2></h2><p></p><b></b></div>
          <div class="bible-figure"><img alt="" src=""></div>
        </section>
        <section class="bible-chapter"><span>SON PARCOURS</span><h2></h2><p></p></section>
        <section class="bible-reader">
          <nav class="bible-menu" aria-label="Étapes du parcours biblique">
            ${Array.from({ length: 6 }, (_, index) => `<button type="button" data-episode="${index}"><i>${String(index + 1).padStart(2, "0")}</i><strong></strong><small></small></button>`).join("")}
          </nav>
          <article class="bible-detail"><span class="bible-characteristic"></span><small></small><h3></h3><p></p><div class="bible-lesson"></div></article>
        </section>
        <section class="bible-quote"></section>
        <section class="bible-gallery"></section>
        <p class="bible-note"></p>
      `;
    }
    page?.style.setProperty("--profile", journeyColor);
    page?.setAttribute("data-editorial-source", "biblical-v10");
    setText(doc, "#page-7 .bible-top .kicker", "07 / Dans la Bible");
    page?.style.setProperty("--profile-pale", `color-mix(in srgb, ${journeyColor} 10%, white)`);
    page?.style.setProperty("--profile-soft", `color-mix(in srgb, ${journeyColor} 22%, white)`);

    const heroTitle = doc.querySelector<HTMLElement>("#page-7 .bible-top h1");
    if (heroTitle) {
      heroTitle.replaceChildren();
      heroTitle.append(doc.createTextNode(`Ton profil fait écho à celui ${activeCode === "facilitateur" ? "d’" : "de "}`));
      const figureName = doc.createElement("em");
      figureName.textContent = journey.biblicalFigure;
      heroTitle.append(figureName, doc.createTextNode("."));
    }
    const topIntro = doc.querySelector<HTMLElement>("#page-7 .bible-top p");
    if (topIntro) { renderHighlightedText(doc, topIntro, journey.whatYouMayHaveInCommon.text, []); topIntro.hidden = false; }
    setText(doc,"#page-7 .bible-copy h2",journey.episodes[0].title);
    setText(doc,"#page-7 .bible-copy p",journey.introduction);
    setText(doc,"#page-7 .bible-copy > span",`${journey.profileName.toUpperCase()} · ${journey.biblicalFigure.toUpperCase()}${isPreview ? " · PREVIEW DRAFT" : ""}`);
    setText(doc,"#page-7 .bible-copy b",journey.episodes.slice(1,4).map((episode: { characteristic: string }) => episode.characteristic).join(" · "));
    const figure = doc.querySelector<HTMLImageElement>("#page-7 .bible-figure img");
    const figureFile = activeCode === "conquerant" ? "paul" : activeCode === "communiquant" ? "pierre" : activeCode === "facilitateur" ? "abraham" : "moise";
    if(figure){figure.src=withMappBasePath(`/images/characters/${figureFile}.png`);figure.alt=journey.biblicalFigure;}

    setText(doc,"#page-7 .bible-chapter h2",`Le parcours de ${journey.biblicalFigure}`);
    setText(doc,"#page-7 .bible-chapter > p","Choisis une caractéristique pour lire l’histoire complète, ce qu’elle révèle du profil et ce que tu peux en apprendre.");

    const buttons = doc.querySelectorAll<HTMLButtonElement>("#page-7 .bible-menu button");
    const renderEpisode = (index: number) => {
      const episode = journey.episodes[index];
      if (!episode) return;
      buttons.forEach((button, buttonIndex) => {
        button.setAttribute("aria-selected", String(buttonIndex === index));
        button.classList.toggle("chosen", buttonIndex === index);
      });
      let characteristic = doc.querySelector<HTMLElement>("#page-7 .bible-characteristic");
      const reference = doc.querySelector<HTMLElement>("#page-7 .bible-detail > small");
      if (!characteristic && reference) {
        characteristic = doc.createElement("span");
        characteristic.className = "bible-characteristic";
        reference.before(characteristic);
      }
      if (characteristic) characteristic.textContent = episode.characteristic;
      if (reference) { reference.className = "bible-reference-links"; renderReferenceLinks(doc, reference, episode.references); }
      setText(doc,"#page-7 .bible-detail h3",episode.title);
      setText(doc,"#page-7 .bible-detail > p",episode.story);
      const detail = doc.querySelector<HTMLElement>("#page-7 .bible-detail > div");
      if (!detail) return;
      detail.replaceChildren();
      if (episode.scriptureQuote) {
        const quote = doc.createElement("aside");
        quote.className = "bible-scripture-quote";
        const quoteReference = doc.createElement("div");
        quoteReference.className = "bible-reference-links";
        const scriptureUrl = episode.scriptureQuote.fullPassageUrl ?? episode.scriptureQuote.youVersionUrl;
        if (scriptureUrl) {
          const anchor = doc.createElement("a");
          anchor.href = scriptureUrl;
          anchor.target = "_blank";
          anchor.rel = "noopener noreferrer";
          anchor.textContent = `${formatBibleReference(episode.scriptureQuote.reference)} ↗`;
          quoteReference.append(anchor);
        } else {
          renderReferenceLinks(doc, quoteReference, [episode.scriptureQuote.reference]);
        }
        const blockquote = doc.createElement("blockquote");
        blockquote.textContent = episode.scriptureQuote.text;
        const cite = doc.createElement("cite");
        cite.textContent = episode.scriptureQuote.translation;
        quote.append(quoteReference, blockquote, cite);
        detail.append(quote);
      }
      appendDetailSection(doc,detail,"CE QUE CELA RÉVÈLE DU PROFIL",episode.profileReading);
      appendDetailSection(doc,detail,"CE QUE TU PEUX APPRENDRE",episode.takeaway);
    };
    buttons.forEach((button,index) => {
      const episode = journey.episodes[index];
      if (!episode) return;
      setText(button,"strong",episode.characteristic);
      setText(button,"small",episode.references.map(formatBibleReference).join(" · "));
      button.addEventListener("click", (event) => { event.stopImmediatePropagation(); renderEpisode(index); }, true);
    });
    renderEpisode(0);

    const closing = doc.querySelector<HTMLElement>("#page-7 .bible-quote");
    if (closing) {
      closing.replaceChildren();
      closing.dataset.hasHighlight = String(Boolean(journey.closing.highlight));
      const closingCopy = doc.createElement("div"); closingCopy.className = "bible-closing-copy";
      const label = doc.createElement("span"); label.textContent = "À RETENIR";
      const title = doc.createElement("h2"); title.textContent = journey.closing.title;
      closingCopy.append(label, title);
      const closingParagraphs = journey.closing.paragraphs ?? (journey.closing.text ? [journey.closing.text] : []);
      closingParagraphs.forEach((text: string) => { const paragraph = doc.createElement("p"); paragraph.textContent = text; closingCopy.append(paragraph); });
      closing.append(closingCopy);
      if (journey.closing.highlight) { const highlight = doc.createElement("aside"); highlight.className = "bible-question"; highlight.textContent = journey.closing.highlight; closing.append(highlight); }
    }
    doc.querySelector<HTMLElement>("#page-7 .bible-closing")?.remove();

    const shared = biblicalV10.sharedJesusSection;
    const gallery = doc.querySelector<HTMLElement>("#page-7 .bible-gallery");
    if (gallery) {
      gallery.replaceChildren();
      const head = doc.createElement("div"); head.className = "bible-jesus-head";
      const eyebrow = doc.createElement("span"); eyebrow.textContent = shared.eyebrow;
      const sharedTitle = doc.createElement("h2");
      const sharedTitleText = doc.createElement("span"); sharedTitleText.textContent = shared.title;
      const fourColorMark = doc.createElement("span"); fourColorMark.className = "bible-four-color-mark"; fourColorMark.setAttribute("aria-hidden", "true");
      shared.navigation.forEach((item: { profileCode: PreviewProfileCode }) => { const bar = doc.createElement("i"); bar.style.backgroundColor = resultProfileColor[item.profileCode]; fourColorMark.append(bar); });
      sharedTitle.append(sharedTitleText, fourColorMark);
      const subtitle = doc.createElement("h3"); subtitle.textContent = shared.subtitle;
      head.append(eyebrow, sharedTitle, subtitle);
      const copy = doc.createElement("div"); copy.className = "bible-jesus-copy";
      shared.paragraphs.forEach((text: string) => { const paragraph = doc.createElement("p"); paragraph.textContent = text; copy.append(paragraph); });
      const primaryQuote = doc.createElement("aside"); primaryQuote.className = "bible-jesus-quote";
      const primaryReference = doc.createElement("div"); primaryReference.className = "bible-reference-links";
      renderReferenceLinks(doc, primaryReference, [shared.scriptureQuote.reference]);
      const primaryText = doc.createElement("blockquote"); primaryText.textContent = `« ${shared.scriptureQuote.text} »`;
      const primaryTranslation = doc.createElement("cite"); primaryTranslation.textContent = `${shared.scriptureQuote.reference} · ${shared.scriptureQuote.translation}`;
      primaryQuote.append(primaryReference, primaryText, primaryTranslation);
      const pedagogicalNote = doc.createElement("p"); pedagogicalNote.className = "bible-jesus-pedagogical-note"; pedagogicalNote.textContent = shared.pedagogicalNote;
      const bridge = doc.createElement("p"); bridge.className = "bible-jesus-bridge"; bridge.textContent = shared.transition;
      const finalQuote = doc.createElement("aside"); finalQuote.className = "bible-jesus-final";
      const finalReference = doc.createElement("div"); finalReference.className = "bible-reference-links";
      renderReferenceLinks(doc, finalReference, [shared.finalScriptureQuote.reference]);
      const finalText = doc.createElement("blockquote"); finalText.textContent = `« ${shared.finalScriptureQuote.text} »`;
      const finalTranslation = doc.createElement("cite"); finalTranslation.textContent = `${shared.finalScriptureQuote.reference} · ${shared.finalScriptureQuote.translation}`;
      finalQuote.append(finalReference, finalText, finalTranslation);
      const navigationSection = doc.createElement("section"); navigationSection.className = "bible-journey-navigation";
      const navigationTitle = doc.createElement("h3"); navigationTitle.textContent = shared.navigationTitle;
      const navigationIntroduction = doc.createElement("p"); navigationIntroduction.textContent = shared.navigationIntroduction;
      const cards = doc.createElement("div"); cards.className = "bible-journey-grid";
      shared.navigation.forEach((item: { profileCode: PreviewProfileCode; figure: string; profile: string }) => {
        const card = doc.createElement("button");
        card.type = "button";
        card.className = "bible-journey-card";
        card.dataset.current = String(item.profileCode === originalBibleProfile);
        card.style.setProperty("--journey-color", resultProfileColor[item.profileCode]);
        const cardFigure = item.profileCode === "conquerant" ? "paul" : item.profileCode === "communiquant" ? "pierre" : item.profileCode === "facilitateur" ? "abraham" : "moise";
        const image = doc.createElement("img"); image.src = withMappBasePath(`/images/characters/${cardFigure}.png`); image.alt = item.figure;
        const text = doc.createElement("div");
        const name = doc.createElement("strong"); name.textContent = item.figure;
        const description = doc.createElement("small"); description.textContent = item.profile;
        text.append(name, description); card.append(image, text);
        card.onclick = () => { renderBibleProfile(item.profileCode); doc.querySelector("#page-7 .bible-top")?.scrollIntoView({ behavior: "smooth" }); };
        cards.append(card);
      });
      navigationSection.append(navigationTitle, navigationIntroduction, cards);
      gallery.append(head, copy, primaryQuote, pedagogicalNote, bridge, finalQuote, navigationSection);
    }
    setText(doc,"#page-7 .bible-note","Preview éditoriale V10 · source unique locale · non publiée.");
  };
  renderBibleProfile(profileCode);
  return;

  /* Legacy V1/V2 hydrators kept temporarily for source comparison only.
  // 06: character and all six full episodes, never borrowed from Conquérant.
  const bible = profile.pages["06_bible"];
  const isPaulV2 = profileCode === "conquerant";
  const isAbrahamV2 = profileCode === "facilitateur";
  const isMoiseV2 = profileCode === "analyste";
  setText(doc,"#page-7 .bible-top h1",`Ton profil fait écho à celui de ${bible.figure}.`);
  setText(doc,"#page-7 .bible-top p",bible.introduction);
  setText(doc,"#page-7 .bible-copy h2",bible.editorialTitle);
  setText(doc,"#page-7 .bible-copy p",bible.introduction);
  setText(doc,"#page-7 .bible-copy > span",`${profile.name.toUpperCase()} · ${bible.figure.toUpperCase()}`);
  const figure = doc.querySelector<HTMLImageElement>("#page-7 .bible-figure img");
  if(figure){figure.src=withMappBasePath(`/images/characters/${profileCode === "conquerant" ? "paul" : profileCode === "communiquant" ? "pierre" : profileCode === "facilitateur" ? "abraham" : "moise"}.png`);figure.alt=bible.figure;}
  const episodeButtons=doc.querySelectorAll<HTMLButtonElement>("#page-7 .bible-menu button");
  if (isPaulV2) {
    setText(doc,"#page-7 .bible-top h1",paulV2.title);
    doc.querySelector("#page-7 .bible-top p")?.remove();
    setText(doc,"#page-7 .bible-copy h2",paulV2.episodes[0].title);
    setText(doc,"#page-7 .bible-copy p",paulV2.introduction);
    setText(doc,"#page-7 .bible-copy > span",`${paulV2.profileName.toUpperCase()} · ${paulV2.biblicalFigure.toUpperCase()} · PREVIEW DRAFT`);
    const renderPaulEpisode=(index:number)=>{const episode=paulV2.episodes[index];if(!episode)return;episodeButtons.forEach((button,i)=>{button.setAttribute("aria-selected",String(i===index));button.classList.toggle("chosen",i===index);});let characteristic=doc.querySelector<HTMLElement>("#page-7 .bible-characteristic");const reference=doc.querySelector<HTMLElement>("#page-7 .bible-detail > small");if(!characteristic&&reference){characteristic=doc.createElement("span");characteristic.className="bible-characteristic";reference.before(characteristic);}if(characteristic)characteristic.textContent=episode.characteristic;if(reference){reference.className="bible-reference-links";renderReferenceLinks(doc,reference,[episode.reference]);}setText(doc,"#page-7 .bible-detail h3",episode.title);setText(doc,"#page-7 .bible-detail > p",episode.story);const detail=doc.querySelector<HTMLElement>("#page-7 .bible-detail > div");if(detail){detail.replaceChildren();appendDetailSection(doc,detail,"CE QUE CELA RÉVÈLE DU PROFIL",episode.profileReading);appendDetailSection(doc,detail,"CE QUE TU PEUX APPRENDRE",episode.takeaway);}};
    episodeButtons.forEach((button,index)=>{const episode=paulV2.episodes[index];setText(button,"strong",episode.characteristic);setText(button,"small",formatBibleReference(episode.reference));button.addEventListener("click",event=>{event.stopImmediatePropagation();renderPaulEpisode(index);},true);});
    renderPaulEpisode(0);
    let closing=doc.querySelector<HTMLElement>("#page-7 .bible-closing");
    if(!closing){closing=doc.createElement("section");closing.className="bible-closing";doc.querySelector("#page-7 .bible-note")?.before(closing);}
    closing.innerHTML=`<h2>${paulV2.closing.title}</h2><p>${paulV2.closing.text}</p>`;
    setText(doc,"#page-7 .bible-note",paulV2.editorialNotice);
  } else if (isAbrahamV2) {
    setText(doc,"#page-7 .bible-top h1",abrahamV2.title);
    doc.querySelector("#page-7 .bible-top p")?.remove();
    setText(doc,"#page-7 .bible-copy h2",abrahamV2.episodes[0].title);
    setText(doc,"#page-7 .bible-copy p",abrahamV2.introduction);
    setText(doc,"#page-7 .bible-copy > span",`${abrahamV2.profileName.toUpperCase()} · ${abrahamV2.biblicalFigure.toUpperCase()} · PREVIEW DRAFT`);
    setText(doc,"#page-7 .bible-copy b","Confiance · paix · fidélité");
    setText(doc,"#page-7 .bible-explain span",`POURQUOI ${abrahamV2.biblicalFigure.toUpperCase()} ?`);
    setText(doc,"#page-7 .bible-explain h2","Ce que vous pouvez avoir en commun.");
    setParagraphs(doc,"#page-7 .bible-explain p",[abrahamV2.episodes[0].profileReading,"Ce rapprochement est pédagogique : il ne signifie pas qu’Abraham aurait passé un test de personnalité. Son histoire est bien plus riche qu’un profil comportemental."]);
    setText(doc,"#page-7 .bible-chapter h2",`Six étapes pour découvrir ${abrahamV2.biblicalFigure}.`);
    setText(doc,"#page-7 .bible-chapter > p","Choisis une étape pour découvrir son histoire, ce qu’elle révèle du profil et ce que tu peux en apprendre.");
    setText(doc,"#page-7 .bible-quote span","À RETENIR");
    setText(doc,"#page-7 .bible-quote h2",abrahamV2.closing.title);
    setText(doc,"#page-7 .bible-quote p",abrahamV2.closing.paragraphs[0]);
    setText(doc,"#page-7 .bible-question",abrahamV2.closing.highlight);
    const renderAbrahamEpisode=(index:number)=>{const episode=abrahamV2.episodes[index];if(!episode)return;episodeButtons.forEach((button,i)=>{button.setAttribute("aria-selected",String(i===index));button.classList.toggle("chosen",i===index);});let characteristic=doc.querySelector<HTMLElement>("#page-7 .bible-characteristic");const reference=doc.querySelector<HTMLElement>("#page-7 .bible-detail > small");if(!characteristic&&reference){characteristic=doc.createElement("span");characteristic.className="bible-characteristic";reference.before(characteristic);}if(characteristic)characteristic.textContent=episode.characteristic;if(reference){reference.className="bible-reference-links";renderReferenceLinks(doc,reference,episode.references);}setText(doc,"#page-7 .bible-detail h3",episode.title);setText(doc,"#page-7 .bible-detail > p",episode.story);const detail=doc.querySelector<HTMLElement>("#page-7 .bible-detail > div");if(detail){detail.replaceChildren();if(episode.scriptureQuote){const quote=doc.createElement("aside");quote.className="bible-scripture-quote";const quoteReference=doc.createElement("div");quoteReference.className="bible-reference-links";renderReferenceLinks(doc,quoteReference,[episode.scriptureQuote.reference]);const blockquote=doc.createElement("blockquote");blockquote.textContent=episode.scriptureQuote.text;const cite=doc.createElement("cite");cite.textContent=episode.scriptureQuote.translation;quote.append(quoteReference,blockquote,cite);detail.append(quote);const followup=doc.createElement("p");followup.className="bible-scripture-followup";followup.textContent=episode.scriptureQuote.followup;detail.append(followup);}appendDetailSection(doc,detail,"CE QUE CELA RÉVÈLE DU PROFIL",episode.profileReading);appendDetailSection(doc,detail,"CE QUE TU PEUX APPRENDRE",episode.takeaway);}};
    episodeButtons.forEach((button,index)=>{const episode=abrahamV2.episodes[index];setText(button,"strong",episode.characteristic);setText(button,"small",episode.references.map(formatBibleReference).join(" · "));button.addEventListener("click",event=>{event.stopImmediatePropagation();renderAbrahamEpisode(index);},true);});
    renderAbrahamEpisode(0);
    let closing=doc.querySelector<HTMLElement>("#page-7 .bible-closing");
    if(!closing){closing=doc.createElement("section");closing.className="bible-closing";doc.querySelector("#page-7 .bible-note")?.before(closing);}
    closing.replaceChildren();const closingTitle=doc.createElement("h2");closingTitle.textContent=abrahamV2.closing.title;closing.append(closingTitle);abrahamV2.closing.paragraphs.forEach(text=>{const paragraph=doc.createElement("p");paragraph.textContent=text;closing?.append(paragraph);});const highlight=doc.createElement("p");highlight.className="bible-closing-highlight";highlight.textContent=abrahamV2.closing.highlight;closing.append(highlight);
    setText(doc,"#page-7 .bible-note","Preview éditoriale · contenu Abraham V2 en draft · non publié.");
  } else if (isMoiseV2) {
    setText(doc,"#page-7 .bible-top h1",moiseV2.title);
    doc.querySelector("#page-7 .bible-top p")?.remove();
    setText(doc,"#page-7 .bible-copy h2",moiseV2.episodes[0].title);
    setText(doc,"#page-7 .bible-copy p",moiseV2.introduction);
    setText(doc,"#page-7 .bible-copy > span",`${moiseV2.profileName.toUpperCase()} · ${moiseV2.biblicalFigure.toUpperCase()} · PREVIEW DRAFT`);
    setText(doc,"#page-7 .bible-copy b","Rigueur · discernement · transmission");
    setText(doc,"#page-7 .bible-explain span",`POURQUOI ${moiseV2.biblicalFigure.toUpperCase()} ?`);
    setText(doc,"#page-7 .bible-explain h2","Ce que vous pouvez avoir en commun.");
    setParagraphs(doc,"#page-7 .bible-explain p",[moiseV2.episodes[0].profileReading,"Ce rapprochement est pédagogique : il ne signifie pas que Moïse aurait passé un test de personnalité. Son histoire est bien plus riche qu’un profil comportemental."]);
    setText(doc,"#page-7 .bible-chapter h2",`Six étapes pour découvrir ${moiseV2.biblicalFigure}.`);
    setText(doc,"#page-7 .bible-chapter > p","Choisis une étape pour découvrir son histoire, ce qu’elle révèle du profil et ce que tu peux en apprendre.");
    setText(doc,"#page-7 .bible-quote span","À RETENIR");
    setText(doc,"#page-7 .bible-quote h2",moiseV2.closing.title);
    setText(doc,"#page-7 .bible-quote p",moiseV2.closing.paragraphs[0]);
    setText(doc,"#page-7 .bible-question",moiseV2.closing.highlight);
    const renderMoiseEpisode=(index:number)=>{const episode=moiseV2.episodes[index];if(!episode)return;episodeButtons.forEach((button,i)=>{button.setAttribute("aria-selected",String(i===index));button.classList.toggle("chosen",i===index);});let characteristic=doc.querySelector<HTMLElement>("#page-7 .bible-characteristic");const reference=doc.querySelector<HTMLElement>("#page-7 .bible-detail > small");if(!characteristic&&reference){characteristic=doc.createElement("span");characteristic.className="bible-characteristic";reference.before(characteristic);}if(characteristic)characteristic.textContent=episode.characteristic;if(reference){reference.className="bible-reference-links";renderReferenceLinks(doc,reference,episode.references);}setText(doc,"#page-7 .bible-detail h3",episode.title);setText(doc,"#page-7 .bible-detail > p",episode.story);const detail=doc.querySelector<HTMLElement>("#page-7 .bible-detail > div");if(detail){detail.replaceChildren();if(episode.scriptureQuote){const quote=doc.createElement("aside");quote.className="bible-scripture-quote";const quoteReference=doc.createElement("div");quoteReference.className="bible-reference-links";renderReferenceLinks(doc,quoteReference,[episode.scriptureQuote.reference]);const blockquote=doc.createElement("blockquote");blockquote.textContent=episode.scriptureQuote.text;const cite=doc.createElement("cite");cite.textContent=`Traduction ${episode.scriptureQuote.translation}`;quote.append(quoteReference,blockquote,cite);detail.append(quote);}appendDetailSection(doc,detail,"CE QUE CELA RÉVÈLE DU PROFIL",episode.profileReading);appendDetailSection(doc,detail,"CE QUE TU PEUX APPRENDRE",episode.takeaway);}};
    episodeButtons.forEach((button,index)=>{const episode=moiseV2.episodes[index];setText(button,"strong",episode.characteristic);setText(button,"small",episode.references.map(formatBibleReference).join(" · "));button.addEventListener("click",event=>{event.stopImmediatePropagation();renderMoiseEpisode(index);},true);});
    renderMoiseEpisode(0);
    let closing=doc.querySelector<HTMLElement>("#page-7 .bible-closing");
    if(!closing){closing=doc.createElement("section");closing.className="bible-closing";doc.querySelector("#page-7 .bible-note")?.before(closing);}
    closing.replaceChildren();const closingTitle=doc.createElement("h2");closingTitle.textContent=moiseV2.closing.title;closing.append(closingTitle);moiseV2.closing.paragraphs.forEach(text=>{const paragraph=doc.createElement("p");paragraph.textContent=text;closing?.append(paragraph);});const highlight=doc.createElement("p");highlight.className="bible-closing-highlight";highlight.textContent=moiseV2.closing.highlight;closing.append(highlight);
    setText(doc,"#page-7 .bible-note","Preview éditoriale · contenu Moïse V2 en draft · traduction de la citation de l’épisode 04 à vérifier avant publication.");
  } else {
    const renderEpisode=(index:number)=>{const episode=bible.episodes[index];if(!episode)return;episodeButtons.forEach((button,i)=>button.setAttribute("aria-selected",String(i===index)));const reference=doc.querySelector<HTMLElement>("#page-7 .bible-detail > small");if(reference){reference.className="bible-reference-links";renderReferenceLinks(doc,reference,[episode.biblicalReference]);}setText(doc,"#page-7 .bible-detail h3",episode.title);setText(doc,"#page-7 .bible-detail > p",episode.story);const detail=doc.querySelector<HTMLElement>("#page-7 .bible-detail > div");if(detail){detail.replaceChildren();appendDetailSection(doc,detail,"CE QUE CELA RÉVÈLE DU PROFIL",episode.whatItIllustrates);appendDetailSection(doc,detail,"POINT DE VIGILANCE",episode.pointOfAttention);appendDetailSection(doc,detail,"CE QUE TU PEUX APPRENDRE",episode.whatYouCanLearn);}};
    episodeButtons.forEach((button,index)=>{const episode=bible.episodes[index];if(!episode)return;setText(button,"strong",episode.title);setText(button,"small",formatBibleReference(episode.biblicalReference));button.addEventListener("click",event=>{event.stopImmediatePropagation();renderEpisode(index);},true);});
    renderEpisode(0);
    setText(doc,"#page-7 .bible-note",bible.editorialNotice);
  }
  */
}

function hydratePressurePreview(doc: Document, profileCode: PreviewProfileCode) {
  const profile = editorialLibrary.profiles[profileCode];
  const content = profile.pages["02_fonctionnement"].underPressure;
  const section = doc.querySelector<HTMLElement>("#page-2 .pressure-section");
  if (!section) return;

  section.style.setProperty("--mapp-red", resultProfileColor[profileCode]);
  section.querySelector<HTMLElement>(".pressure-type")?.remove();
  const description = section.querySelector<HTMLElement>(".pressure-description");
  if (description) description.textContent = source.sharedText.pressureDisclaimer;

  const introTitle = section.querySelector<HTMLElement>(".pressure-intro h3");
  if (introTitle) {
    introTitle.textContent = content.title;
    let badge = section.querySelector<HTMLElement>(".pressure-profile-badge");
    if (!badge) {
      badge = doc.createElement("span");
      badge.className = "pressure-profile-badge";
      introTitle.before(badge);
    }
    badge.textContent = `Lecture générale du profil · ${profile.name}`;
  }
  const introParagraphs = section.querySelectorAll<HTMLElement>(".pressure-intro p");
  content.introduction.forEach((paragraph: string, index: number) => { if (introParagraphs[index]) introParagraphs[index].textContent = paragraph; });

  const changes = section.querySelectorAll<HTMLElement>(".pressure-accordion details");
  content.possibleChanges.forEach((item: { title: string; body: string }, index: number) => {
    const detail = changes[index];
    if (!detail) return;
    const title = detail.querySelector<HTMLElement>("summary strong");
    const body = detail.querySelector<HTMLElement>(":scope > p");
    if (title) title.textContent = item.title;
    if (body) body.textContent = item.body;
  });

  const tips = section.querySelectorAll<HTMLElement>(".pressure-tip");
  content.practicalAdjustments.forEach((item: { title: string; body: string }, index: number) => {
    const paragraph = tips[index]?.querySelector<HTMLElement>("p");
    if (paragraph) {
      paragraph.replaceChildren();
      const strong = doc.createElement("strong");
      strong.textContent = item.title;
      paragraph.append(strong, ` ${item.body}`);
    }
  });
  const takeaway = section.querySelector<HTMLElement>(".pressure-takeaway p");
  if (takeaway) takeaway.textContent = content.closing;
}

export default function CompleteExperience({
  profileCode = "conquerant",
  secondaryCode = "communiquant",
  initialPage = 1,
  scores,
  pressureScores,
  pressureProfile,
  pressureSecondary,
  pressureTieNote,
  tieNote,
  identityNarrative,
  isPreview = true,
  attemptId,
  revisionId,
  profileOnly = false,
  previewViewport,
}: {
  profileCode?: PreviewProfileCode;
  secondaryCode?: PreviewProfileCode;
  initialPage?: number;
  scores?: Partial<Record<PreviewProfileCode, number | null>>;
  pressureScores?: Partial<Record<PreviewProfileCode, number | null>>;
  pressureProfile?: PreviewProfileCode | null;
  pressureSecondary?: PreviewProfileCode | null;
  pressureTieNote?: string | null;
  tieNote?: string | null;
  identityNarrative?: IdentityInterpretation | null;
  isPreview?: boolean;
  attemptId?: string;
  revisionId?: string;
  profileOnly?: boolean;
  previewViewport?: number;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const functioningRoot = useRef<Root | null>(null);
  const forcesRoot = useRef<Root | null>(null);
  const relationsRoot = useRef<Root | null>(null);
  const growthRoot = useRef<Root | null>(null);
  const organisationRoot = useRef<Root | null>(null);
  const [height, setHeight] = useState(1700);
  const [ready, setReady] = useState(false);

  useEffect(() => { setReady(false); }, [initialPage, profileCode, secondaryCode]);

  useEffect(() => {
    const printProfile = () => {
      const frame = frameRef.current;
      const doc = frame?.contentDocument;
      if (!frame?.contentWindow || !doc) return;
      let style = doc.querySelector<HTMLStyleElement>("#profile-print-style");
      if (!style) { style = doc.createElement("style"); style.id = "profile-print-style"; doc.head.append(style); }
      style.textContent = `@media print{.nav-wrap,.mobile-nav-toggle,.pdf-download-action,.pdf-download-status{display:none!important}.page{display:block!important;position:static!important;opacity:1!important;visibility:visible!important;page-break-after:always;break-after:page}.page:last-child{page-break-after:auto;break-after:auto}body{background:#fff!important}}`;
      frame.contentWindow.focus();
      frame.contentWindow.print();
    };
    window.addEventListener("mapp:print-profile", printProfile);
    return () => window.removeEventListener("mapp:print-profile", printProfile);
  }, []);

  const prepareFrame = useCallback(() => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc?.body || !doc.getElementById("page-1") || doc.body.dataset.mappHydrated === "true") return;
    const activeDoc = doc;
    const body = doc.body;

    // Upgrade the historical six-step document to the complete seven-step journey.
    ensureCompleteResultsJourney(doc, initialPage);

    const brand = doc.querySelector<HTMLElement>(".nav .brand");
    brand?.remove();
    doc.querySelector("#page-1 .art-number")?.remove();
    [...doc.querySelectorAll<HTMLElement>("body > div")]
      .find((element) => element.textContent?.startsWith("Maquette éditoriale"))
      ?.remove();
    const pdfUrl = withMappBasePath(isPreview ? "/api/preview/profile-pdf" : `/api/results/${attemptId}/pdf${revisionId ? `?revision=${encodeURIComponent(revisionId)}` : ""}`);
    hydrateDraftProfile(doc, profileCode, secondaryCode, undefined, scores, isPreview, pdfUrl);
    doc.querySelector<HTMLElement>("#page-1 .hero p")?.remove();
    doc.querySelector("#identity-tie-message")?.remove();
    doc.querySelector("#identity-interpretation")?.remove();
    const narrative = identityNarrative ?? identityInterpretation(
      ({ conquerant: "D", communiquant: "I", facilitateur: "S", analyste: "C" } as const)[profileCode],
      ({ conquerant: "D", communiquant: "I", facilitateur: "S", analyste: "C" } as const)[secondaryCode],
    );
    const sectionHero = doc.querySelector<HTMLElement>("#page-1 .hero");
    if (sectionHero) {
      const interpretation = doc.createElement("div");
      interpretation.id = "identity-interpretation";
      interpretation.className = "identity-interpretation";
      const subtitle = doc.createElement("h2");
      subtitle.textContent = narrative.subtitle;
      interpretation.append(subtitle);
      const paragraph = doc.createElement("p");
      for (const part of narrative.parts) {
        const element = part.strong ? doc.createElement("strong") : doc.createElement("span");
        element.textContent = part.text;
        paragraph.append(element);
      }
      interpretation.append(paragraph);
      sectionHero.append(interpretation);
    }
    doc.querySelector("#disc-v2-tie-note")?.remove();
    if (tieNote) {
      const identity = doc.querySelector<HTMLElement>("#page-1 .identity");
      if (identity) { const note = doc.createElement("p"); note.id = "disc-v2-tie-note"; note.className = "disc-v2-tie-note"; note.textContent = tieNote; identity.insertAdjacentElement("afterend", note); }
    }
    assignTypographyRoles(doc);
    functioningRoot.current?.unmount();
    forcesRoot.current?.unmount();
    relationsRoot.current?.unmount();
    growthRoot.current?.unmount();
    organisationRoot.current?.unmount();
    const profileDisc = { conquerant: "D", communiquant: "I", facilitateur: "S", analyste: "C" } as const;
    const naturalPair = `${profileDisc[profileCode]}${profileDisc[secondaryCode]}` as DailyCombination;
    const pressureValues = pressureScores && ["conquerant", "communiquant", "facilitateur", "analyste"].every(code => typeof pressureScores[code as PreviewProfileCode] === "number")
      ? { D: pressureScores.conquerant!, I: pressureScores.communiquant!, S: pressureScores.facilitateur!, C: pressureScores.analyste! } : null;
    const storedPressure: StoredPressureResult | undefined = pressureProfile && pressureValues
      ? { primary: profileDisc[pressureProfile], secondary: pressureSecondary ? profileDisc[pressureSecondary] : null, percentages: pressureValues }
      : undefined;
    const functioningHost = doc.querySelector<HTMLElement>("#page-2");
    if (functioningHost) {
      const pageNavigation = functioningHost.querySelector<HTMLElement>(".mini-nav");
      functioningHost.replaceChildren();
      if (pageNavigation) functioningHost.append(pageNavigation);
      const reactHost = doc.createElement("div");
      functioningHost.prepend(reactHost);
      document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach(link => {
        if (link.href && !doc.querySelector(`link[href="${link.getAttribute("href")}"]`)) doc.head.append(link.cloneNode(true));
      });
      const storageKey = `profil-mapp-functioning-${attemptId ?? "preview"}-${revisionId ?? "current"}`;
      let initialTab: "natural" | "stress" = "natural";
      const requestedTab = new URLSearchParams(window.location.search).get("onglet");
      if (requestedTab === "pression") initialTab = "stress";
      else if (!requestedTab) { try { if (sessionStorage.getItem(storageKey) === "stress") initialTab = "stress"; } catch { /* private browsing */ } }
      functioningRoot.current = createRoot(reactHost);
      functioningRoot.current.render(<FunctioningDemo combination={naturalPair} pressureCombination={naturalPair} pressureResult={storedPressure} pressureTieNote={pressureTieNote} initialTab={initialTab} production={!isPreview} onSwitch={next => {
        try { sessionStorage.setItem(storageKey, next); } catch { /* private browsing */ }
        const url = new URL(window.location.href);
        url.searchParams.set("onglet", next === "stress" ? "pression" : "naturel");
        window.history.replaceState(null, "", url);
        // React replaces the whole tab panel after this event. Measure the new
        // panel rather than retaining the previous tab's iframe height.
        requestAnimationFrame(() => requestAnimationFrame(syncHeight));
        setTimeout(syncHeight, 80);
        requestAnimationFrame(() => {
          frame.contentWindow?.scrollTo({ top: 0, left: 0, behavior: "instant" });
          frame.scrollIntoView({ behavior: "instant", block: "start" });
        });
      }} />);
    }
    const forcesHost = doc.querySelector<HTMLElement>("#page-3");
    if (forcesHost) {
      const pageNavigation = forcesHost.querySelector<HTMLElement>(".mini-nav");
      forcesHost.replaceChildren();
      const reactHost = doc.createElement("div");
      forcesHost.append(reactHost);
      if (pageNavigation) forcesHost.append(pageNavigation);
      forcesRoot.current = createRoot(reactHost);
      forcesRoot.current.render(<ForcesDefis combination={profileOnly ? profileDisc[profileCode] : naturalPair} embedded production={!isPreview} />);
    }
    if (!profileOnly) {
      const relationsHost = doc.querySelector<HTMLElement>("#page-4");
      if (relationsHost) {
        const pageNavigation = relationsHost.querySelector<HTMLElement>(".mini-nav");
        if (pageNavigation) {
          const nextStep = pageNavigation.querySelector<HTMLElement>("small");
          const nextTitle = pageNavigation.querySelector<HTMLElement>("strong");
          const nextButton = pageNavigation.querySelector<HTMLElement>("[data-go]");
          if (nextStep) nextStep.textContent = "Prochaine étape · 05";
          if (nextTitle) nextTitle.textContent = "Dans une organisation";
          if (nextButton) nextButton.dataset.go = "5";
        }
        relationsHost.replaceChildren();
        const reactHost = doc.createElement("div");
        relationsHost.append(reactHost);
        if (pageNavigation) relationsHost.append(pageNavigation);
        relationsRoot.current = createRoot(reactHost);
        relationsRoot.current.render(<AvecLesAutres combination={naturalPair} embedded />);
      }
    }
    const organisationHost = doc.querySelector<HTMLElement>("#page-5");
    if (organisationHost && !profileOnly) {
      const reactHost = doc.createElement("div");
      organisationHost.replaceChildren(reactHost);
      fetch(ORGANISATION_MANUAL_SOURCE)
        .then(async response => {
          if (!response.ok) throw new Error(`Contenus Organisation indisponibles (${response.status})`);
          return normalizeManualOrganisationContent(await response.json());
        })
        .then(dataset => {
          const configuration = dataset.configurations[naturalPair];
          const initialRole = "direction" as const;
          organisationRoot.current = createRoot(reactHost);
          organisationRoot.current.render(<OrganisationPreview
            combination={naturalPair}
            configuration={configuration}
            manifest={dataset}
            initialRole={initialRole}
            initialContext={defaultContextForRole(configuration, initialRole)}
            embedded
            onNavigate={targetPage => {
              activeDoc.querySelectorAll<HTMLElement>(".page").forEach(page => page.classList.toggle("active", page.id === `page-${targetPage}`));
              activeDoc.querySelectorAll<HTMLElement>(".nav [data-page]").forEach(item => item.classList.toggle("active", item.dataset.page === String(targetPage)));
              setTimeout(syncHeight, 30);
              requestAnimationFrame(() => {
                frame.contentWindow?.scrollTo({ top: 0, left: 0, behavior: "instant" });
                frame.scrollIntoView({ behavior: "instant", block: "start" });
              });
            }}
          />);
        })
        .catch(error => {
          reactHost.textContent = error instanceof Error ? error.message : "Le guide n’a pas pu être chargé.";
        });
    }
    const growthHost = doc.querySelector<HTMLElement>("#page-6");
    if (growthHost) {
      const pageNavigation = growthHost.querySelector<HTMLElement>(".mini-nav");
      growthHost.replaceChildren();
      const reactHost = doc.createElement("div");
      growthHost.append(reactHost);
      if (pageNavigation) growthHost.append(pageNavigation);
      growthRoot.current = createRoot(reactHost);
      growthRoot.current.render(<Grandir combination={naturalPair} embedded production={!isPreview} design="page02" />);
    }
    if (profileOnly) {
      doc.querySelectorAll<HTMLElement>('[data-page="1"],[data-page="4"],[data-go="1"],[data-go="4"]').forEach((element) => { element.style.display = "none"; });
    }
    if (!isPreview) {
      doc.querySelector("#page-7 .bible-note")?.remove();
    }

    if (!doc.querySelector("#codex-responsive-styles")) {
      const link = doc.createElement("link");
      link.id = "codex-responsive-styles";
      link.rel = "stylesheet";
      link.href = withMappBasePath("/preview/profil-mapp-responsive.css");
      link.addEventListener("load", () => requestAnimationFrame(syncHeight));
      doc.head.appendChild(link);
    }

    function syncHeight() {
      const nav = activeDoc.querySelector<HTMLElement>(".nav-wrap");
      const shell = activeDoc.querySelector<HTMLElement>(".shell");
      const activePage = activeDoc.querySelector<HTMLElement>(".page.active");
      if (!shell || !activePage) return;
      const shellStyle = getComputedStyle(shell);
      const verticalPadding = parseFloat(shellStyle.paddingTop) + parseFloat(shellStyle.paddingBottom);
      const nextHeight = (nav?.offsetHeight ?? 0) + activePage.offsetHeight + verticalPadding;
      setHeight(Math.ceil(nextHeight + 2));
    }

    syncHeight();
    const FrameResizeObserver = doc.defaultView?.ResizeObserver;
    if (FrameResizeObserver) {
      try {
        const resizeObserver = new FrameResizeObserver(() => requestAnimationFrame(syncHeight));
        const frameShell = doc.querySelector<HTMLElement>(".shell");
        if (frameShell) resizeObserver.observe(frameShell);
        const framePage = doc.querySelector<HTMLElement>(".page.active");
        if (framePage) resizeObserver.observe(framePage);
      } catch {
        // Some browsers reject observing an iframe-realm element from the
        // parent realm. Explicit tab and button measurements remain active.
      }
    }
    const FrameMutationObserver = doc.defaultView?.MutationObserver;
    if (FrameMutationObserver && body.isConnected) {
      try {
        const observer = new FrameMutationObserver(() => requestAnimationFrame(syncHeight));
        observer.observe(body, { attributes: true, childList: true, subtree: true });
      } catch {
        // An iframe can be replaced during fast navigation. Button, image and
        // initial measurements below still keep the result visible.
      }
    }
    doc.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
      const targetPage = button.getAttribute("data-page") ?? button.getAttribute("data-go");
      if (targetPage) {
        activeDoc.querySelectorAll<HTMLElement>(".page").forEach(page => page.classList.toggle("active", page.id === `page-${targetPage}`));
        activeDoc.querySelectorAll<HTMLElement>(".nav [data-page]").forEach(item => item.classList.toggle("active", item.dataset.page === targetPage));
      }
      setTimeout(syncHeight, 30);
      if (button.matches("[data-go], .nav [data-page]")) {
        requestAnimationFrame(() => {
          frame.contentWindow?.scrollTo({ top: 0, left: 0, behavior: "instant" });
          frame.scrollIntoView({ behavior: "instant", block: "start" });
        });
      }
    }));
    doc.querySelectorAll("img").forEach((image) => image.addEventListener("load", syncHeight, { once: true }));
    doc.body.dataset.mappHydrated = "true";
    requestAnimationFrame(() => { syncHeight(); setReady(true); });
  }, [profileCode, secondaryCode, scores, pressureScores, pressureProfile, pressureSecondary, pressureTieNote, tieNote, identityNarrative, isPreview, attemptId, revisionId, profileOnly, initialPage]);

  useEffect(() => {
    // On a fast/cached static document the iframe load event can precede
    // React hydration, leaving it permanently hidden unless we catch up.
    if (frameRef.current?.contentDocument?.readyState === "complete") prepareFrame();
  }, [prepareFrame]);

  return (
    <section id="results" className={styles.completeExperience} aria-label="Restitution complète Profil MAPP">
      <iframe
        ref={frameRef}
        key={`${profileCode}-${secondaryCode}-${initialPage}`}
        src={`${withMappBasePath("/preview/profil-mapp-complet.html")}#page-${initialPage}`}
        title="Restitution complète Profil MAPP"
        loading="eager"
        onLoad={prepareFrame}
        style={{ height, width: previewViewport ? `${previewViewport}px` : undefined, maxWidth: previewViewport ? "none" : undefined, marginInline: previewViewport ? "auto" : undefined, opacity: ready ? 1 : 0, visibility: "visible", transition: "opacity .18s ease" }}
      />
    </section>
  );
}
