// productsSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ProductTypeWithId } from "../utils/types";
import { RootState } from "../utils/store";
import { fetchCompanyProducts } from "../thunks/productThunks";

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
      const index = state.allProducts.findIndex((p) => p.id === action.payload.id);
      if (index !== -1) {
        state.allProducts[index] = action.payload;
      }
    },
    deleteProduct: (state, action: PayloadAction<string>) => {
      state.allProducts = state.allProducts.filter((p) => p.id !== action.payload);
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
        state.allProducts = action.payload;
      })
      .addCase(fetchCompanyProducts.rejected, (state, action) => {
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
