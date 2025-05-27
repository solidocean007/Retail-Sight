// productsSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { doc, getDoc } from "firebase/firestore";
import { ProductType, ProductTypeWithId } from "../utils/types";
import getCompanyProductsId from "../utils/helperFunctions/getCompanyProductsId";
import { db } from "../utils/firebase";
import { RootState } from "../utils/store";

interface ProductsState {
  allProducts: ProductTypeWithId[];
  loading: boolean;
  error: string | null;
}

const initialState: ProductsState = {
  allProducts: [],
  loading: false,
  error: null,
};

export const fetchProductsThunk = createAsyncThunk<
  ProductTypeWithId[],
  string,
  { rejectValue: string }
>("products/fetchProducts", async (companyId, { rejectWithValue }) => {
  try {
    const productsId = await getCompanyProductsId(companyId);
    if (!productsId) return [];

    const snapshot = await getDoc(doc(db, "products", productsId));
    if (!snapshot.exists()) return [];

    const raw = snapshot.data().products as ProductType[];
    return raw.map((p) => ({ ...p, id: p.companyProductId }));
  } catch (error) {
    console.error("Error in fetchProductsThunk:", error);
    return rejectWithValue("Failed to fetch products.");
  }
});

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    setAllProducts: (state, action: PayloadAction<ProductTypeWithId[]>) => {
      state.allProducts = action.payload;
    },
    addProduct: (state, action: PayloadAction<ProductTypeWithId>) => {
      state.allProducts.push(action.payload);
    },
    updateProduct: (state, action: PayloadAction<ProductTypeWithId>) => {
      const index = state.allProducts.findIndex(
        (p) => p.id === action.payload.id,
      );
      if (index !== -1) {
        state.allProducts[index] = action.payload;
      }
    },
    deleteProduct: (state, action: PayloadAction<string>) => {
      state.allProducts = state.allProducts.filter(
        (p) => p.id !== action.payload,
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProductsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.allProducts = action.payload;
      })
      .addCase(fetchProductsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Unknown error";
      });
  },
});

export const {
  setAllProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} = productsSlice.actions;

export const selectAllProducts = (state: RootState) =>
  state.companyProducts.allProducts;

export default productsSlice.reducer;
