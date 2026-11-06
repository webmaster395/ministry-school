// Build-only fixture for a network-isolated validation workspace. Next.js
// treats non-absolute font URLs as in-memory bytes when its mock mode is set.
// Production never sets NEXT_FONT_GOOGLE_MOCKED_RESPONSES and keeps the real
// next/font behavior.
module.exports = new Proxy({}, {
  get(_target, url) {
    const family = String(url).includes("Jost")
      ? "Jost"
      : String(url).includes("Bricolage")
        ? "Bricolage Grotesque"
        : "Geist";
    return `@font-face{font-family:'${family}';font-style:normal;font-weight:100 900;src:url(https://fonts.gstatic.com/s/mock/mock-${family.replaceAll(" ", "-")}.woff2) format('woff2');}`;
  },
});
