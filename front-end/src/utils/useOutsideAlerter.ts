// useOutsideAlerter.ts
import { RefObject, useEffect } from "react";
export const useOutsideAlerter = (
  ref: RefObject<HTMLElement>,
  onClose: () => void,
) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, onClose]);
};
