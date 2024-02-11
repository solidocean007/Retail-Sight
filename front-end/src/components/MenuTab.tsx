// MenuTab.tsx
import './menuTab.css';

const MenuTab = ({ onOptionSelect, show }: { onOptionSelect: (option: string) => void, show: boolean }) => {
  // Conditional class application based on the show prop
  const menuClass = show ? "menu-tab open" : "menu-tab";

  return (
    <div className={menuClass}>
      <div className="menu-option" onClick={() => onOptionSelect('createPost')}>
        <span>Create Post</span>
      </div>
      <div className="menu-option filters-option" onClick={() => onOptionSelect('filters')}>
        <span>Post Filters</span>
      </div>
      <div className="menu-option" onClick={() => onOptionSelect('dashboard')}>
        <span>Company Dashboard</span>
      </div>
      <div className="menu-option" onClick={() => onOptionSelect('tutorial')}>
        <span>New User Tutorial</span>
      </div>
    </div>
  );
};

export default MenuTab;

