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
  | "Bread"
  | "Soda"
  | "Chips"
  | "Produce"
  | "Dairy"
  | "Meat"
  | "Cookies"
  | "Donuts"

// Create an array of categories for mapping in the component
const CATEGORIES: CategoryType[] = ['Water', 'Wine', 'Beer', 'Bread', 'Soda', 'Chips', 'Produce', 'Dairy', 'Meat', 'Cookies', 'Donuts'];

interface CategorySelectorProps {
  selectedCategory?: CategoryType;
  onCategoryChange: (category: CategoryType) => void;
}

const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>, onCategoryChange: (category: CategoryType) => void) => {
  const selectedCategory = e.target.value as CategoryType;
  localStorage.setItem('postCategory', selectedCategory);
  onCategoryChange(selectedCategory);
}


const CategorySelector: React.FC<CategorySelectorProps> = ({ selectedCategory, onCategoryChange }) => {
  return (
    <select 
      className="channel-category-selector"
      title="title selector"
      value={selectedCategory}
      // onChange={(e) => onCategoryChange(e.target.value as CategoryType)}
      onChange={(e) => handleCategoryChange(e, onCategoryChange)}
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
