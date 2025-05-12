// updateLocationsCollection

import { arrayUnion } from "firebase/firestore";
import { db } from "../firebase";
import { doc } from "firebase/firestore";
import { runTransaction } from "firebase/firestore";

export const updateLocationsCollection = async (
  stateName: string,
  cityName: string,
) => {
  const stateDocRef = doc(db, "locations", stateName);

  try {
    await runTransaction(db, async (transaction) => {
      const stateDoc = await transaction.get(stateDocRef);
      if (!stateDoc.exists()) {
        transaction.set(stateDocRef, { cities: [cityName] });
      } else {
        const data = stateDoc.data();
        if (data && !data.cities.includes(cityName)) {
          transaction.update(stateDocRef, { cities: arrayUnion(cityName) });
        }
      }
    });
    return true; // Indicates success
  } catch (error) {
    console.error(`Error updating location: ${error}`);
    throw error; // Re-throw to allow the caller to handle it
  }
};
