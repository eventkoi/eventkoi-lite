import { useRef } from "react";

export function useAutoSave(saveFunction, delay = 2000) {
  const timeoutRef = useRef();

  const triggerAutoSave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      saveFunction();
    }, delay);
  };

  return {
    triggerAutoSave,
    cancelAutoSave: () => clearTimeout(timeoutRef.current),
  };
}
