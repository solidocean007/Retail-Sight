import { readFileSync } from "node:fs";
import { after, before, beforeEach, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { getBytes, ref, uploadBytes } from "firebase/storage";

const PROJECT_ID = "retail-sight-offline-test";
const VALID_PATH =
  "offlineUploads/company-a/user-a/12345678901234567890/original.jpg";
const validMetadata = {
  contentType: "image/jpeg",
  customMetadata: {
    captureId: "12345678901234567890",
    companyId: "company-a",
    ownerUid: "user-a",
  },
};

let testEnvironment: RulesTestEnvironment;

before(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: {
      host: "127.0.0.1",
      port: 9199,
      rules: readFileSync("../storage.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnvironment.clearStorage();
});

after(async () => {
  await testEnvironment.cleanup();
});

test("allows an authenticated user to create and retry their own scoped upload", async () => {
  const storage = testEnvironment.authenticatedContext("user-a", {
    companyId: "company-a",
  }).storage();
  const uploadRef = ref(storage, VALID_PATH);

  await assertSucceeds(uploadBytes(uploadRef, new Uint8Array([1]), validMetadata));
  await assertSucceeds(uploadBytes(uploadRef, new Uint8Array([2]), validMetadata));
});

test("rejects unauthenticated, wrong-user, and wrong-company staging uploads", async () => {
  const anonymousStorage = testEnvironment.unauthenticatedContext().storage();
  const wrongUserStorage = testEnvironment.authenticatedContext("user-b", {
    companyId: "company-a",
  }).storage();
  const wrongCompanyStorage = testEnvironment.authenticatedContext("user-a", {
    companyId: "company-b",
  }).storage();

  await assertFails(
    uploadBytes(ref(anonymousStorage, VALID_PATH), new Uint8Array([1]), validMetadata),
  );
  await assertFails(
    uploadBytes(ref(wrongUserStorage, VALID_PATH), new Uint8Array([1]), validMetadata),
  );
  await assertFails(
    uploadBytes(
      ref(wrongCompanyStorage, VALID_PATH),
      new Uint8Array([1]),
      validMetadata,
    ),
  );
});

test("rejects unsupported content and ownership metadata mismatches", async () => {
  const storage = testEnvironment.authenticatedContext("user-a", {
    companyId: "company-a",
  }).storage();

  await assertFails(
    uploadBytes(ref(storage, VALID_PATH), new Uint8Array([1]), {
      ...validMetadata,
      contentType: "text/plain",
    }),
  );
  await assertFails(
    uploadBytes(ref(storage, VALID_PATH), new Uint8Array([1]), {
      ...validMetadata,
      customMetadata: {
        ...validMetadata.customMetadata,
        ownerUid: "user-b",
      },
    }),
  );
});

test("rejects a staging image larger than 20 MiB", async () => {
  const storage = testEnvironment.authenticatedContext("user-a", {
    companyId: "company-a",
  }).storage();
  const tooLarge = new Uint8Array(20 * 1024 * 1024 + 1);

  await assertFails(
    uploadBytes(ref(storage, VALID_PATH), tooLarge, validMetadata),
  );
});

test("allows public reads but blocks client writes for finalized display images", async () => {
  const finalPath =
    "displayImages/company-a/user-a/12345678901234567890/original.jpg";
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await uploadBytes(
      ref(context.storage(), finalPath),
      new Uint8Array([1]),
      validMetadata,
    );
  });

  const anonymousStorage = testEnvironment.unauthenticatedContext().storage();
  await assertSucceeds(getBytes(ref(anonymousStorage, finalPath)));
  await assertFails(
    uploadBytes(
      ref(anonymousStorage, finalPath),
      new Uint8Array([2]),
      validMetadata,
    ),
  );
});
