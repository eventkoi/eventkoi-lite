// components/order/AnswerInput.js
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { __ } from "@wordpress/i18n";

export const isBlankAnswer = (value) =>
  Array.isArray(value) ? value.length === 0 : String(value ?? "").trim() === "";

export const formatAnswer = (value) =>
  Array.isArray(value) ? value.join(", ") : String(value ?? "");

/**
 * One editable answer to a custom checkout, attendee or RSVP field.
 *
 * @param {Object}   props
 * @param {Object}   props.field    Field definition: type, options.
 * @param {string}   props.id       Input id for the label.
 * @param {*}        props.value    Current answer.
 * @param {Function} props.onChange Receives the new answer.
 */
export function AnswerInput({ field, id, value, onChange }) {
  const options = Array.isArray(field.options) ? field.options : [];
  const type = field.type === "select" ? "dropdown" : field.type;

  if ((type === "dropdown" || type === "radio") && options.length > 0) {
    const current = Array.isArray(value) ? value[0] || "" : String(value ?? "");
    return (
      <select
        id={id}
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">{__("Not answered", "eventkoi-lite")}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (type === "checkbox" && options.length > 0) {
    const picked = Array.isArray(value) ? value : value ? [String(value)] : [];
    return (
      <div className="grid gap-1.5">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={picked.includes(option)}
              onCheckedChange={(checked) =>
                onChange(
                  checked
                    ? [...picked, option]
                    : picked.filter((item) => item !== option)
                )
              }
            />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          id={id}
          checked={!!value && value !== "0"}
          onCheckedChange={(checked) => onChange(checked ? "1" : "")}
        />
        {__("Yes", "eventkoi-lite")}
      </label>
    );
  }

  if (type === "textarea") {
    return (
      <Textarea
        id={id}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
      />
    );
  }

  return (
    <Input
      id={id}
      type={["email", "tel", "number", "url"].includes(type) ? type : "text"}
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
