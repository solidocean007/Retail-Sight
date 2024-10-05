import * as admin from "firebase-admin";
import * as https from "https";
import * as querystring from "querystring";
import * as express from "express";
import { Request, Response } from "express";
import { https as httpsFunctions } from "firebase-functions/v2"; // Import from v2

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const app = express();
app.use(express.json());

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

app.post("/fetchData", async (req: Request, res: Response): Promise<void> => {
  const data: FetchDataParams = req.body;

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).send({ error: "Authentication is required." });
    return;
  }

  const { baseUrl, method = "GET", headers = {}, queryParams = [], body } = data;

  if (!baseUrl) {
    res.status(400).send({ error: "Base URL is required." });
    return;
  }

  // Construct the URL with query parameters
  const constructUrl = (baseUrl: string, queryParams: QueryParam[]): string => {
    let url = baseUrl;
    if (queryParams && queryParams.length > 0) {
      const queryString = querystring.stringify(
        queryParams.reduce<{ [key: string]: string }>((acc, param: QueryParam) => {
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

  const url = constructUrl(baseUrl, queryParams);

  const urlObj = new URL(url);
  const options: https.RequestOptions = {
    hostname: urlObj.hostname,
    path: urlObj.pathname + urlObj.search,
    method: method.toUpperCase(),
    headers: headers,
  };

  const fetchData = new Promise<unknown>((resolve, reject) => {
    const httpsRequest = https.request(options, (response) => {
      let data = "";

      response.on("data", (chunk) => {
        data += chunk;
      });

      response.on("end", () => {
        if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
          try {
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          } catch (error) {
            console.error("Error parsing response data:", error);
            reject(new Error("Error parsing response data"));
          }
        } else {
          console.error("Request failed with status:", response.statusCode);
          reject(new Error(`Request failed with status ${response.statusCode}`));
        }
      });
    });

    httpsRequest.on("error", (error) => {
      console.error("HTTPS request error:", error);
      reject(new Error("Error making the HTTPS request"));
    });

    if (method === "POST" || method === "PUT") {
      if (body) {
        httpsRequest.write(JSON.stringify(body));
      }
    }

    httpsRequest.end();
  });

  try {
    const result = await fetchData;
    res.status(200).send(result);
  } catch (error) {
    res.status(500).send({ error: (error as Error).message });
  }
});

// Export the Express app as a Cloud Function
export const fetchData = httpsFunctions.runWith({ memory: "2GiB" }).onRequest(app);

