# Fonts

## Barabara (display / CDO brand)

The headings and the "CDO Jeepney Routes" wordmark use **Barabara**, a display
font that isn't on any web-font CDN, so it's loaded from this folder.

The font ships here as `public/fonts/Barabara.woff` and the `@font-face` is
declared in `assets/css/tailwind.css`. If the file is missing, headings fall
back to Helvetica (`font-display: swap`), so nothing breaks.

> Note: Barabara is licensed for **personal use**. Confirm you have a license
> that covers public/commercial deployment before shipping it.

Body / UI text uses **Helvetica** via a system font stack (Helvetica → Helvetica
Neue → Arial), so no font file is needed for normal text.
