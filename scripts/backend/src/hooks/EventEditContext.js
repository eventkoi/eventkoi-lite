import { createContext, useContext, useState } from "react";

export const EventEditContext = createContext(null);

export function EventEditProvider({ children }) {
  const [event, setEvent] = useState({});
  const [isPublishing, setIsPublishing] = useState(false);
  const [disableAutoSave, setDisableAutoSave] = useState(false); // ✅

  return (
    <EventEditContext.Provider
      value={{
        event,
        setEvent,
        isPublishing,
        setIsPublishing,
        disableAutoSave,
        setDisableAutoSave, // ✅
      }}
    >
      {children}
    </EventEditContext.Provider>
  );
}

export function useEventEditContext() {
  const context = useContext(EventEditContext);
  if (!context) {
    throw new Error(
      "useEventEditContext must be used within an EventEditContext.Provider"
    );
  }
  return context;
}
