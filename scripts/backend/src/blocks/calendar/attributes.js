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
  default_month: {
    type: "string",
    default: "",
  },
  default_year: {
    type: "string",
    default: "",
  },
  color: {
    type: "string",
  },
};

export const attributes = attrs;

export default { attributes };
