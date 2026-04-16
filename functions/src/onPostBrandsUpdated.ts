import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

export const onPostBrandsUpdated = onDocumentUpdated(
  "posts/{postId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const postId = event.params.postId;

    if (after.migratedVisibility !== "network") return;

    const normalize = (s: string) => s.trim().toUpperCase();

    // i dont understnad how this funcion works below
    const getBrands = (b: any) =>
      (Array.isArray(b) ? b : Object.keys(b || {})).map(normalize);

    const beforeBrands = getBrands(before.brands);
    const afterBrands = getBrands(after.brands);

    const beforeSet = new Set(beforeBrands);
    const afterSet = new Set(afterBrands);

    const brandsChanged =
      beforeBrands.length !== afterBrands.length ||
      beforeBrands.some((b) => !afterSet.has(b)) ||
      afterBrands.some((b) => !beforeSet.has(b));

    if (!brandsChanged) return;
    const { companyId } = after;

    // 🔥 get relevant connections
    const connectionsSnap = await db
      .collection("companyConnections")
      .where("status", "==", "approved")
      .where("companyIds", "array-contains", companyId)
      .get();

    if (connectionsSnap.empty) return;

    const nextShared = new Set<string>();

    console.log("🔥 onPostBrandsUpdated fired", postId);

    console.log("📦 BEFORE brands:", before.brands);
    console.log("📦 AFTER brands:", after.brands);

    console.log("🧠 beforeBrands:", beforeBrands);
    console.log("🧠 afterBrands:", afterBrands);

    connectionsSnap.forEach((doc) => {
      const conn = doc.data();

      console.log("🔥 connections returned:", connectionsSnap.size);

      connectionsSnap.forEach((doc) => {
        console.log("➡️ connection id:", doc.id);
      });
      console.log("📦 post companyId:", companyId);
      console.log("📦 connection companyIds:", conn.companyIds);
      console.log("🔗 connection:", {
        id: doc.id,
        companyIds: conn.companyIds,
        sharedBrandNames: conn.sharedBrandNames,
      });

      const sharedBrandNames = (conn.sharedBrandNames || []).map(normalize);

      console.log("🔍 comparing:", {
        postBrands: afterBrands,
        connectionBrands: sharedBrandNames,
      });

      const matches = afterBrands.some((b: string) =>
        sharedBrandNames.includes(b)
      );

      console.log("✅ match result:", matches);

      if (!matches) return;

      const otherCompanyId = conn.companyIds.find(
        (id: string) => id !== companyId
      );

      console.log("➡️ adding company:", otherCompanyId);

      if (otherCompanyId) {
        nextShared.add(otherCompanyId);
      }
    });
    const prevShared = new Set<string>(
      (after.sharedWithCompanies || []) as string[]
    );

    const toAdd = [...nextShared].filter((id) => !prevShared.has(id));
    const toRemove = [...prevShared].filter((id) => !nextShared.has(id));

    console.log("📊 nextShared:", Array.from(nextShared));
    console.log("📊 prevShared:", Array.from(prevShared));
    console.log("➕ toAdd:", toAdd);
    console.log("➖ toRemove:", toRemove);

    const updates: any = {};

    if (toAdd.length > 0) {
      updates.sharedWithCompanies = FieldValue.arrayUnion(...toAdd);
    }

    if (toRemove.length > 0) {
      updates.sharedWithCompanies = FieldValue.arrayRemove(...toRemove);
    }

    if (Object.keys(updates).length === 0) return;

    await db.collection("posts").doc(postId).update(updates);
  }
);
