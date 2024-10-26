// apiKeyService.ts
export const handleSubmitNewExternalApiKey = async (companyId,e: React.FormEvent) => {
  e.preventDefault();
  try {
    const response = await fetch("https://my-fetch-data-api.vercel.app/api/storeExternalApiKey", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({companyId, externalApiName, externalApiKey }), // just added companyId
    });

    console.log(response.body);

    const data = await response.json();
    if (response.ok) {
      setMessage("External API Key added successfully!");
    } else {
      setMessage(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error("Error submitting external API key:", error);
    setMessage("Failed to add external API key.");
  }
};

export const getStoredApiKeys = async (companyId: string, externalCompanyName: string) => {
  // const response = await fetch(`/api/getExternalApiKeys?companyId=${companyId}`); I dont have a function to handle this method yet.  I'll need one similiar to the above vercel function
  return response.json();
};
