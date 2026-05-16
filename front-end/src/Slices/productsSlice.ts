// productsSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ProductType } from "../utils/types";
import { RootState } from "../utils/store";
import { fetchCompanyProducts } from "../thunks/productThunks";
import { normalizeFirestoreData } from "../utils/normalize";

interface ProductsState {
  allProducts: ProductType[];
  loading: boolean;
  error: string | {} | null;
}

const initialState: ProductsState = {
  allProducts: [],
  loading: false,
  error: null,
};

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    setAllProducts: (state, action: PayloadAction<ProductType[]>) => {
      state.allProducts = normalizeFirestoreData(action.payload);
    },

    addProduct: (state, action: PayloadAction<ProductType>) => {
      state.allProducts.push(normalizeFirestoreData(action.payload));
    },

    updateProduct: (state, action: PayloadAction<ProductType>) => {
      const normalizedProduct = normalizeFirestoreData(action.payload);

      const index = state.allProducts.findIndex(
        (p) => p.companyProductId === normalizedProduct.companyProductId,
      );

      if (index !== -1) {
        state.allProducts[index] = normalizedProduct;
      }
    },
    deleteProduct: (state, action: PayloadAction<string>) => {
      state.allProducts = state.allProducts.filter(
        (p) => p.companyProductId !== action.payload,
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCompanyProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanyProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.allProducts = normalizeFirestoreData(action.payload);
      })
      .addCase(fetchCompanyProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Unknown error";
      });
  },
});

export const { setAllProducts, addProduct, updateProduct, deleteProduct } =
  productsSlice.actions;

export const selectAllProducts = (state: RootState) =>
  state.companyProducts.allProducts;

export default productsSlice.reducer;
