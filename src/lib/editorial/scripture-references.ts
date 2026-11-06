export type ScriptureLink = { label: string; url?: string };

// Chapter URLs verified against YouVersion's PDV2017 pages. We intentionally
// link to chapters rather than manufacture unsupported range URLs.
const pdv2017ChapterUrls: Record<string, string> = {
  "Genèse 12": "https://www.bible.com/fr/bible/133/GEN.12.PDV2017",
  "Genèse 13": "https://www.bible.com/fr/bible/133/GEN.13.PDV2017",
  "Genèse 14": "https://www.bible.com/fr/bible/133/GEN.14.PDV2017",
  "Genèse 15": "https://www.bible.com/fr/bible/133/GEN.15.PDV2017",
  "Genèse 16": "https://www.bible.com/fr/bible/133/GEN.16.PDV2017",
  "Genèse 17": "https://www.bible.com/fr/bible/133/GEN.17.PDV2017",
  "Genèse 18": "https://www.bible.com/fr/bible/133/GEN.18.PDV2017",
  "Genèse 21": "https://www.bible.com/fr/bible/133/GEN.21.PDV2017",
  "Genèse 22": "https://www.bible.com/fr/bible/133/GEN.22.PDV2017",
  "Actes 2": "https://www.bible.com/fr/bible/133/ACT.2.PDV2017",
  "Actes 8": "https://www.bible.com/fr/bible/133/ACT.8.PDV2017",
  "Actes 9": "https://www.bible.com/fr/bible/133/ACT.9.PDV2017",
  "Actes 13": "https://www.bible.com/fr/bible/133/ACT.13.PDV2017",
  "Actes 14": "https://www.bible.com/fr/bible/133/ACT.14.PDV2017",
  "Actes 15": "https://www.bible.com/fr/bible/133/ACT.15.PDV2017",
  "Actes 17": "https://www.bible.com/fr/bible/133/ACT.17.PDV2017",
  "Hébreux 11": "https://www.bible.com/fr/bible/133/HEB.11.PDV2017",
  "2 Timothée 4": "https://www.bible.com/fr/bible/133/2TI.4.PDV2017",
  "2 Corinthiens 12": "https://www.bible.com/fr/bible/133/2CO.12.PDV2017",
  "Matthieu 14": "https://www.bible.com/fr/bible/133/MAT.14.PDV2017",
  "Matthieu 16": "https://www.bible.com/fr/bible/133/MAT.16.PDV2017",
  "Matthieu 17": "https://www.bible.com/fr/bible/133/MAT.17.PDV2017",
  "Luc 22": "https://www.bible.com/fr/bible/133/LUK.22.PDV2017",
  "Jean 21": "https://www.bible.com/fr/bible/133/JHN.21.PDV2017",
  "Exode 3": "https://www.bible.com/fr/bible/133/EXO.3.PDV2017",
  "Exode 4": "https://www.bible.com/fr/bible/133/EXO.4.PDV2017",
  "Exode 18": "https://www.bible.com/fr/bible/133/EXO.18.PDV2017",
  "Exode 25": "https://www.bible.com/fr/bible/133/EXO.25.PDV2017",
  "Nombres 13": "https://www.bible.com/fr/bible/133/NUM.13.PDV2017",
  "Nombres 20": "https://www.bible.com/fr/bible/133/NUM.20.PDV2017",
  "Deutéronome 31": "https://www.bible.com/fr/bible/133/DEU.31.PDV2017",
};

const verifiedExactUrls: Record<string, string> = {
  "2 Corinthiens 3:18": "https://www.bible.com/fr/bible/93/2CO.3.18.LSG",
  "Romains 8:29": "https://www.bible.com/fr/bible/93/ROM.8.29.LSG",
  "1 Corinthiens 11:1": "https://www.bible.com/fr/bible/93/1CO.11.1.LSG",
};

export function formatBibleReference(reference: string) {
  return reference.replace(/(\d+)\.(?=\d)/g, "$1:");
}

export function resolveScriptureLinks(reference: string): ScriptureLink[] {
  let currentBook = "";
  return reference.split(/\s*·\s*/).map((rawPart) => {
    const label = formatBibleReference(rawPart.trim());
    const match = label.match(/^(.+?)\s+(\d+):/);
    if (match) currentBook = match[1];
    const chapterMatch = label.match(/^(?:(.+?)\s+)?(\d+):/);
    const book = chapterMatch?.[1] || currentBook;
    const chapter = chapterMatch?.[2];
    return { label, url: verifiedExactUrls[label] ?? (book && chapter ? pdv2017ChapterUrls[`${book} ${chapter}`] : undefined) };
  });
}
