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
import { ProductTypeWithId, ProductType } from "../utils/types";

export const fetchCompanyProducts = createAsyncThunk<
  ProductTypeWithId[],
  string,
  { rejectValue: string }
>("products/fetchCompanyProducts", async (companyId, { rejectWithValue }) => {
  try {
    const itemsRef = collection(db, "products", companyId, "items");
    const snapshot = await getDocs(itemsRef);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as ProductType),
    }));
  } catch (error) {
    console.error("Error fetching products:", error);
    return rejectWithValue("Failed to fetch products.");
  }
});

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
    await updateDoc(productRef, product); //  Index signature for type '`${string}.${string}`' is missing in type 'ProductType'.t
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
