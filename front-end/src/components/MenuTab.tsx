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
      <div
        className="menu-option option-top filters-option"
        onClick={() => onOptionSelect("filters")}
      >
        <span>Filters</span>
      </div>
      <div
        className="menu-option create"
        onClick={() => onOptionSelect("createPost")}
      >
        <span><h3>Display</h3></span>
      </div>
      <div className="menu-option bottom" onClick={() => onOptionSelect("dashboard")}>
        <span>Dashboard</span>
      </div>
      {/* <div className="menu-option" onClick={() => onOptionSelect('collections')}>
        <span>Collections</span>
      </div> */}
      {/* <div className="menu-option" onClick={() => onOptionSelect('tutorial')}>
        <span>Tutorial</span>
      </div> */}
    </div>
  );
};

export default MenuTab;
