import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import "./ImageModal.css";
import { getLowResUrl } from "../utils/helperFunctions/getLowResUrl";
import CloseIcon from "@mui/icons-material/Close";

interface ImageModalProps {
  isOpen: boolean;
  src: string;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, src, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const lowResUrl = getLowResUrl(src);

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
        <div className="blur-up-image-wrapper">
          <img
            src={lowResUrl}
            alt="Low resolution preview"
            className={`blur-up-image post-image low-res ${
              loaded ? "hidden" : ""
            }`}
          />
          <img
            src={src}
            alt="Full size"
            className={`blur-up-image post-image full-res ${
              loaded ? "visible" : "hidden"
            }`}
            onLoad={() => setLoaded(true)}
          />
        </div>
        <button className="close-modal" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </button>
      </div>
    </div>,
    document.getElementById("modal-root")!
  );
};

export default ImageModal;
