// fetchExternalApiKeys.ts
import { collection, doc, getDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";

const fetchExternalApiKey = async (companyId: string, externalApiKeyName: string) => {
  const apiKeyRef = doc(db, 'apiKeys', companyId);
  
  try {
    const apiKeySnap = await getDoc(apiKeyRef);
    if (apiKeySnap.exists()) {
      const data = apiKeySnap.data();
      
      // Check for externalApiKeys array and find the key with the specified name
      const externalApiKey = data.externalApiKeys?.find((key: { name: string }) => key.name === externalApiKeyName);
      
      if (externalApiKey) {
        return externalApiKey.key; // Return the actual key value
      } else {
        console.error(`No external API key found with name: ${externalApiKeyName}`);
        return null;
      }
    } else {
      console.error("No API key document found for company:", companyId);
      return null;
    }
  } catch (error) {
    console.error("Error fetching external API key:", error);
    return null;
  }
};

export default fetchExternalApiKey;