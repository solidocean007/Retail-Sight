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
  | "Produce"
  | "Dairy"
  | "Meat"
  | "Cookies and Pastries"

// Create an array of categories for mapping in the component
const CATEGORIES: CategoryType[] = ['Water', 'Wine', 'Beer', 'Soda', 'Chips', 'Produce', 'Dairy', 'Meat', 'Cookies and Pastries'];

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
