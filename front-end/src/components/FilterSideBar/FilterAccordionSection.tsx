import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { ReactNode } from "react";

type FilterAccordionSectionProps = {
  id: string;
  title: string;
  icon: ReactNode;
  open: boolean;
  summary?: string;
  onToggle: (id: string) => void;
  children: ReactNode;
};

const FilterAccordionSection = ({
  id,
  title,
  icon,
  open,
  summary,
  onToggle,
  children,
}: FilterAccordionSectionProps) => (
  <section className={`filter-section${open ? " open" : ""}`}>
    <button
      type="button"
      className="section-toggle"
      aria-expanded={open}
      aria-controls={`filter-section-${id}`}
      onClick={() => onToggle(id)}
    >
      <span className="section-toggle__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="section-toggle__copy">
        <strong>{title}</strong>
        {summary && <small>{summary}</small>}
      </span>
      <ExpandMoreRoundedIcon className="section-toggle__chevron" />
    </button>
    <div id={`filter-section-${id}`} className="filter-group">
      {children}
    </div>
  </section>
);

export default FilterAccordionSection;
