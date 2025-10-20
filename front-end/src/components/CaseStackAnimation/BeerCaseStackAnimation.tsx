import React, { useEffect, useMemo, useRef, useState } from "react";
import "./beerCaseStackAnimation.css";

type Props = {
  /** Minimum time for one full cycle (ms). Should be >= maxStagger + dropMs. */
  minDuration?: number;
  /** Max random start delay per pixel (ms). Bigger = more “rain”. */
  maxStagger?: number;
  /** Duration of the CSS drop animation (ms). Must match CSS keyframes timing. */
  dropMs?: number;
  /** Whether to loop the animation. */
  loop?: boolean;
  /** Grid size of the rectangle (NxN). */
  gridSize?: number;
};

const D_PATTERN = [
  "11111110",
  "11000011",
  "11000011",
  "11000011",
  "1111110",
]; // 5 rows x 7 cols; "0" = hole (negative space)

const BeerCaseStackAnimation: React.FC<Props> = ({
  minDuration = 3500,
  maxStagger = 2000,
  dropMs = 800,
  loop = true,
  gridSize = 30,
}) => {
  const stackRef = useRef<HTMLDivElement>(null);
  const [cycleKey, setCycleKey] = useState(0);

  // Build pixel grid once per cycle
  const pixels = useMemo(() => {
    const items: JSX.Element[] = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        // center the 5x7 “D” mask in the grid
        const dR = r - Math.floor((gridSize - D_PATTERN.length) / 2);
        const dC = c - Math.floor((gridSize - D_PATTERN[0].length) / 2);
        const insideMask =
          dR >= 0 &&
          dR < D_PATTERN.length &&
          dC >= 0 &&
          dC < D_PATTERN[0].length;

        // holes where mask has "0"
        const isHole = insideMask && D_PATTERN[dR][dC] === "0";

        items.push(
          <div
            key={`${cycleKey}-${r}-${c}`}
            className="pixel"
            data-hole={isHole ? "1" : "0"}
            style={{ backgroundColor: isHole ? "transparent" : "var(--box-color)" }}
          />
        );
      }
    }
    return items;
  }, [cycleKey, gridSize]);

  useEffect(() => {
    const root = stackRef.current;
    if (!root) return;

    const px = Array.from(root.querySelectorAll<HTMLDivElement>(".pixel"));
    // Stagger each pixel and trigger its CSS animation
    px.forEach((el) => {
      const delay = Math.random() * maxStagger;
      const isHole = el.dataset.hole === "1";
      // Holes stay transparent (no .show), but we still delay so the timing feels uniform
      setTimeout(() => {
        if (!isHole) el.classList.add("show");
      }, delay);
    });

    const sceneMs = Math.max(minDuration, maxStagger + dropMs + 200); // small buffer
    if (!loop) return;

    const t = setTimeout(() => {
      // reset cycle: remove .show by re-keying the grid
      setCycleKey((k) => k + 1);
    }, sceneMs);

    return () => clearTimeout(t);
  }, [cycleKey, loop, maxStagger, minDuration, dropMs]);

  return (
    <div
      className="stack"
      ref={stackRef}
      style={{
        // auto-fit square: tweak as you like or make it a prop
        width: 600,
        height: 500,
        gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
        gridTemplateRows: `repeat(${gridSize}, 1fr)`,
      }}
    >
      {pixels}
    </div>
  );
};

export default BeerCaseStackAnimation;
