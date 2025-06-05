// productThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { ProductType } from "../utils/types";
import { setAllProducts } from "../Slices/productsSlice";
import { saveAllCompanyProductsToIndexedDB } from "../utils/database/indexedDBUtils";

export const fetchCompanyProducts = createAsyncThunk(
  "products/fetchCompanyProducts",
  async (companyId: string, { dispatch }) => {
    const snapshot = await getDocs(collection(db, "products", companyId, "items"));
    const products = snapshot.docs.map((doc) => ({
      ...doc.data(),
    })) as ProductType[];

    // 🔁 Update Redux immediately
    dispatch(setAllProducts(products));

    // 💾 Save to IndexedDB in background
    try {
      await saveAllCompanyProductsToIndexedDB(products);
    } catch (err) {
      console.warn("Failed to cache products in IndexedDB:", err);
    }

    return products;
  }
);


export const addProductToCompany = createAsyncThunk<
  void,
  { companyId: string; product: ProductType },
  { rejectValue: string }
>("products/addProductToCompany", async ({ companyId, product }, { rejectWithValue }) => {
  try {
    const itemsRef = collection(db, "products", companyId, "items");
    await addDoc(itemsRef, product);
  } catch (error) {
    console.error("Error adding product:", error);
    return rejectWithValue("Failed to add product.");
  }
});

export const updateCompanyProduct = createAsyncThunk<
  void,
  { companyId: string; productId: string; product: ProductType },
  { rejectValue: string }
>("products/updateCompanyProduct", async ({ companyId, productId, product }, { rejectWithValue }) => {
  try {
    const productRef = doc(db, "products", companyId, "items", productId);
    await updateDoc(productRef, { ...product });
  } catch (error) {
    console.error("Error updating product:", error);
    return rejectWithValue("Failed to update product.");
  }
});

export const deleteCompanyProduct = createAsyncThunk<
  void,
  { companyId: string; productId: string },
  { rejectValue: string }
>("products/deleteCompanyProduct", async ({ companyId, productId }, { rejectWithValue }) => {
  try {
    const productRef = doc(db, "products", companyId, "items", productId);
    await deleteDoc(productRef);
  } catch (error) {
    console.error("Error deleting product:", error);
    return rejectWithValue("Failed to delete product.");
  }
});
