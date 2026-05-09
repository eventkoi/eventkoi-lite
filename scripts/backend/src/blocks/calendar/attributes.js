let attrs = {
  calendars: {
    type: "array",
  },
  selectAllCalendars: {
    type: "boolean",
    default: false,
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
