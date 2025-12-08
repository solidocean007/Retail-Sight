import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import "./ImageModal.css";
import { resolvePostImage } from "../utils/PostLogic/resolvePostImage";
import FadeImage from "./FadeImage";
import CloseIcon from "@mui/icons-material/Close";

interface ImageModalProps {
  isOpen: boolean;
  src: string;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, src, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  const { medium, original } = resolvePostImage({ imageUrl: src });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="image-modal-backdrop">
      <div className="image-modal-content" ref={modalRef}>
        <FadeImage
          srcList={[...medium, ...original]}
          className="image-modal-img"
        />

        <button className="close-modal" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </button>
      </div>
    </div>,
    document.getElementById("modal-root")!
  );
};

export default ImageModal;
