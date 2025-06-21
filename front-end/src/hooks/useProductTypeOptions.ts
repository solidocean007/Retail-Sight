import { useSelector } from "react-redux"
import { selectAllProducts } from "../Slices/productsSlice"
import { useMemo } from "react"

export function useProductTypeOptions(selectedBrands: string[]) {
  const products = useSelector(selectAllProducts)
  return useMemo(() => {
    const types = products
      .filter(p => selectedBrands.includes(p.brand!))
      .map(p => p.productType!.toLowerCase())
      .filter(Boolean)
    return Array.from(new Set(types)).sort()
  }, [products, selectedBrands])
}
