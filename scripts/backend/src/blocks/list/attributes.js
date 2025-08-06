let attrs = {
  calendars: {
    type: "array",
  },
  startday: {
    type: "string",
  },
  timeframe: {
    type: "string",
  },
  color: {
    type: "string",
  },
  borderSize: {
    type: "string",
    default: "2px",
  },
  borderStyle: {
    type: "string",
    default: "dotted",
  },
  showImage: {
    type: "boolean",
    default: true,
  },
  showLocation: {
    type: "boolean",
    default: true,
  },
  showDescription: {
    type: "boolean",
    default: true,
  },
};

export const attributes = attrs;

export default { attributes };
