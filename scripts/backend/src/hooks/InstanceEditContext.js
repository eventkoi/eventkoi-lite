import { createContext, useContext } from "react";

export const InstanceEditContext = createContext(null);

export const useInstanceEditContext = () => {
  return useContext(InstanceEditContext);
};
