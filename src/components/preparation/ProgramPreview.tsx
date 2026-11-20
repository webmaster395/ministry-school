"use client";

import Image from "next/image";
import { useMemo } from "react";
import { formatProgramDate, type ProgramDay, type ProgramSlot, type TrainingProgram } from "@/lib/preparation/program";
import styles from "./ProgramPreview.module.css";

type Section = { key: "morning" | "afternoon"; label: string; slots: ProgramSlot[] };
type PreviewPage = { day: ProgramDay; cover: boolean; sections: Section[]; showIntro: boolean };

const slotWeight = (slot: ProgramSlot) =>
  88 + Math.min(44, slot.title.length * 0.34) + Math.min(28, slot.subtitle.length * 0.2) + Math.min(46, slot.description.length * 0.12);

function paginate(program: TrainingProgram): PreviewPage[] {
  const pages: PreviewPage[] = [];
  program.days.forEach((day, dayIndex) => {
    const sections: Section[] = [
      { key: "morning", label: "Matinée", slots: day.morning },
      ...(day.includeAfternoon ? [{ key: "afternoon" as const, label: "Après-midi", slots: day.afternoon }] : []),
    ];
    let page: PreviewPage = { day, cover: true, sections: [], showIntro: dayIndex === 0 };
    let remaining = 660 - (dayIndex === 0 ? Math.min(150, program.introduction.length * 0.12 + program.audience.length * 0.08) : 0);
    for (const section of sections) {
      let current: Section = { ...section, slots: [] };
      remaining -= 46;
      if (!section.slots.length) remaining -= 52;
      for (const slot of section.slots) {
        const weight = slotWeight(slot);
        if (current.slots.length > 0 && remaining < weight) {
          page.sections.push(current);
          pages.push(page);
          page = { day, cover: false, sections: [], showIntro: false };
          remaining = 815 - 46;
          current = { ...section, label: `${section.label} — suite`, slots: [] };
        }
        current.slots.push(slot);
        remaining -= weight;
      }
      page.sections.push(current);
      remaining -= 18;
    }
    pages.push(page);
  });
  return pages;
}

function Slot({ slot }: { slot: ProgramSlot }) {
  const time = slot.end ? `${slot.start || "—"}\n${slot.end}` : (slot.start || "—");
  return <article className={styles.slot} style={{ "--slot-color": slot.color } as React.CSSProperties}>
    <div className={styles.time}>{time.replaceAll(":", "h")}</div>
    <div className={styles.slotRule} />
    <div>
      <h4 className={styles.slotTitle}>{slot.title || "Sans titre"}</h4>
      {slot.description ? <p className={styles.description}>{slot.description}</p> : null}
    </div>
  </article>;
}

export default function ProgramPreview({ program, zoom, fitWidth }: { program: TrainingProgram; zoom: number; fitWidth: boolean }) {
  const pages = useMemo(() => paginate(program), [program]);
  const primaryColor = program.days.flatMap((day) => [...day.morning, ...day.afternoon])[0]?.color ?? "#e34d1b";
  return <div className={`${styles.viewport} h-full min-h-[640px] rounded-2xl p-4 sm:p-7`}>
    {pages.map((previewPage, index) => {
      const color = previewPage.sections[0]?.slots[0]?.color ?? primaryColor;
      return <div key={`${previewPage.day.kind}-${index}`} className={`${styles.pageSpace} ${fitWidth ? styles.fitWidth : ""}`} style={{ "--preview-scale": zoom } as React.CSSProperties}>
        <div data-program-page className={styles.page} style={{ "--section-color": color, "--program-primary": primaryColor } as React.CSSProperties}>
          {previewPage.cover ? <header className={styles.cover}>
            <Image src={program.coverImage} alt="" fill sizes="720px" className={styles.coverImage} priority={index === 0} />
            <div className={styles.coverOverlay} />
            <div className={styles.coverContent}>
              <Image src="/logo-compact.png" alt="Ministry School" width={466} height={122} className={styles.logo} />
              <p className={styles.eyebrow}>{previewPage.day.kind}</p>
              <h2 className={styles.title}>{program.title}</h2>
              <p className={styles.date}>{formatProgramDate(previewPage.day.date)}</p>
            </div>
          </header> : <header className={styles.continuationHeader}>
            <p className={styles.continuationBrand}>MINISTRY SCHOOL</p>
            <h2 className={styles.continuationTitle}>{program.title} · {formatProgramDate(previewPage.day.date, { day: "numeric", month: "long", year: "numeric" })}</h2>
          </header>}
          <main className={styles.body}>
            {previewPage.showIntro && program.introduction ? <p className={styles.intro}>{program.introduction}</p> : null}
            {previewPage.sections.map((section) => <section key={`${section.key}-${section.label}`} className={styles.section} style={{ "--section-color": section.slots[0]?.color ?? primaryColor } as React.CSSProperties}>
              <h3 className={styles.sectionHeading}>{section.label}</h3>
              {section.slots.length ? section.slots.map((slot) => <Slot key={slot.id} slot={slot} />) : <p className={styles.empty}>Programme à compléter</p>}
            </section>)}
          </main>
          <footer className={styles.footer}><span className={styles.footerBrand}>MINISTRY SCHOOL</span><span>{formatProgramDate(program.baseDate, { day: "2-digit", month: "2-digit", year: "numeric" })} · {index + 1}/{pages.length}</span></footer>
        </div>
      </div>;
    })}
  </div>;
}
