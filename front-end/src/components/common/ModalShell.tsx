// components/common/ModalShell.tsx
import { createPortal } from "react-dom";
import "./modalShell.css";

interface Props {
  open: boolean;
  onClose: () => void;
  disableBackdropClick?: boolean;
  children: React.ReactNode;
}

const ModalShell: React.FC<Props> = ({
  open,
  onClose,
  disableBackdropClick,
  children,
}) => {
  if (!open) return null;

  return createPortal(
    <>
      <div
        className="modal-backdrop"
        onClick={() => {
          if (!disableBackdropClick) onClose();
        }}
      />

      <div className="modal-container">
        <div className="modal-content">{children}</div>
      </div>
    </>,
    document.body
  );
};

export default ModalShell;

