import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatSynthesisDate } from "@/lib/preparation/synthesis";
import type { EditablePdfBlockV1, EditablePdfSourceV1 } from "@/lib/preparation/editable-pdf-source";

const COLORS = {
  paper: "#fffcf7",
  ink: "#25302f",
  muted: "#68706f",
  border: "#d9d7d0",
  turquoise: "#27bdc2",
  orange: "#f19f00",
  red: "#e34d1b",
  pink: "#ee9a9c",
  green: "#c9dc6a",
};

const STRIPES = [COLORS.orange, COLORS.turquoise, COLORS.red, COLORS.pink, COLORS.green];
const A4 = { width: 595.28, height: 841.89 };

Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.paper,
    color: COLORS.ink,
    fontFamily: "Helvetica",
    paddingTop: 84,
    paddingRight: 76,
    paddingBottom: 66,
    paddingLeft: 76,
  },
  stripeBar: { position: "absolute", top: 0, left: 0, right: 0, height: 10, flexDirection: "row" },
  stripe: { flexGrow: 1 },
  header: { position: "absolute", top: 31, left: 76, right: 76, borderBottomWidth: 0.55, borderBottomColor: COLORS.border, paddingBottom: 10, flexDirection: "row", justifyContent: "space-between" },
  brand: { fontFamily: "Helvetica-Bold", fontSize: 6.8, letterSpacing: 1.2 },
  headerTitle: { maxWidth: 260, textAlign: "right", color: COLORS.muted, fontSize: 6.8 },
  footerLine: { position: "absolute", bottom: 44, left: 76, right: 76, borderTopWidth: 0.55, borderTopColor: COLORS.border },
  footerText: { position: "absolute", bottom: 26, left: 76, width: 340, color: COLORS.muted, fontSize: 6.3, letterSpacing: 0.35 },
  pageNumber: { position: "absolute", bottom: 26, right: 76, width: 50, textAlign: "right", color: COLORS.muted, fontSize: 6.3 },
  sectionLabel: { marginBottom: 11, color: COLORS.turquoise, fontFamily: "Helvetica-Bold", fontSize: 7.5, letterSpacing: 1.65, textAlign: "center", textTransform: "uppercase" },
  titleRule: { width: 64, height: 1.7, marginTop: 14, marginBottom: 4, alignSelf: "center", backgroundColor: COLORS.turquoise },
  quote: { borderWidth: 0.7, borderColor: COLORS.border, borderLeftWidth: 3, borderLeftColor: COLORS.turquoise, backgroundColor: "#ffffff", paddingTop: 15, paddingRight: 17, paddingBottom: 14, paddingLeft: 17 },
});

function FixedFurniture({ source }: { source: EditablePdfSourceV1 }) {
  const identity = `${source.document.speakers.join(" · ")} · ${formatSynthesisDate(source.document.date)}`;
  return <>
    <View style={styles.stripeBar}>{STRIPES.map((color) => <View key={color} style={[styles.stripe, { backgroundColor: color }]} />)}</View>
    <View style={styles.header}><Text style={styles.brand}>MINISTRY SCHOOL</Text><Text style={styles.headerTitle}>{source.document.title}</Text></View>
    <View style={styles.footerLine} />
    <Text style={styles.footerText}>{identity}</Text>
    <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} style={styles.pageNumber} />
  </>;
}

function blockFont(block: EditablePdfBlockV1) {
  if (block.style.fontRole === "display") return "Times-Roman";
  if (block.style.fontRole === "label") return "Helvetica-Bold";
  return "Helvetica";
}

function EditableBlock({ block, first }: { block: EditablePdfBlockV1; first: boolean }) {
  const dynamicStyle = {
    color: block.style.color,
    fontFamily: blockFont(block),
    fontSize: block.style.fontSize,
    lineHeight: block.style.lineHeight,
    marginTop: block.style.spaceBefore,
    marginBottom: block.style.spaceAfter,
    textAlign: block.kind === "title" ? "center" as const : "left" as const,
  };
  return <View wrap={block.kind !== "quote"}>
    {first ? <Text style={styles.sectionLabel}>Preuve de source éditable</Text> : null}
    {block.kind === "quote"
      ? <View wrap={false} style={[styles.quote, { marginTop: block.style.spaceBefore, marginBottom: block.style.spaceAfter }]}><Text orphans={3} widows={3} style={{ ...dynamicStyle, marginTop: 0, marginBottom: 0 }}>{block.text}</Text></View>
      : <Text orphans={3} widows={3} style={dynamicStyle}>{block.text}</Text>}
    {block.kind === "title" ? <View style={styles.titleRule} /> : null}
  </View>;
}

function pageGroups(blocks: EditablePdfBlockV1[]) {
  const pages: EditablePdfBlockV1[][] = [];
  for (const block of blocks) {
    if (!pages.length || block.breakBefore) pages.push([]);
    pages.at(-1)!.push(block);
  }
  return pages;
}

export default function EditablePdfProofDocument({ source }: { source: EditablePdfSourceV1 }) {
  return <Document title={source.document.title} author="Ministry School" subject="Preuve PDF avec source structurée intégrée" creator="Ministry School — Prototype source V1">
    {pageGroups(source.blocks).map((blocks, pageIndex) => <Page key={`proof-page-${pageIndex}`} size={A4} wrap style={styles.page}>
        <FixedFurniture source={source} />
        {blocks.map((block, blockIndex) => <EditableBlock key={block.id} block={block} first={pageIndex === 0 && blockIndex === 0} />)}
      </Page>)}
  </Document>;
}
