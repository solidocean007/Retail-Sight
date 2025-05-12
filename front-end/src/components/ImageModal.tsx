import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import "./ImageModal.css"; // Your existing styling

interface ImageModalProps {
  isOpen: boolean;
  src: string;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, src, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="image-modal-backdrop">
      <div className="image-modal-content" ref={modalRef}>
        <img src={src} alt="Full size" />
        <button className="close-modal" onClick={onClose}>
          X
        </button>
      </div>
    </div>,
    document.getElementById("modal-root")!,
  );
};

export default ImageModal;
