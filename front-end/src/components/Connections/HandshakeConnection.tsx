import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HandshakeIcon from "@mui/icons-material/Handshake";
import BackHandIcon from "@mui/icons-material/BackHand";
import "./handshakeConnection.css";

interface Props {
  animate?: boolean; // play entry animation if true
  pulse?: boolean; // whether clasp should pulse after
  size?: number; // optional override for icon size in rem
  accentColor?: string; // custom color override
}

const HandshakeConnection: React.FC<Props> = ({
  animate = true,
  pulse = true,
  size = 1.4,
  accentColor = "var(--accent-color)",
}) => {
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => setAnimationComplete(true), 950);
      return () => clearTimeout(timer);
    } else {
      setAnimationComplete(true);
    }
  }, [animate]);

  return (
    <div className="handshake-animation">
      <AnimatePresence mode="wait">
        {!animationComplete ? (
          <motion.div key="hands" className="hands-pair">
            {/* LEFT HAND */}
            <motion.span
              className="hand left-hand"
              initial={{ x: -10, y: 8, rotate: -10, opacity: 0 }}
              animate={{ x: 4, y: 0, rotate: 85, opacity: 1 }}
              exit={{ opacity: 0.4, scale: 0.98 }} // fade to 40% instead of disappearing
              transition={{ duration: 0.9, ease: "easeOut" }}
            >
              <BackHandIcon
                className="hand-icon left"
                style={{ fontSize: `${size}rem`, color: accentColor }}
              />
            </motion.span>

            {/* RIGHT HAND */}
            <motion.span
              className="hand right-hand"
              initial={{ x: 10, y: -8, rotate: 10, opacity: 0 }}
              animate={{ x: -4, y: 0, rotate: -85, opacity: 1 }}
              exit={{ opacity: 0.4, scale: 0.98 }}
              transition={{ duration: 0.9, ease: "easeOut", delay: 0.05 }}
            >
              <BackHandIcon
                className="hand-icon right mirrored"
                style={{ fontSize: `${size}rem`, color: accentColor }}
              />
            </motion.span>
          </motion.div>
        ) : (
          <motion.div key="clasp" className="clasp-container">
            {/* Clasp fades in while hands still faintly visible */}
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: [1.05, 1] }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <HandshakeIcon
                className="handshake-icon"
                style={{ fontSize: `${size}rem`, color: accentColor }}
              />
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HandshakeConnection;
