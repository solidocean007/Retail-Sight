import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as https from "https";
import * as querystring from "querystring";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Define the QueryParam type
type QueryParam = {
  key: string;
  value: string;
};

// Define the data type expected for fetchData
type FetchDataParams = {
  baseUrl: string;
  method?: string;
  headers?: { [key: string]: string };
  queryParams?: QueryParam[];
  body?: Record<string, unknown>;
};

export const fetchData = functions.https.onCall(
  async (request: functions.https.CallableRequest<FetchDataParams>) => {
    // Use request.auth to check if the user is authenticated
    if (!request.auth) {
      console.error("Unauthenticated request");
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication is required."
      );
    }

    const {
      baseUrl,
      method = "GET",
      headers = {},
      queryParams = [],
      body,
    } = request.data;

    if (!baseUrl) {
      console.error("Invalid argument: baseUrl is required");
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Base URL is required."
      );
    }

    // Construct the URL with query parameters
    const constructUrl = (
      baseUrl: string,
      queryParams: QueryParam[]
    ): string => {
      let url = baseUrl;

      if (queryParams && queryParams.length > 0) {
        const queryString = querystring.stringify(
          queryParams.reduce<{ [key: string]: string }>(
            (acc, param: QueryParam) => {
              if (param.key && param.value) {
                acc[param.key] = param.value;
              }
              return acc;
            },
            {}
          )
        );
        url += `?${queryString}`;
      }

      return url;
    };

    // Use constructUrl to build the final URL
    const url = constructUrl(baseUrl, queryParams);

    // Options for the HTTPS request
    const urlObj = new URL(url);
    const options: https.RequestOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: method.toUpperCase(),
      headers: headers,
    };

    // Make the HTTPS request
    return new Promise<unknown>((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = "";

        // Accumulate data
        res.on("data", (chunk) => {
          data += chunk;
        });

        // On response end
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsedData = JSON.parse(data);
              resolve(parsedData);
            } catch (error) {
              console.error("Error parsing response data:", error);
              reject(
                new functions.https.HttpsError(
                  "internal",
                  "Error parsing response data"
                )
              );
            }
          } else {
            console.error("Request failed with status:", res.statusCode);
            reject(
              new functions.https.HttpsError(
                "internal",
                `Request failed with status ${res.statusCode}`
              )
            );
          }
        });
      });

      // Handle request errors
      req.on("error", (error) => {
        console.error("HTTPS request error:", error);
        reject(
          new functions.https.HttpsError(
            "internal",
            "Error making the HTTPS request"
          )
        );
      });

      // Write body data for POST/PUT requests
      if (method === "POST" || method === "PUT") {
        if (body) {
          req.write(JSON.stringify(body));
        }
      }

      // End the request
      req.end();
    });
  }
);
