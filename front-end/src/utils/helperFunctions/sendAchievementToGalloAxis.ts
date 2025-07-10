// sendAchievementToGalloAxis.ts
import { NavigateFunction } from "react-router-dom";
import { AchievementPayloadType } from "../types";
import { showMessage } from "../../Slices/snackbarSlice";

// Import the Gallo base URL from environment variables
// const galloBaseUrl = import.meta.env.REACT_APP_GALLO_BASE_URL;
const galloBaseUrl = "https://6w7u156vcb.execute-api.us-west-2.amazonaws.com";

// export const sendAchievementToGalloAxis = async (
//   payload: AchievementPayloadType,
//   apiKey: string,
//   navigate: NavigateFunction,
//   dispatch: (action: any) => void // Pass dispatch as an argument
// ): Promise<void> => {
//   try {
//     if (!galloBaseUrl) {
//       throw new Error("Gallo base URL is not defined in environment variables.");
//     }

//     if (!payload.oppId || typeof payload.oppId !== "string") {
//       throw new Error("Invalid oppId provided in payload.");
//     }

//     // Format the closedDate into 'DD-MM-YYYY'
//     if (payload.closedDate) {
//       const [year, day, month] = payload.closedDate.split("-");
//       payload.closedDate = `${day}-${month}-${year}`; // Convert to 'DD-MM-YYYY'
//     }

//     const galloEndpointUrl = `${galloBaseUrl}/healy/achievements`;

//     // Build the payload to match the expected structure
//     const formattedPayload = {
//       oppId: payload.oppId,
//       closedBy: payload.closedBy,
//       closedDate: payload.closedDate,
//       closedUnits: payload.closedUnits,
//       photos: payload.photos.map((photo) => ({
//         file: photo.file, // Ensure each photo is an object with a 'file' key
//       })),
//     };

//     console.log("Sending formatted payload to Gallo API:", formattedPayload);

//     const vercelPayload = {
//       baseUrl: galloEndpointUrl,
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "x-api-key": apiKey,
//       },
//       body: formattedPayload,
//     };

//     const response = await fetch(
//       "https://my-fetch-data-api.vercel.app/api/fetchData",
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(vercelPayload),
//       }
//     );

//     // Handle response status before attempting to parse JSON
//     if (!response.ok) {
//       const errorDetails = await response.text(); // Safely fetch error details
//       if (
//         response.status === 500 &&
//         errorDetails.includes("Achievement already sent")
//       ) {
//         // Handle non-critical error
//         console.warn("Achievement already sent.");
//         dispatch(
//           showMessage("This achievement has already been sent and cannot be resubmitted.")
//         );
//         return; // Stop further execution
//       }
//       // Throw critical server error with details
//       throw new Error(`Server Error: ${response.status} - ${errorDetails}`);
//     }

//     // Handle empty response body (204 or empty JSON)
//     const contentLength = response.headers.get("content-length");
//     if (!contentLength || parseInt(contentLength) === 0) {
//       console.log("Empty response body from backend");
//       return; // No further processing needed
//     }

//     // Attempt to parse the response JSON
//     let responseData;
//     try {
//       responseData = await response.json();
//     } catch (error) {
//       console.error("Failed to parse JSON response:", error);
//       const rawText = await response.text();
//       console.log("Raw response text:", rawText);
//       throw new Error("Unexpected response format from backend");
//     }

//     console.log("Achievement successfully sent to Gallo API!", responseData);
//     dispatch(showMessage("Achievement successfully sent to Gallo API!"));
//   } catch (error: any) {
//     console.error("Error in sendAchievementToGalloAxis:", error.message);
//     throw error; // Rethrow to allow calling function to handle it
//   } finally {
//     navigate("/user-home-page");
//   }
// };

export const sendAchievementToGalloAxis = async (
  payload: AchievementPayloadType,
  apiKey: string,
  navigate: NavigateFunction,
  dispatch: (action: any) => void,
): Promise<void> => {
  try {
    if (!galloBaseUrl) {
      throw new Error(
        "Gallo base URL is not defined in environment variables.",
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
      },
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
        `Failed to send achievement: ${response.status} - ${rawResponse}`,
      );
      dispatch(
        showMessage(
          `Failed to send achievement: ${response.status} - ${rawResponse}`,
        ),
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
        showMessage("An unknown error occurred while sending the achievement."),
      );
    }
    throw error; // Re-throw to allow upstream handling
  } finally {
    setTimeout(() => {
      navigate("/user-home-page");
    }, 1000);
  }
};
