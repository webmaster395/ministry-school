/* eslint-disable jsx-a11y/alt-text -- @react-pdf/renderer Image does not expose the DOM alt prop. */
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatSynthesisDate } from "@/lib/preparation/synthesis";
import { paginateEditablePdfBlocks, type EditablePdfBlockV1, type EditablePdfSourceV1 } from "@/lib/preparation/editable-pdf-source";

const COLORS = {
  paper: "#fffcf7",
  anthracite: "#25302f",
  ink: "#25302f",
  cream: "#fff0dc",
  muted: "#68706f",
  border: "#d9d7d0",
  turquoise: "#27bdc2",
  orange: "#f19f00",
  red: "#e34d1b",
  pink: "#ee9a9c",
  green: "#c9dc6a",
};

const STRIPES = [COLORS.green, COLORS.turquoise, COLORS.pink, COLORS.orange, COLORS.red];
const A4 = { width: 595.28, height: 841.89 };

Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  cover: { backgroundColor: COLORS.anthracite, color: COLORS.cream, fontFamily: "Helvetica" },
  coverStripeBar: { position: "absolute", top: 0, left: 0, right: 0, height: 26, flexDirection: "row" },
  stripe: { flexGrow: 1 },
  coverLogo: { position: "absolute", top: 92, left: 191, width: 213, height: 82, objectFit: "contain" },
  coverFallbackLogo: { position: "absolute", top: 118, left: 76, right: 76, color: COLORS.cream, fontFamily: "Times-Roman", fontSize: 27, textAlign: "center" },
  coverCategory: { position: "absolute", top: 254, left: 77, color: COLORS.cream, fontFamily: "Helvetica-Bold", fontSize: 7.8, letterSpacing: 0.35, textTransform: "uppercase" },
  coverTitle: { position: "absolute", top: 330, left: 77, right: 77, color: COLORS.cream, fontFamily: "Times-Roman", fontSize: 39, lineHeight: 1.13 },
  coverRule: { position: "absolute", top: 510, left: 77, width: 128, height: 4, borderRadius: 2, backgroundColor: COLORS.turquoise },
  coverSpeaker: { position: "absolute", bottom: 126, left: 77, color: COLORS.cream, fontFamily: "Helvetica-Bold", fontSize: 10.8, textTransform: "uppercase" },
  coverMeta: { position: "absolute", bottom: 101, left: 77, right: 77, color: COLORS.cream, fontSize: 8.8, lineHeight: 1.45 },

  page: { backgroundColor: COLORS.paper, color: COLORS.ink, fontFamily: "Helvetica", paddingTop: 88, paddingRight: 92, paddingBottom: 76, paddingLeft: 92 },
  stripeBar: { position: "absolute", top: 0, left: 0, right: 0, height: 11, flexDirection: "row" },
  header: { position: "absolute", top: 36, left: 76, right: 76, flexDirection: "row", justifyContent: "space-between" },
  brand: { color: COLORS.muted, fontFamily: "Helvetica-Bold", fontSize: 6.7 },
  headerTitle: { maxWidth: 265, color: COLORS.muted, fontSize: 6.7, textAlign: "right", textTransform: "uppercase" },
  footerLine: { position: "absolute", bottom: 48, left: 76, right: 76, borderTopWidth: 0.55, borderTopColor: COLORS.border },
  footerText: { position: "absolute", bottom: 28, left: 76, width: 350, color: COLORS.muted, fontSize: 6.3, textTransform: "uppercase" },
  pageNumber: { position: "absolute", bottom: 28, right: 76, width: 50, color: COLORS.muted, fontSize: 6.3, textAlign: "right" },

  sectionWrap: { marginBottom: 20 },
  sectionLabel: { marginBottom: 13, color: COLORS.turquoise, fontFamily: "Helvetica-Bold", fontSize: 7.6, letterSpacing: 0.9, textTransform: "uppercase" },
  sectionTitle: { color: COLORS.ink, fontFamily: "Times-Roman", fontSize: 27, lineHeight: 1.05 },
  titleRule: { width: 68, height: 3, marginTop: 22, marginBottom: 10, alignSelf: "center", backgroundColor: COLORS.turquoise },
  quote: { borderWidth: 0.65, borderColor: COLORS.border, borderLeftWidth: 3.5, borderLeftColor: COLORS.turquoise, backgroundColor: "#ffffff", paddingTop: 15, paddingRight: 20, paddingBottom: 15, paddingLeft: 28 },
  listRow: { flexDirection: "row" },
  listBullet: { width: 18, color: COLORS.turquoise, fontFamily: "Helvetica-Bold" },
  listText: { flexGrow: 1, flexBasis: 0 },
  continuationLabel: { marginBottom: 24, color: COLORS.turquoise, fontFamily: "Helvetica-Bold", fontSize: 7.6, letterSpacing: 0.9, textTransform: "uppercase" },
});

