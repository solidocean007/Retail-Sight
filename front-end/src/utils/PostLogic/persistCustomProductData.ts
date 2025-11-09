import {
  doc,
  setDoc,
  arrayUnion,
  getDocs,
  collection,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { PostInputType } from "../types";

/**
 * Persists new custom brands and product types to the company's Firestore doc.
 * Checks the company's products collection before adding to avoid duplicates.
 */
export const persistCustomProductData = async (
  companyId: string,
  post: PostInputType
) => {
  if (!companyId) return;

  const companyRef = doc(db, "companies", companyId);
  const productsRef = collection(db, "products", companyId, "items");

  // 1️⃣ Get the brands and product types from the submitted post
  const postBrands = (post.brands || [])
    .map((b: string) => b.trim())
    .filter(Boolean);
  const postTypes = (post.productType || [])
    .map((t: string) => t.trim())
    .filter(Boolean);

  // 2️⃣ Fetch current product list brands from Firestore
  const productSnap = await getDocs(productsRef);
  const existingProductBrands = new Set<string>();
  productSnap.forEach((d) => {
    const data = d.data();
    if (data.brand) existingProductBrands.add(data.brand.toLowerCase());
  });

  // 3️⃣ Get the company doc’s current libraries
  const companySnap = await getDoc(companyRef);
  const companyData = companySnap.exists() ? companySnap.data() : {};
  const existingCustomBrands = new Set(
    (companyData.customBrandLibrary || []).map((b: string) => b.toLowerCase())
  );
  const existingCustomTypes = new Set(
    (companyData.customProductTypeLibrary || []).map((t: string) =>
      t.toLowerCase()
    )
  );

  // 4️⃣ Determine which entries are truly new
  const newBrands = postBrands.filter(
    (b: string) =>
      !existingProductBrands.has(b.toLowerCase()) &&
      !existingCustomBrands.has(b.toLowerCase())
  );
  const newTypes = postTypes.filter(
    (t: string) => !existingCustomTypes.has(t.toLowerCase())
  );

  // 5️⃣ Write only if there’s something to add
  try {
    if (newBrands.length > 0 || newTypes.length > 0) {
      await setDoc(
        companyRef,
        {
          ...(newBrands.length && {
            customBrandLibrary: arrayUnion(...newBrands),
          }),
          ...(newTypes.length && {
            customProductTypeLibrary: arrayUnion(...newTypes),
          }),
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn("⚠️ Failed to persist custom product data:", err);
  }
};
