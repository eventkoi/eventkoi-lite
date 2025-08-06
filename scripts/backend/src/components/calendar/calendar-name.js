import { useEffect, useRef, useState } from "react";

import { PencilLine } from "lucide-react";

import { Panel } from "@/components/panel";

export function CalendarName({ calendar, setCalendar }) {
  const focusRef = useRef(null);
  const [error, setError] = useState(false);

  const updateCalendarName = (e) => {
    var value = e.currentTarget.textContent.trim();
    setCalendar((prevState) => ({
      ...prevState,
      name: value,
    }));

    if (value) {
      e.currentTarget.classList.remove("eventkoi-error");
      setError(false);
    } else {
      e.currentTarget.classList.add("eventkoi-error");
      setError(true);
    }
  };

  const setEndOfContenteditable = (contentEditableElement) => {
    var range, selection;
    if (document.createRange) {
      //Firefox, Chrome, Opera, Safari, IE 9+
      range = document.createRange(); //Create a range (a range is a like the selection but invisible)
      range.selectNodeContents(contentEditableElement); //Select the entire contents of the element with the range
      range.collapse(false); //collapse the range to the end point. false means collapse to end rather than the start
      selection = window.getSelection(); //get the selection object (allows you to change selection)
      selection.removeAllRanges(); //remove any selections already made
      selection.addRange(range); //make the range you have just created the visible selection
    } else if (document.selection) {
      //IE 8 and lower
      range = document.body.createTextRange(); //Create a range (a range is a like the selection but invisible)
      range.moveToElementText(contentEditableElement); //Select the entire contents of the element with the range
      range.collapse(false); //collapse the range to the end point. false means collapse to end rather than the start
      range.select(); //Select the range (make it the visible selection
    }
  };

  useEffect(() => {
    if (focusRef.current && calendar.name?.length === 0) {
      focusRef.current.focus();
    }
  }, []);

  return (
    <Panel className="flex-row items-center flex-wrap gap-y-1">
      <div
        ref={focusRef}
        id="calendar-name"
        className="inline-flex rounded-md items-center px-2 py-1 cursor-pointer font-medium text-lg border-2 border-transparent hover:border-input focus:border-input active:border-input"
        contentEditable
        spellCheck={false}
        placeholder="Enter calendar name"
        dangerouslySetInnerHTML={{
          __html: calendar?.name,
        }}
        onBlur={(e) => updateCalendarName(e)}
        onKeyDown={(e) => e.key === "Enter" && updateCalendarName(e)}
      />
      <div
        onClick={() => {
          var elem = document.getElementById("calendar-name");
          setEndOfContenteditable(elem);
          focusRef.current.focus();
        }}
        className="cursor-pointer inline-flex items-center gap-x-1"
      >
        <PencilLine className="w-3.5 h-3.5 text-ring" />
        <span className="text-xs">Click to edit</span>
      </div>
      {error && (
        <p className="w-full text-xs text-[#d13d3d]">
          Calendar name cannot be blank
        </p>
      )}
    </Panel>
  );
}
