import * as admin from "firebase-admin";
import * as https from "https";
import * as querystring from "querystring";
import * as express from "express";
import { Request, Response } from "express";
import * as functions from "firebase-functions";
import * as cors from "cors"; // Add CORS import

// Initialize Firebase Admin if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const app = express();
app.use(cors({ origin: true })); // Enable CORS for all origins
app.use(express.json());

// Define the QueryParam type
type QueryParam = {
  key: string;
  value: string;
};

// Define the data type expected for fetchData
interface FetchDataParams {
  baseUrl: string;
  method?: string;
  headers?: { [key: string]: string };
  queryParams?: QueryParam[];
  body?: Record<string, unknown>;
}

// Construct the URL with query parameters
const constructUrl = (baseUrl: string, queryParams: QueryParam[]): string => {
  let url = baseUrl;
  if (queryParams && queryParams.length > 0) {
    const queryString = querystring.stringify(
      queryParams.reduce<{ [key: string]: string }>((acc, param) => {
        if (param.key && param.value) {
          acc[param.key] = param.value;
        }
        return acc;
      }, {})
    );
    url += `?${queryString}`;
  }
  return url;
};

console.log(constructUrl, ": constructUrl");

app.post("/fetchData", async (req: Request, res: Response): Promise<void> => {
  console.log("fetchData request");
  const data: FetchDataParams = req.body;

  // Check authentication
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).send({ error: "Authentication is required." });
    return;
  }

  // Log incoming request data
  console.log("Incoming request data:", JSON.stringify(data, null, 2));

  const {
    baseUrl,
    method = "GET",
    headers = {},
    queryParams = [],
    body,
  } = data;

  console.log("Base URL:", baseUrl);
  console.log("Method:", method);
  console.log("Headers:", headers);
  console.log("Query Params:", queryParams);

  if (!baseUrl) {
    console.error("Base URL is missing");
    res.status(400).send({ error: "Base URL is required." });
    return;
  }

  const url = constructUrl(baseUrl, queryParams);
  console.log("Constructed URL:", url); // Log the constructed URL
  const urlObj = new URL(url);

  const options: https.RequestOptions = {
    hostname: urlObj.hostname,
    path: urlObj.pathname + urlObj.search,
    method: method.toUpperCase(),
    headers: headers,
  };

  try {
    const result = await new Promise<unknown>((resolve, reject) => {
      const httpsRequest = https.request(options, (response) => {
        let data = "";

        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          if (
            response.statusCode &&
            response.statusCode >= 200 &&
            response.statusCode < 300
          ) {
            try {
              const parsedData = JSON.parse(data);
              resolve(parsedData);
            } catch {
              reject(
                new functions.https.HttpsError(
                  "internal",
                  "Error parsing response data"
                )
              );
            }
          } else {
            reject(
              new functions.https.HttpsError(
                "internal",
                `Request failed with status ${response.statusCode}`
              )
            );
          }
        });
      });

      httpsRequest.on("error", () => {
        reject(
          new functions.https.HttpsError(
            "internal",
            "Error making the HTTPS request"
          )
        );
      });

      if ((method === "POST" || method === "PUT") && body) {
        httpsRequest.write(JSON.stringify(body));
      }

      httpsRequest.end();
    });

    console.log("Successful response:", result);
    res.status(200).send(result);
  } catch (error) {
    console.error("Error in fetchData function:", error);
    res.status(500).send({ error: (error as Error).message });
  }
});

// Export the Express app as a Cloud Function without `app.listen()`
export const fetchData = functions.https.onRequest(app);
