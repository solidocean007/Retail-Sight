// CategorySelector.tsx
import React from "react";
// import { CategoryType } from "../utils/types";
import './categorySelector.css'

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
  | "Cookies_and_Pastries"

// Create an array of categories for mapping in the component
const CATEGORIES: CategoryType[] = ['Water', 'Wine', 'Beer', 'Soda', 'Chips', 'Produce', 'Dairy', 'Meat', 'Cookies_and_Pastries'];

interface CategorySelectorProps {
  selectedCategory?: CategoryType;
  onCategoryChange: (category: CategoryType) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ selectedCategory, onCategoryChange }) => {
  return (
    <select 
      className="category-selector"
      title="title selector"
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