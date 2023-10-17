// CategorySelector.tsx
import React from "react";
// import { CategoryType } from "../utils/types";

interface CategorySelectorProps {
  selectedCategory?: CategoryType;
  onCategoryChange: (category: CategoryType) => void;
}

export type CategoryType =
  | "Water"
  | "Wine"
  | "Beer"
  | "Soda"
  | "Chips"
  | "Fresh Produce"
  | "Canned Goods"
  | "Dairy"
  | "Meat and Poultry"
  | "Snacks"
  | "Bakery"
  | "Seafood"
  | "Spices and Seasonings"
  | "Household Items"
  | "Personal Care"
  | "Baby Products";

// Create an array of categories for mapping in the component
const CATEGORIES: CategoryType[] = ['Water', 'Wine', 'Beer', 'Soda', 'Chips', 'Fresh Produce', 'Canned Goods', 'Dairy', 'Meat and Poultry', 'Snacks', 'Bakery', 'Seafood', 'Spices and Seasonings', 'Household Items', 'Personal Care', 'Baby Products'];

interface CategorySelectorProps {
  selectedCategory?: CategoryType;
  onCategoryChange: (category: CategoryType) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ selectedCategory, onCategoryChange }) => {
  return (
    <select 
      value={selectedCategory}
      onChange={(e) => onCategoryChange(e.target.value as CategoryType)}
    >
      {CATEGORIES.map(category => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
    </select>
  );
};

export default CategorySelector;