function Cover({ source, logoSrc }: { source: EditablePdfSourceV1; logoSrc?: string }) {
  const meta = [source.document.schedule ?? formatSynthesisDate(source.document.date), source.document.location].filter(Boolean).join("  ·  ");
  return <Page size={A4} style={styles.cover}>
    <View style={styles.coverStripeBar}>{STRIPES.map((color) => <View key={color} style={[styles.stripe, { backgroundColor: color }]} />)}</View>
    {logoSrc ? <Image src={logoSrc} style={styles.coverLogo} /> : <Text style={styles.coverFallbackLogo}>MINISTRY SCHOOL</Text>}
    <Text style={styles.coverCategory}>{source.document.category ?? "Support de cours"}  ·  2026–2027</Text>
    <Text style={styles.coverTitle}>{source.document.title}</Text>
    <View style={styles.coverRule} />
    <Text style={styles.coverSpeaker}>{source.document.speakers.join(" · ")}</Text>
    <Text style={styles.coverMeta}>{meta}</Text>
  </Page>;
}

function FixedFurniture({ source }: { source: EditablePdfSourceV1 }) {
  const identity = `${source.document.speakers.join(" · ")}  ·  ${formatSynthesisDate(source.document.date)}`;
  return <>
    <View style={styles.stripeBar}>{STRIPES.map((color) => <View key={color} style={[styles.stripe, { backgroundColor: color }]} />)}</View>
    <View style={styles.header}><Text style={styles.brand}>MINISTRY SCHOOL</Text><Text style={styles.headerTitle}>{source.document.title}</Text></View>
    <View style={styles.footerLine} />
    <Text style={styles.footerText}>{identity}</Text>
    <Text render={({ pageNumber, totalPages }) => String(pageNumber - 1).padStart(2, "0") + (totalPages > 2 ? `  /  ${String(totalPages - 1).padStart(2, "0")}` : "")} style={styles.pageNumber} />
  </>;
}

function blockFont(block: EditablePdfBlockV1) {
  if (block.style.fontRole === "display") return block.style.bold ? "Times-Bold" : "Times-Roman";
  if (block.style.fontRole === "label") return "Helvetica-Bold";
  return block.style.bold ? "Helvetica-Bold" : "Helvetica";
}

function sectionParts(text: string) {
  const match = text.match(/^(\d+)\.\s*([\s\S]*)$/);
  return match ? { label: `Section ${match[1].padStart(2, "0")}`, title: match[2] } : { label: "Section", title: text };
}

function EditableBlock({ block }: { block: EditablePdfBlockV1 }) {
  const dynamicStyle = {
    color: block.style.color,
    fontFamily: blockFont(block),
    fontSize: block.style.fontSize,
    lineHeight: block.style.lineHeight,
    marginTop: block.style.spaceBefore,
    marginBottom: block.style.spaceAfter,
    textDecoration: block.style.underline ? ("underline" as const) : undefined,
  };

  if (block.kind === "title") {
    const section = sectionParts(block.text);
    return <View wrap={false} style={[styles.sectionWrap, { marginTop: block.style.spaceBefore }]}>
      <Text style={styles.sectionLabel}>{section.label}</Text>
      <Text style={{ ...dynamicStyle, marginTop: 0, marginBottom: 0 }}>{section.title}</Text>
      <View style={styles.titleRule} />
    </View>;
  }

  if (block.kind === "quote") return <View wrap={false} style={[styles.quote, { marginTop: block.style.spaceBefore, marginBottom: block.style.spaceAfter }]}>
    <Text orphans={3} widows={3} style={{ ...dynamicStyle, marginTop: 0, marginBottom: 0 }}>{block.text}</Text>
  </View>;

  if (block.kind === "list-item") {
    const level = block.listLevel ?? 0;
    return <View wrap={false} style={[styles.listRow, { marginLeft: level * 18, marginTop: block.style.spaceBefore, marginBottom: block.style.spaceAfter }]}>
      <Text style={[styles.listBullet, { color: level ? COLORS.orange : COLORS.turquoise }]}>{level ? "–" : "•"}</Text>
      <Text style={[styles.listText, { ...dynamicStyle, marginTop: 0, marginBottom: 0 }]}>{block.text}</Text>
    </View>;
  }

  return <Text minPresenceAhead={block.kind === "heading" ? 44 : 0} orphans={3} widows={3} style={dynamicStyle}>{block.text}</Text>;
}

function continuationLabel(title?: string) {
  if (!title) return null;
  const section = sectionParts(title);
  return <Text style={styles.continuationLabel}>{section.label} · suite</Text>;
}

export default function EditablePdfProofDocument({ source, logoSrc }: { source: EditablePdfSourceV1; logoSrc?: string }) {
  return <Document title={source.document.title} author={source.document.speakers.join(", ")} subject="Support de cours Ministry School avec source structurée intégrée" creator="Ministry School — Source V1">
    <Cover source={source} logoSrc={logoSrc} />
    {paginateEditablePdfBlocks(source.blocks).map((group, pageIndex) => <Page key={`proof-page-${pageIndex}`} size={A4} wrap={false} style={styles.page}>
      <FixedFurniture source={source} />
      {continuationLabel(group.continuationOf)}
      {group.blocks.map((block) => <EditableBlock key={block.id} block={block} />)}
    </Page>)}
  </Document>;
}
