// MenuTab.tsx
import "./menuTab.css";

const MenuTab = ({
  onOptionSelect,
  show,
}: {
  onOptionSelect: (option: string) => void;
  show: boolean;
}) => {
  // Conditional class application based on the show prop
  const menuClass = show ? "menu-tab open" : "menu-tab";

  return (
    <div className={menuClass}>
      <div className="menu-option" onClick={() => onOptionSelect("createPost")}>
        Create
      </div>
      <div
        className="menu-option filters-option"
        onClick={() => onOptionSelect("filters")}
      >
        {/* <span>Filters</span> */}
        Filters
      </div>
      <div className="menu-option" onClick={() => onOptionSelect("dashboard")}>
        {/* <span>Dashboard</span> */}
        Dashboard
      </div>
    </div>
  );
};

export default MenuTab;
