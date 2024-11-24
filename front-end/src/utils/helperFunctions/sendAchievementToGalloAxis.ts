import { AchievementPayloadType } from "../types";

// Import the Gallo base URL from environment variables
// const galloBaseUrl = import.meta.env.REACT_APP_GALLO_BASE_URL;
const galloBaseUrl ='https://6w7u156vcb.execute-api.us-west-2.amazonaws.com';

export const sendAchievementToGalloAxis = async (
  payload: AchievementPayloadType,
  apiKey: string
): Promise<void> => {
  try {
    if (!galloBaseUrl) {
      throw new Error("Gallo base URL is not defined in environment variables.");
    }

    if (payload.closedDate) {
      const dateParts = payload.closedDate.split("-");
      if (dateParts.length === 3) {
        const [yyyy, mm, dd] = dateParts;
        const formattedDate = `${mm}-${dd}-${yyyy}`;
        if (isNaN(Date.parse(formattedDate))) {
          throw new Error(`Invalid date after formatting: ${formattedDate}`);
        }
        payload.closedDate = formattedDate;
      } else {
        throw new Error("Invalid date format for closedDate. Expected yyyy-mm-dd");
      }
    }

    const galloEndpointUrl = `${galloBaseUrl}/healy/achievements`;

    console.log("Preparing to send payload to Vercel for Gallo API:");
    console.log("Payload:", payload);
    console.log("Gallo Endpoint URL:", galloEndpointUrl);
    console.log("API Key (last 4 chars):", apiKey.slice(-4));

    const vercelPayload = {
      baseUrl: galloEndpointUrl,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: payload,
    };

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), 10000)
    );

    const response = (await Promise.race([
      fetch("https://my-fetch-data-api.vercel.app/api/fetchData", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vercelPayload),
      }),
      timeout,
    ])) as Response; // Narrow down the type

    if (response.ok) {
      console.log("Achievement sent successfully to Gallo API via Vercel!");
    } else {
      let errorDetails: string;
      try {
        errorDetails = await response.text();
      } catch {
        errorDetails = "Unknown error from Gallo API.";
      }
      console.error("Vercel/Gallo API error response:", errorDetails);
      throw new Error(`Failed to send achievement: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error in sendAchievementToGalloAxis:", error);

    // Provide meaningful error messages depending on the type
    if (error instanceof Error) {
      throw new Error(`Error in sendAchievementToGalloAxis: ${error.message}`);
    } else {
      throw new Error("Unknown error occurred while sending achievement.");
    }
  }
};



