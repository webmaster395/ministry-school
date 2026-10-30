type Font = "regular" | "bold";

const CP1252: Record<string, number> = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87,
  "ˆ": 0x88, "‰": 0x89, "Š": 0x8a, "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e,
  "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
  "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f,
};

const hexText = (value: string) => Array.from(value.normalize("NFC")).map((character) => {
  const code = character.charCodeAt(0);
  const byte = code <= 0xff ? code : CP1252[character] ?? 0x3f;
  return byte.toString(16).padStart(2, "0");
}).join("");

const clean = (value: string) => value.replace(/\s+/g, " ").trim();

function wrap(value: string, maxCharacters: number) {
  const words = clean(value).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (word.length > maxCharacters) {
      if (line) lines.push(line);
      for (let index = 0; index < word.length; index += maxCharacters) lines.push(word.slice(index, index + maxCharacters));
      line = "";
      continue;
    }
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxCharacters && line) { lines.push(line); line = word; }
    else line = candidate;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export class SimplePdf {
  private pages: string[][] = [];
  private commands: string[] = [];
  private y = 790;
  private pageNumber = 0;

  constructor(private title: string) { this.addPage(); }

  private addPage() {
    if (this.commands.length) this.pages.push(this.commands);
    this.commands = [];
    this.pageNumber += 1;
    this.y = 790;
    if (this.pageNumber > 1) {
      this.text("MINISTRY SCHOOL · PROJETS ET FORMATIONS", 8, "bold", 48, this.y, "0.36 0.40 0.39");
      this.y -= 24;
    }
  }

  private ensure(height: number) { if (this.y - height < 54) this.addPage(); }

  private text(value: string, size: number, font: Font, x: number, y: number, color = "0.12 0.16 0.15") {
    this.commands.push(`BT /${font === "bold" ? "F2" : "F1"} ${size} Tf ${color} rg ${x} ${y} Td <${hexText(value)}> Tj ET`);
  }

  banner(type: string, service: string | null) {
    const top = 792;
    const choices = [25, 23, 21, 19];
    let titleSize = choices.at(-1) ?? 19;
    let titleLines = wrap(this.title, Math.floor(800 / titleSize));
    for (const candidate of choices) {
      const candidateLines = wrap(this.title, Math.floor(800 / candidate));
      if (candidateLines.length <= 4) {
        titleSize = candidate;
        titleLines = candidateLines;
        break;
      }
    }
    const lineHeight = titleSize + 5;
    const firstTitleBaseline = top - 67;
    const lastTitleBaseline = firstTitleBaseline - (titleLines.length - 1) * lineHeight;
    const serviceBaseline = service ? lastTitleBaseline - lineHeight - 1 : null;
    const bottom = Math.min(642, (serviceBaseline ?? lastTitleBaseline) - 22);
    const height = top - bottom;
    this.commands.push(`0.12 0.16 0.15 rg 36 ${bottom} 523 ${height} re f`);
    this.commands.push(`0.96 0.63 0.16 rg 36 ${bottom} 7 ${height} re f`);
    this.text(type.toLocaleUpperCase("fr-FR"), 9, "bold", 58, top - 32, "0.96 0.63 0.16");
    titleLines.forEach((line, index) => this.text(line, titleSize, "bold", 58, firstTitleBaseline - index * lineHeight, "1 1 1"));
    if (service && serviceBaseline !== null) this.text(`Service pilote : ${service}`, 10, "regular", 58, serviceBaseline, "0.83 0.86 0.85");
    this.y = bottom - 32;
  }

  heading(value: string) {
    // Le titre et au moins une ligne de son contenu restent sur la même page.
    this.ensure(72);
    this.commands.push(`0.96 0.63 0.16 rg 48 ${this.y - 3} 20 3 re f`);
    this.text(value, 16, "bold", 48, this.y - 25);
    this.y -= 46;
  }

  subheading(value: string) {
    this.ensure(48);
    this.text(value, 11, "bold", 48, this.y);
    this.y -= 20;
  }

  paragraph(value: string, options: { bullet?: boolean; listMarker?: string; muted?: boolean; preserveLineBreaks?: boolean } = {}) {
    const marker = options.listMarker ?? (options.bullet ? "•" : "");
    const sourceLines = options.preserveLineBreaks ? value.replace(/\r\n?/g, "\n").split("\n") : [value];
    const lines = sourceLines.flatMap((line) => wrap(line, marker ? 86 : 94));
    const blockHeight = lines.length * 15 + 7;
    // Une étape pédagogique ou un élément de liste ne se coupe pas lorsque le
    // bloc tient sur une page complète. Les contenus exceptionnellement longs
    // conservent le repli ligne par ligne.
    if (blockHeight <= 700) this.ensure(blockHeight);
    lines.forEach((line, index) => {
      if (blockHeight > 700) this.ensure(15);
      const prefix = marker && index === 0 ? `${marker} ` : marker ? "   " : "";
      this.text(`${prefix}${line}`, 10, "regular", marker ? 56 : 48, this.y, options.muted ? "0.38 0.42 0.41" : undefined);
      this.y -= 15;
    });
    this.y -= 7;
  }

  keyValue(label: string, value: string) {
    this.ensure(22);
    this.text(`${label} :`, 10, "bold", 48, this.y);
    this.text(value, 10, "regular", 160, this.y);
    this.y -= 20;
  }

  finish() {
    this.pages.push(this.commands);
    const objects: string[] = ["", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"];
    const kids: string[] = [];
    this.pages.forEach((pageCommands, index) => {
      const pageObject = 5 + index * 2;
      const contentObject = pageObject + 1;
      const footer = `BT /F1 8 Tf 0.42 0.45 0.44 rg 48 28 Td <${hexText(`Ministry School · ${index + 1} / ${this.pages.length}`)}> Tj ET`;
      const stream = `${pageCommands.join("\n")}\n${footer}`;
      objects[pageObject - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObject} 0 R >>`;
      objects[contentObject - 1] = `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`;
      kids.push(`${pageObject} 0 R`);
    });
    objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[1] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${this.pages.length} >>`;
    let output = "%PDF-1.4\n%MSPDF\n";
    const offsets = [0];
    objects.forEach((object, index) => { offsets.push(Buffer.byteLength(output, "latin1")); output += `${index + 1} 0 obj\n${object}\nendobj\n`; });
    const xref = Buffer.byteLength(output, "latin1");
    output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let index = 1; index <= objects.length; index += 1) output += `${offsets[index].toString().padStart(10, "0")} 00000 n \n`;
    output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new Uint8Array(Buffer.from(output, "latin1"));
  }
}
