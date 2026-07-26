/**
 * Stub for @wordpress/i18n.
 *
 * WordPress provides this at runtime via the wpExternals Vite plugin, so it is
 * not installed in node_modules. Translation is identity here; only the
 * formatting behaviour of sprintf matters to the snapshots.
 */

export function __(text) {
  return text;
}

export function _x(text) {
  return text;
}

export function _n(single, plural, number) {
  return number === 1 ? single : plural;
}

export function sprintf(format, ...args) {
  let auto = 0;

  return String(format).replace(
    /%(?:(\d+)\$)?([sd%])/g,
    (match, position, type) => {
      if (type === '%') {
        return '%';
      }

      const value = position ? args[Number(position) - 1] : args[auto++];

      if (type === 'd') {
        return String(Number(value));
      }

      return String(value);
    }
  );
}

export default { __, _x, _n, sprintf };
