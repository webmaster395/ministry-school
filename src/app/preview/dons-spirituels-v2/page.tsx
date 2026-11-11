import SpiritualGiftsPreview from "./preview-client";

export const dynamic = "force-dynamic";

export default function SpiritualGiftsPreviewPage() {
  if (process.env.NODE_ENV === "production") return null;
  return <SpiritualGiftsPreview />;
}
