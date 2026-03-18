import { onRequest } from "firebase-functions/v2/https";
import { normalizeAccountSnapshot } from "../accounts/utils/normalizeAccountSnapshot";
import * as admin from "firebase-admin";
import { getAccountDiffs } from "../accounts/utils/getAccountDiffs";
import crypto from "crypto";

const db = admin.firestore();

export const processAccountImport = onRequest(
  {
    memory: "1GiB",
  },
  async (req, res) => {
    console.log("Inbound email received");

    try {
      let rawEmail = "";

      // Handle SendGrid raw buffer
      if (
        req.body &&
        req.body.type === "Buffer" &&
        Array.isArray(req.body.data)
      ) {
        rawEmail = Buffer.from(req.body.data).toString("utf8");
      } else if (req.rawBody) {
        rawEmail = Buffer.from(req.rawBody).toString("utf8");
      } else {
        rawEmail = JSON.stringify(req.body);
      }

      // Extract QuickLink values
      const match = rawEmail.match(
        /QuickLink\?MessageID=(\d+)&QuickKey=([a-z0-9]+)/i
      );

      if (!match) {
        console.log("QuickLink not found in email");
        res.status(200).send("No QuickLink found");
        return;
      }

      const quickKey = match[2];

      // Build API request
      const domainMatch = rawEmail.match(/https:\/\/([a-z0-9.-]+)\/QuickLink/i);

      if (!domainMatch) {
        console.log("Could not determine source domain");
        res.status(200).send("No domain found");
        return;
      }

      const domain = domainMatch[1];
      console.log("Resolved domain:", domain);
      const apiUrl = new URL(`https://${domain}/api`);

      const syncConfigSnap = await db
        .collection("accountSyncConfigs")
        .doc(domain)
        .get();

      if (!syncConfigSnap.exists) {
        console.log("No sync config for domain:", domain);
        res.status(200).send("Sync not configured");
        return;
      }

      const syncConfig = syncConfigSnap.data();

      if (!syncConfig?.enabled) {
        console.log("Account sync disabled for domain:", domain);
        res.status(200).send("Sync disabled");
        return;
      }

      const companyId = syncConfig.companyId;

      if (!companyId) {
        console.log("Sync config missing companyId for domain:", domain);
        res.status(200).send("Invalid sync configuration");
        return;
      }

      apiUrl.searchParams.set("APICommand", "TableView");
      apiUrl.searchParams.set("WebRequestID", crypto.randomUUID());
      apiUrl.searchParams.set("RequestDashboardID", "100100");
      apiUrl.searchParams.set("TableName", "Stops");
      apiUrl.searchParams.set("Format", "json");
      apiUrl.searchParams.set("TitleBar", "1");
      apiUrl.searchParams.set("Pagination", "1");
      apiUrl.searchParams.set("RowActions", "1");
      apiUrl.searchParams.set("ReportID", "24408998");

      apiUrl.searchParams.set(
        "SelectDisplayInParent",
        "Customer ID,Stops_Customers^Customers.Company,Stops_Customers^Customers.Address," +
          "Stops_Customers^Customers.City,Stops_Customers^Customers.State,Stops_Routes^Routes.RouteNum," +
          "Stops_Customers^Customers_CustomerTypes^CustomerTypes.CustomerType," +
          "Stops_Customers^Customers.CustomerTypeID," +
          "Stops_Customers^Customers_Chains^Chains.Chain," +
          "Stops_Customers^Customers_Chains^Chains.IsIndependent"
      );

      apiUrl.searchParams.set("SelectMaxRecords", "5000");

      apiUrl.searchParams.set(
        "Parameters",
        "F:Active~V:Active~O:E|F:ActivityIDEffective~V:3^21^23^22~O:E"
      );

      apiUrl.searchParams.set("QuickKey", quickKey);

      const response = await fetch(apiUrl.toString());

      const data = await response.json();

      if (!response.ok) {
        console.error("API request failed:", response.status);
        res.status(500).send("Failed to fetch stops");
        return;
      }

      const rows = data?.Export?.Table?.Row || [];

      if (!rows.length) {
        res.status(200).send("No rows returned");
        return;
      }

      const accountMap = new Map<string, any>();

      for (const r of rows) {
        const accountNumber = r["Customer ID"]?.match(/>(.*?)</)?.[1] ?? "";

        if (!accountNumber) continue;

        const route = r["Stops_Routes^Routes.RouteNum"]
          ? String(r["Stops_Routes^Routes.RouteNum"])
          : null;

        const isIndependent =
          r["Stops_Customers^Customers_Chains^Chains.IsIndependent"] ===
            "True" ||
          r["Stops_Customers^Customers_Chains^Chains.IsIndependent"] === true;

        if (!accountMap.has(accountNumber)) {
          accountMap.set(accountNumber, {
            accountNumber,
            accountName: r["Stops_Customers^Customers.Company"],
            streetAddress: r["Stops_Customers^Customers.Address"],
            city: r["Stops_Customers^Customers.City"],
            state: r["Stops_Customers^Customers.State"],
            typeOfAccount:
              r[
                "Stops_Customers^Customers_CustomerTypes^CustomerTypes.CustomerType"
              ],
            chain: r["Stops_Customers^Customers_Chains^Chains.Chain"] ?? null,
            chainType: isIndependent ? "independent" : "chain",
            salesRouteNums: [],
          });
        }

        const acc = accountMap.get(accountNumber);

        if (route && !acc.salesRouteNums.includes(route)) {
          acc.salesRouteNums.push(route);
          acc.salesRouteNums.sort();
        }
      }

      const accounts = Array.from(accountMap.values());

      const normalized = normalizeAccountSnapshot(accounts);

      const companySnap = await db.doc(`companies/${companyId}`).get();

      const companyData = companySnap.data() as any;

      if (!companyData?.accountsId) {
        console.log("Company missing accountsId:", companyId);
        res.status(200).send("Company not initialized");
        return;
      }

      const accountsId = companyData.accountsId;

      const accountsSnap = await db.doc(`accounts/${accountsId}`).get();
      const existingAccounts = accountsSnap.data()?.accounts || [];

      let diffs = getAccountDiffs(normalized, existingAccounts);

      if (JSON.stringify(diffs).length > 800000) {
        console.warn("Diff payload too large, truncating");

        diffs = diffs.slice(0, 500); // safety cap
      }

      if (!diffs.length) {
        console.log("No account changes detected");
        res.status(200).send("No changes");
        return;
      }

      const diffHash = crypto
        .createHash("sha256")
        .update(JSON.stringify(normalized))
        .digest("hex");

      const lastImportSnap = await db
        .collection("accountImports")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (!lastImportSnap.empty) {
        const last = lastImportSnap.docs[0].data();

        if (last.diffHash === diffHash) {
          console.log("Import identical to last run. Skipping.");
          res.status(200).send("No new changes");
          return;
        }
      }

      const existingImportSnap = await db
        .collection("accountImports")
        .where("status", "==", "pending")
        .limit(1)
        .get();

      if (!existingImportSnap.empty) {
        console.log("Pending import already exists. Skipping.");
        res.status(200).send("Pending import already exists");
        return;
      }

      await db.collection("accountImports").add({
        companyId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "pending",
        totalChanges: diffs.length,
        diffHash,
        changes: diffs,
        autoApplyAfter: Date.now() + 1000 * 60 * 60 * 12, // 12 hours
      });

      // i think i should write to the admins here

      console.log("Account changes found:", diffs.length);

      res.status(200).send("Stops data retrieved successfully");
    } catch (err) {
      console.error("Import error:", err);
      res.status(200).send("Import failed but email was processed");
    }
  }
);
