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
};

export default { attributes };
