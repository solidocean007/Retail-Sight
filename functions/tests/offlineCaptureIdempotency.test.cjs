const assert = require("node:assert/strict");
const admin = require("firebase-admin");

const projectId = "retail-sight-offline-test";
const region = "us-central1";
const functionName = "finalizeOfflineCapture";
const captureId = "idempotency-test-1234567890";
const companyId = "company-idempotency-test";

const signInTestUser = async () => {
  const response = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "offline-idempotency@example.test",
        password: "emulator-only-password",
        returnSecureToken: true,
      }),
    },
  );
  const responseText = await response.text();
  const body = JSON.parse(responseText);
  assert.equal(response.ok, true, JSON.stringify(body));
  return { uid: body.localId, idToken: body.idToken };
};

const callFinalize = async (idToken, payload) => {
  const response = await fetch(
    `http://127.0.0.1:5005/${projectId}/${region}/${functionName}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${idToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ data: payload }),
    },
  );
  const responseText = await response.text();
  let body;
  try {
    body = JSON.parse(responseText);
  } catch {
    assert.fail(`Callable returned ${response.status}: ${responseText}`);
  }
  assert.equal(response.ok, true, JSON.stringify(body));
  return body.result;
};

const run = async () => {
  admin.initializeApp({
    projectId,
    storageBucket: `${projectId}.appspot.com`,
  });

  const { uid, idToken } = await signInTestUser();
  const db = admin.firestore();
  await Promise.all([
    db.doc(`users/${uid}`).set({
      uid,
      email: "offline-idempotency@example.test",
      firstName: "Offline",
      lastName: "Tester",
      companyId,
      company: "Idempotency Test Company",
      role: "employee",
      status: "active",
    }),
    db.doc(`companies/${companyId}`).set({
      companyName: "Idempotency Test Company",
    }),
  ]);

  const storagePath =
    `offlineUploads/${companyId}/${uid}/${captureId}/original.jpg`;
  await admin.storage().bucket().file(storagePath).save(
    Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    {
      metadata: {
        contentType: "image/jpeg",
        metadata: { captureId, companyId, ownerUid: uid },
      },
    },
  );

  const payload = {
    captureId,
    capturedAt: new Date().toISOString(),
    storagePath,
    postPayload: {
      account: {
        accountNumber: "manual-test-store",
        accountName: "Manual Test Store",
        typeOfAccount: "manual",
      },
      brands: ["Displaygram Test Brand"],
      brandIds: ["displaygram-test-brand"],
      productType: ["Displaygram Test Product"],
      description: "Offline idempotency emulator test",
      migratedVisibility: "companyOnly",
      totalCaseCount: 1,
    },
  };

  const results = await Promise.all([
    callFinalize(idToken, payload),
    callFinalize(idToken, payload),
  ]);

  const [post, receipt, posts] = await Promise.all([
    db.doc(`posts/${captureId}`).get(),
    db.doc(`offlineCaptureReceipts/${uid}_${captureId}`).get(),
    db.collection("posts").where("offlineCaptureId", "==", captureId).get(),
  ]);

  assert.equal(post.exists, true, "The final post was not created.");
  assert.equal(receipt.exists, true, "The completion receipt was not created.");
  assert.equal(posts.size, 1, "Duplicate final posts were created.");
  assert.equal(receipt.get("postId"), captureId);
  assert.deepEqual(
    results.map((result) => result.postId),
    [captureId, captureId],
  );
  assert.equal(
    results.filter((result) => result.alreadyFinalized === false).length,
    1,
    "Exactly one request should perform the initial finalization.",
  );
  assert.equal(
    results.filter((result) => result.alreadyFinalized === true).length,
    1,
    "Exactly one duplicate request should reuse the completed post.",
  );

  console.log("PASS: two concurrent finalizations produced one post and one receipt.");
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all(admin.apps.map((app) => app.delete()));
  });
