// sendAchievementToGalloAxis.ts
import { NavigateFunction } from "react-router-dom";
import { AchievementPayloadType } from "../types";
import { showMessage } from "../../Slices/snackbarSlice";

// Import the Gallo base URL from environment variables
// const galloBaseUrl = import.meta.env.REACT_APP_GALLO_BASE_URL;
const galloBaseUrl = "https://6w7u156vcb.execute-api.us-west-2.amazonaws.com";

export const sendAchievementToGalloAxis = async (
  payload: AchievementPayloadType,
  apiKey: string,
  dispatch: (action: any) => void
): Promise<void> => {
  try {
    if (!galloBaseUrl) {
      throw new Error(
        "Gallo base URL is not defined in environment variables."
      );
    }

    if (!payload.oppId || typeof payload.oppId !== "string") {
      throw new Error("Invalid oppId provided in payload.");
    }

    // Format the closedDate into 'MM-DD-YYYY'
    if (payload.closedDate) {
      const [year, month, day] = payload.closedDate.split("-"); // Assuming original format is YYYY-MM-DD
      payload.closedDate = `${month}-${day}-${year}`; // Convert to MM-DD-YYYY
    }

    const galloEndpointUrl = `${galloBaseUrl}/healy/achievements`;

    // Build the payload to match the expected structure
    const formattedPayload = {
      oppId: payload.oppId,
      closedBy: payload.closedBy,
      closedDate: payload.closedDate,
      closedUnits: payload.closedUnits,
      photos: payload.photos.map((photo) => ({
        file: photo.file, // Ensure each photo is an object with a 'file' key
      })),
    };

    console.log("Sending formatted payload to Gallo API:", formattedPayload);

    const vercelPayload = {
      baseUrl: galloEndpointUrl,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: formattedPayload,
    };

    const response = await fetch(
      "https://my-fetch-data-api.vercel.app/api/fetchData",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vercelPayload),
      }
    );

    const rawResponse = await response.text(); // Always read the response once
    console.log("Raw Response from Vercel Function:", rawResponse);

    if (response.ok) {
      // ✅ Success
      dispatch(showMessage("Achievement successfully sent to Gallo API!"));
    } else if (response.status === 403) {
      // ✅ Treat Forbidden as soft success
      console.warn(
        "Gallo API returned 403 Forbidden, but treating as soft success since Gallo may have processed the payload."
      );
      dispatch(
        showMessage(
          "Gallo API responded with 403 Forbidden. We'll check with Gallo to confirm receipt, but your post has been saved."
        )
      );
    } else {
      // Handle error responses
      console.error(
        `Failed to send achievement: ${response.status} - ${rawResponse}`
      );
      dispatch(
        showMessage(
          `Failed to send achievement: ${response.status} - ${rawResponse}`
        )
      );
      throw new Error(rawResponse);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error in sendAchievementToGalloAxis:", error.message);
      dispatch(showMessage(`Error: ${error.message}`)); // Inform user of critical failure
    } else {
      console.error("An unknown error occurred:", error);
      dispatch(
        showMessage("An unknown error occurred while sending the achievement.")
      );
    }
    throw error; // Re-throw to allow upstream handling
  }
};
