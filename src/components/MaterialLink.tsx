type FileKind = "pdf" | "doc" | "slides" | "sheet" | "image" | "video" | "link";

function detectKind(url: string): FileKind {
  const clean = url.split("?")[0].toLowerCase();

  if (clean.endsWith(".pdf")) return "pdf";
  if (/\.(docx?|odt|rtf)$/.test(clean)) return "doc";
  if (/\.(pptx?|odp)$/.test(clean)) return "slides";
  if (/\.(xlsx?|csv|ods)$/.test(clean)) return "sheet";
  if (/\.(png|jpe?g|gif|webp|svg)$/.test(clean)) return "image";
  if (/\.(mp4|mov|avi|webm)$/.test(clean)) return "video";

  // Services d'hébergement courants, reconnus par leur adresse
  if (clean.includes("docs.google.com/presentation")) return "slides";
  if (clean.includes("docs.google.com/spreadsheets")) return "sheet";
  if (clean.includes("docs.google.com/document")) return "doc";
  if (clean.includes("youtube.com") || clean.includes("youtu.be") || clean.includes("vimeo.com"))
    return "video";

  return "link";
}

const labels: Record<FileKind, string> = {
  pdf: "PDF",
  doc: "Document",
  slides: "Présentation",
  sheet: "Tableur",
  image: "Image",
  video: "Vidéo",
  link: "Lien",
};

function KindIcon({ kind }: { kind: FileKind }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (kind === "video") {
    return (
      <svg {...common}>
        <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
        <path d="m10 9.5 5 2.5-5 2.5v-5Z" />
      </svg>
    );
  }

  if (kind === "image") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9.5" r="1.5" />
        <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
      </svg>
    );
  }

  if (kind === "link") {
    return (
      <svg {...common}>
        <path d="M10 13a4 4 0 0 0 5.7.4l3-3a4 4 0 0 0-5.7-5.7L11.5 6" />
        <path d="M14 11a4 4 0 0 0-5.7-.4l-3 3a4 4 0 0 0 5.7 5.7l1.4-1.4" />
      </svg>
    );
  }

  // Document, PDF, présentation, tableur : feuille avec un repère distinctif
  return (
    <svg {...common}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
      {kind === "pdf" && <path d="M8.5 15.5h7" />}
      {kind === "slides" && <rect x="8.5" y="12.5" width="7" height="5" rx="0.8" />}
      {kind === "sheet" && <path d="M8.5 13h7M8.5 16h7M12 13v4" />}
    </svg>
  );
}

export default function MaterialLink({ title, url }: { title: string; url: string | null }) {
  if (!url) {
    return (
      <span className="flex items-center gap-2 text-foreground">
        <span className="text-muted">
          <KindIcon kind="link" />
        </span>
        <span className="font-medium">{title}</span>
      </span>
    );
  }

  const kind = detectKind(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-2 text-link"
      title={`Ouvrir « ${title} » dans un nouvel onglet`}
    >
      <span className="text-muted transition group-hover:text-link">
        <KindIcon kind={kind} />
      </span>
      <span className="font-medium group-hover:underline">{title}</span>
      <span className="label rounded border border-border px-1.5 py-0.5 text-[10px] tracking-[0.12em] text-muted">
        {labels[kind]}
      </span>
      {/* Indique une ouverture hors de la page courante */}
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-muted transition group-hover:text-link"
        aria-hidden="true"
      >
        <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
      </svg>
    </a>
  );
}
