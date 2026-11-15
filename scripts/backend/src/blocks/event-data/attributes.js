export const attributes = {
  field: {
    type: "string",
    default: "title", // title | excerpt | timeline | location | image
  },
  tagName: {
    type: "string",
    default: "div",
  },
  textAlign: {
    type: "string",
  },
  className: {
    type: "string",
  },
  eventId: {
    type: "integer",
    default: 0, // 0 = inherit from context; >0 = override with specific event
  },
  dateFormat: {
    type: "string",
    default: "", // PHP date format override; blank = use global EventKoi setting.
  },
  timeFormat: {
    type: "string",
    default: "", // PHP time format override; blank = use global EventKoi setting.
  },
  showAllDates: {
    type: "boolean",
    default: false, // Selected Days events list every date, also in a query loop.
  },
  showDailyTimes: {
    type: "boolean",
    default: false, // Consecutive Days events show their dates, then start and end time.
  },
  excerptLength: {
    type: "integer",
    default: 0, // Max words for the description field; 0 = show it all.
  },
};

export default { attributes };
