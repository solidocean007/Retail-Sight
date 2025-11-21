import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import "./ImageModal.css";
import { getLowResUrl } from "../utils/helperFunctions/getLowResUrl";
import CloseIcon from "@mui/icons-material/Close";
import { resolvePostImage } from "../utils/PostLogic/resolvePostImage";
import FadeImage from "./FadeImage";

interface ImageModalProps {
  isOpen: boolean;
  src: string;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, src, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const lowResUrl = getLowResUrl(src);
  const { medium, original } = resolvePostImage({ imageUrl: src });

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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="image-modal-backdrop">
      <div className="image-modal-content" ref={modalRef}>
        <FadeImage
          srcList={[...medium, ...original]} // medium first → fallback to original (tokened)
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
