// accountHelper.ts
import { showMessage } from "../../Slices/snackbarSlice";
import { AppDispatch } from "../store";
import { CompanyAccountType, PostType } from "../types";

  export const normalizeString = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "") // Remove non-alphanumeric characters
      .replace(/\b(s|n|e|w)\b/g, (match) => {
        const directions: { [key: string]: string } = {
          s: "south",
          n: "north",
          e: "east",
          w: "west",
        };
        return directions[match];
      })
      .replace(/\b(se|ne|nw|sw)\b/g, (match) => {
        const expanded: { [key: string]: string } = {
          se: "southeast",
          ne: "northeast",
          nw: "northwest",
          sw: "southwest",
        };
        return expanded[match];
      })
      .replace(/\broad\b/g, "rd")
      .replace(/\bstreet\b/g, "st")
      .replace(/\bavenue\b/g, "ave")
      .replace(/\bboulevard\b/g, "blvd")
      .replace(/\bdrive\b/g, "dr")
      .replace(/\blane\b/g, "ln")
      .replace(/\bparkway\b/g, "pkwy")
      .replace(/\bplace\b/g, "pl")
      .replace(/\bcourt\b/g, "ct")
      .replace(/\s+/g, ""); // Remove spaces




  export const matchAccountWithSelectedStoreForAdmin = (
    selectedStoreByAddress: {
      name: string;
      address: string;
      city: string;
      state: string;
    },
    accounts: CompanyAccountType[],
    setPost:  React.Dispatch<React.SetStateAction<PostType>>,
    setClosestMatches: React.Dispatch<React.SetStateAction<CompanyAccountType[]>>,
    setIsMatchSelectionOpen: React.Dispatch<React.SetStateAction<boolean>>,
    dispatch: any,
  ) => {
    console.log("Matching store to accounts:", selectedStoreByAddress);

    // Normalize and truncate the selected store details
    const normalizedAddress = normalizeString(
      selectedStoreByAddress.address
    ).substring(0, 10);
    const normalizedName = normalizeString(
      selectedStoreByAddress.name
    ).substring(0, 10);

    console.log("Normalized Address (10):", normalizedAddress);
    console.log("Normalized Name (10):", normalizedName);

    // Find a perfect match
    const perfectMatch = accounts.find((account) => {
      const normalizedAccountAddress = normalizeString(
        account.accountAddress
      ).substring(0, 10);
      const normalizedAccountName = normalizeString(
        account.accountName
      ).substring(0, 10);

      return (
        normalizedAccountAddress === normalizedAddress &&
        normalizedAccountName === normalizedName
      );
    });

    if (perfectMatch) {
      console.log("Perfect match found:", perfectMatch);
      setPost((prev: PostType) => ({
        ...prev,
        accountNumber: perfectMatch.accountNumber.toString(),
        selectedStore: perfectMatch.accountName,
        storeAddress: perfectMatch.accountAddress,
      }));
      return; // Exit early since we found a perfect match
    }

    console.warn("No perfect match found. Finding closest matches...");

    // Find the closest matches
    const topClosestMatches = accounts
      .map((account) => {
        const normalizedAccountAddress = normalizeString(
          account.accountAddress
        ).substring(0, 10);
        const addressSimilarity =
          normalizedAccountAddress === normalizedAddress ? 1 : 0;

        return { account, addressSimilarity };
      })
      .filter(({ addressSimilarity }) => addressSimilarity > 0)
      .sort((a, b) => b.addressSimilarity - a.addressSimilarity)
      .map(({ account }) => account);

    if (topClosestMatches.length === 1) {
      // Auto-select the only closest match
      const closestMatch = topClosestMatches[0];
      console.log("Auto-selecting the only closest match:", closestMatch);
      setPost((prev) => ({
        ...prev,
        accountNumber: closestMatch.accountNumber.toString(),
        selectedStore: closestMatch.accountName,
        storeAddress: closestMatch.accountAddress,
      }));
    } else if (topClosestMatches.length > 0) {
      console.log("Multiple closest matches found:", topClosestMatches);
      setClosestMatches(topClosestMatches);
      setIsMatchSelectionOpen(true); // Open modal for user selection
    } else {
      console.warn("No close matches found.");
      dispatch(
        showMessage(
          "No match found in your accounts. Try toggling 'All Stores' to search all company accounts."
        )
      );
    }
  };