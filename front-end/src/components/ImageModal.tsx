import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import "./ImageModal.css";
// import { resolvePostImage } from "../utils/PostLogic/derivePostImageVariants";
import FadeImage from "./FadeImage";
import CloseIcon from "@mui/icons-material/Close";

interface ImageModalProps {
  isOpen: boolean;
  srcList: string[];
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  srcList,
  onClose,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !srcList.length) return null;

  return ReactDOM.createPortal(
    <div className="image-modal-backdrop">
      <div className="image-modal-content" ref={modalRef}>
        <FadeImage srcList={srcList} className="image-modal-img" />

        <button className="close-modal" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </button>
      </div>
    </div>,
    document.getElementById("modal-root")!
  );
};

export default ImageModal;
