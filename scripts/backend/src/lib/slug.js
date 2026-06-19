/**
 * Slug / key helpers.
 *
 * @package EventKoi
 */

// Letters that do not decompose to an ASCII base under Unicode NFD, so they need
// an explicit mapping before slugifying.
const NON_DECOMPOSING = {
  ß: "ss",
  æ: "ae",
  œ: "oe",
  ø: "o",
  ð: "d",
  þ: "th",
  ł: "l",
  đ: "d",
  ħ: "h",
};

/**
 * Fold accented/diacritic letters to their ASCII base (é→e, à→a, ç→c, ñ→n…).
 *
 * Mirrors what WordPress `remove_accents()` does on the PHP side. Without this,
 * the slug/key regexes treat every accented letter as a non-word character and
 * replace it with a separator, e.g. "Briançonnais" → "brian-onnais".
 *
 * @param {string} value Raw value.
 * @return {string} ASCII-folded value.
 */
export function foldAccents(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ßæœøðþłđħ]/gi, (ch) =>
      NON_DECOMPOSING[ch.toLowerCase()] ?? ch
    );
}
