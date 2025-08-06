import { PencilLine } from "lucide-react";

import { Panel } from "@/components/panel";

export function EventName({ event, setEvent }) {
  const updateEventName = (e) => {
    setEvent((prevState) => ({
      ...prevState,
      title: e.currentTarget.textContent,
    }));
  };

  return (
    <Panel className="flex-row items-center">
      <div
        className="inline-flex rounded-md items-center px-2 py-1 cursor-pointer font-medium text-lg border border-transparent hover:border-input"
        contentEditable
        spellCheck={false}
        placeholder="Click to add event name"
        dangerouslySetInnerHTML={{
          __html: event?.title,
        }}
        onBlur={(e) => updateEventName(e)}
        onKeyDown={(e) => e.key === "Enter" && updateEventName(e)}
      />
      <PencilLine className="w-3.5 h-3.5 text-ring" />
    </Panel>
  );
}
