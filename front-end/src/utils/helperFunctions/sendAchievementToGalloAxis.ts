import { AchievementPayloadType } from "../types";
// do i need to import the gallo apikey?

export const sendAchievementToGalloAxis = async (
  payload: AchievementPayloadType,
  apiKey: string
): Promise<void> => {
  try {
    const url = "https://my-fetch-data-api.vercel.app/api/fetchData"; // Vercel function endpoint

    // Request headers
    const headers = {
      "Content-Type": "application/json",
      "x-api-key": apiKey, // Include the API key if required by the Gallo API
    };

    // POST request to send achievement
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    // Handle response
    if (response.ok) {
      console.log("Achievement sent successfully!");
    } else {
      const errorData = await response.json();
      console.error("Error sending achievement:", errorData);
      throw new Error(`Failed to send achievement: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error in sendAchievementToGalloAxis:", error);
  }
};

