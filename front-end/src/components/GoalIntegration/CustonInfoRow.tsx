import React, { useState } from "react";
import "./customInfoRow.css";

interface CustomInfoRowProps {
  data: Record<string, string | number>; // Key-value pairs
  mobileVisibleCount?: number; // How many fields to show on mobile before expanding
  columnsPerRow?: number; // Number of items per row in expanded mode
  mobile?: boolean; // Whether mobile layout should be applied
}

const CustomInfoRow: React.FC<CustomInfoRowProps> = ({
  data,
  mobileVisibleCount = 2,
  columnsPerRow = 3,
  mobile = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  
  // Convert object to an array of key-value pairs
  const entries = Object.entries(data);
  
  // Limit visible fields on mobile before expanding
  const visibleEntries = expanded ? entries : entries.slice(0, mobileVisibleCount);

  return (
    <div className={`custom-info-row ${mobile ? "mobile-layout" : ""}`}>
      {/* Display Key-Value Pairs */}
      <div className="info-grid" style={{ gridTemplateColumns: `repeat(${columnsPerRow}, 1fr)` }}>
        {visibleEntries.map(([key, value]) => (
          <div key={key} className="info-item">
            <strong>{key}:</strong> {value}
          </div>
        ))}
      </div>

      {/* Expand/Collapse Button */}
      {entries.length > mobileVisibleCount && (
        <button
          className="expand-button" 
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded ? "Show Less" : "Show More"}
        </button>
      )}
    </div>
  );
};

export default CustomInfoRow;
