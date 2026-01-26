export const ingestEncompassImport = onRequest(async (req, res) => {
  if (req.headers["x-ingest-secret"] !== process.env.INGEST_SECRET) {
    return res.status(401).send("Unauthorized");
  }

  const { csv, filename, receivedAt } = req.body;
  if (!csv) return res.status(400).send("Missing CSV");

  const buffer = Buffer.from(csv, "base64");
  const rows = parseCsv(buffer);

  validateHeaders(rows[0]);

  const companyId = resolveCompanyFromFilename(filename);

  await backupAccounts(companyId);
  await applyAccountImport(companyId, rows);

  await logImport(companyId, filename, receivedAt);

  res.status(200).send("Import complete");
});

async function backupAccounts(companyId: string) {
  const accountsSnap = await db
    .collection("accounts")
    .where("companyId", "==", companyId)
    .get();

  const backupRef = db.collection("accounts_backup").doc();
  await backupRef.set({
    companyId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    accounts: accountsSnap.docs.map(d => d.data()),
  });

  pruneOldBackups(companyId);
}

