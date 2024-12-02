// sendAchievementToGalloAxis.ts
import { NavigateFunction } from "react-router-dom";
import { AchievementPayloadType } from "../types";

// Import the Gallo base URL from environment variables
// const galloBaseUrl = import.meta.env.REACT_APP_GALLO_BASE_URL;
const galloBaseUrl ='https://6w7u156vcb.execute-api.us-west-2.amazonaws.com';

export const sendAchievementToGalloAxis = async (
  payload: AchievementPayloadType,
  apiKey: string,
  navigate: NavigateFunction
): Promise<void> => {
  try {
    if (!galloBaseUrl) {
      throw new Error("Gallo base URL is not defined in environment variables.");
    }

    if (!payload.oppId || typeof payload.oppId !== "string") {
      throw new Error("Invalid oppId provided in payload.");
    }

    // Format the closedDate into 'DD-MM-YYYY'
    if (payload.closedDate) {
      const [year, day, month] = payload.closedDate.split("-");
      payload.closedDate = `${day}-${month}-${year}`; // Convert to 'DD-MM-YYYY'
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

    const response = await fetch("https://my-fetch-data-api.vercel.app/api/fetchData", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vercelPayload),
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      if (response.status === 500 && errorDetails.includes("Achievement already sent")) {
        // Non-critical error: Achievement already sent
        throw new Error("Achievement already sent");
      } else if (response.status === 500 || response.status === 400) {
        // Log unexpected server error
        throw new Error(`Server Error: ${response.status} - ${errorDetails}`);
      } else {
        throw new Error("Unexpected response format");
      }
    }

    console.log("Achievement successfully sent to Gallo API!");
  } catch (error: any) {
    if (!error.message) {
      console.warn("Non-critical error: No error message provided.");
      return; // Consider this a non-blocking error
    }

    if (error.message === "Achievement already sent") {
      // Non-critical but notify the user
      throw new Error(error.message);
    } else {
      console.error("Critical error in sendAchievementToGalloAxis:", error);
      throw new Error(error.message || "Critical failure: Unknown error occurred.");
    }
  } finally {
    navigate("/user-home-page")
  }
};

