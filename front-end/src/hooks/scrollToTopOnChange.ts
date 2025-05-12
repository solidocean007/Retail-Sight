import { RefObject, useEffect } from "react";
import { VariableSizeList } from "react-window";

const useScrollToTopOnChange = (
  listRef: RefObject<VariableSizeList>,
  activePostSet: string, // This will trigger the effect when the active post set changes
) => {
  useEffect(() => {
    // Always scroll to the top when the active post set changes
    listRef.current?.scrollTo(0);
  }, [activePostSet, listRef]);
};

export default useScrollToTopOnChange;
