"use client";

import Image from "next/image";
import { useMemo } from "react";
import { formatSynthesisDate, type SynthesisBlock, type TrainingSynthesis } from "@/lib/preparation/synthesis";
import styles from "./SynthesisPreview.module.css";

type BodyPage = { blocks: SynthesisBlock[]; showIntroduction: boolean };

const linesFor = (text: string, characters: number) =>
  text.split("\n").reduce((total, line) => total + Math.max(1, Math.ceil(line.length / characters)), 0);

function blockHeight(block: SynthesisBlock) {
  if (block.type === "heading") {
    const size = block.level === 1 ? 34 : block.level === 2 ? 27 : 22;
    return 18 + linesFor(block.text, block.level === 1 ? 43 : 56) * size;
  }
  const lines = linesFor(block.text, block.type === "quote" ? 72 : 88);
  return 12 + lines * (block.type === "quote" ? 19 : 16);
}

function splitLongBlock(block: SynthesisBlock) {
  if (block.type === "heading" || block.text.length <= 2600) return [block];
  const words = block.text.split(/\s+/);
  const pieces: SynthesisBlock[] = [];
  let current = "";
  words.forEach((word) => {
    if (current.length + word.length + 1 > 2100 && current) {
      pieces.push({ ...block, id: `${block.id}-${pieces.length}`, text: current });
      current = word;
    } else current = current ? `${current} ${word}` : word;
  });
  if (current) pieces.push({ ...block, id: `${block.id}-${pieces.length}`, text: current });
  return pieces;
}

function paginate(synthesis: TrainingSynthesis): BodyPage[] {
  const source = synthesis.blocks.flatMap(splitLongBlock);
  const pages: BodyPage[] = [];
  let current: BodyPage = { blocks: [], showIntroduction: Boolean(synthesis.introduction) };
  let remaining = 790 - (synthesis.introduction ? Math.min(150, 45 + linesFor(synthesis.introduction, 72) * 21) : 0);

  source.forEach((block, index) => {
    const height = blockHeight(block);
    const nextHeight = source[index + 1] ? blockHeight(source[index + 1]) : 0;
    const keepWithNext = block.type === "heading" ? Math.min(150, nextHeight) : 0;
    if (current.blocks.length && remaining < height + keepWithNext) {
      pages.push(current);
      current = { blocks: [], showIntroduction: false };
      remaining = 790;
    }
    current.blocks.push(block);
    remaining -= height;
  });
  if (current.blocks.length || current.showIntroduction || !pages.length) pages.push(current);
  return pages;
}

function Block({ block }: { block: SynthesisBlock }) {
  const style = { "--block-color": block.color } as React.CSSProperties;
  if (block.type === "heading") {
    return <h3 className={`${styles.heading} ${styles[`heading${block.level}`]}`} style={style}>{block.text}</h3>;
  }
  return <p className={styles[block.type]} style={style}>{block.text}</p>;
}

export default function SynthesisPreview({ synthesis, zoom, fitWidth }: { synthesis: TrainingSynthesis; zoom: number; fitWidth: boolean }) {
  const pages = useMemo(() => paginate(synthesis), [synthesis]);
  const primary = synthesis.blocks.find((block) => block.type === "heading")?.color ?? "#59c9ca";
  const totalPages = pages.length + 1;
  return <div className={`${styles.viewport} h-full min-h-[640px] rounded-2xl p-4 sm:p-7`}>
    <div className={`${styles.pageSpace} ${fitWidth ? styles.fitWidth : ""}`} style={{ "--preview-scale": zoom } as React.CSSProperties}>
      <div data-synthesis-page className={styles.page} style={{ "--synthesis-primary": primary } as React.CSSProperties}>
        <section className={styles.cover}>
          <Image src={synthesis.coverImage} alt="" fill sizes="720px" className={styles.coverImage} priority />
          <div className={styles.coverOverlay} />
          <div className={styles.coverContent}>
            <Image src="/logo-compact.png" alt="Ministry School" width={466} height={122} className={styles.logo} />
            <div className={styles.coverMain}>
              <p className={styles.eyebrow}>Synthèse de cours</p>
              <h2 className={styles.coverTitle}>{synthesis.title}</h2>
              {synthesis.subtitle ? <p className={styles.coverSubtitle}>{synthesis.subtitle}</p> : null}
            </div>
            <div className={styles.coverMeta}>
              <div><span className={styles.metaLabel}>Date</span><p className={styles.metaValue}>{formatSynthesisDate(synthesis.date)}</p></div>
              <div><span className={styles.metaLabel}>Intervenant{ synthesis.speakers.includes("·") ? "s" : "" }</span><p className={styles.metaValue}>{synthesis.speakers || "À compléter"}</p></div>
            </div>
          </div>
        </section>
      </div>
    </div>
    {pages.map((page, index) => <div key={index} className={`${styles.pageSpace} ${fitWidth ? styles.fitWidth : ""}`} style={{ "--preview-scale": zoom } as React.CSSProperties}>
      <div data-synthesis-page className={styles.page}>
        <header className={styles.paperHeader}><span className={styles.paperBrand}>MINISTRY SCHOOL</span><span className={styles.paperDocument}>{synthesis.title}</span></header>
        <main className={styles.paperBody}>
          {page.showIntroduction && synthesis.introduction ? <p className={styles.introduction}>{synthesis.introduction}</p> : null}
          {page.blocks.length ? page.blocks.map((block) => <Block key={block.id} block={block} />) : <p className={styles.empty}>Importez un document Word ou collez votre texte pour commencer.</p>}
        </main>
        <footer className={styles.paperFooter}><span>MINISTRY SCHOOL · SYNTHÈSE</span><span>{index + 2}/{totalPages}</span></footer>
      </div>
    </div>)}
  </div>;
}
