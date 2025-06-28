import React, { useEffect, useRef } from "react";
import "./BeerCaseStackAnimation.css";

interface BeerCaseStackAnimationProps {
  minDuration?: number; // in milliseconds
}

const BeerCaseStackAnimation: React.FC<BeerCaseStackAnimationProps> = ({
  minDuration = 1500,
}) => {
  const stackRef = useRef<HTMLDivElement>(null);
  const cols = 4;
  const rows = 5;
  const delayBetweenBoxes = 120;
  const boxWidth = 75;
  const boxHeight = 50;
  const verticalSpacing = 55;
  const totalBoxes = cols * rows;

  useEffect(() => {
    let sound: HTMLAudioElement | null = null;
    if (typeof Audio !== "undefined") {
      sound = new Audio("/pop.mp3");
    }

    function createBox(index: number, col: number, row: number): HTMLDivElement {
      const box = document.createElement("div");
      box.classList.add("box");
      box.style.left = `${col * (boxWidth + 5)}px`;
      box.style.top = `${row * verticalSpacing}px`;
      box.style.opacity = "0";

      const dropDistance = 100;
      const animationDelay = row * cols * delayBetweenBoxes + col * delayBetweenBoxes;

      const animation = box.animate(
        [
          { transform: `translateY(-${dropDistance}px)`, opacity: 0 },
          { transform: `translateY(0px)`, opacity: 1 },
          { transform: `translateY(-10px)` },
          { transform: `translateY(3px)` },
          { transform: `translateY(0px)` }
        ],
        {
          duration: 3000,
          delay: animationDelay,
          easing: "ease-out",
          fill: "forwards"
        }
      );

      animation.onfinish = () => {
        box.style.opacity = "1";
      };

      if (sound) {
        setTimeout(() => sound?.play().catch(() => {}), animationDelay + 700);
      }

      return box;
    }

    function animateStack() {
      const stack = stackRef.current;
      if (!stack) return;
      stack.innerHTML = "";
      const boxes: HTMLDivElement[] = [];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const index = r * cols + c;
          const box = createBox(index, c, r);
          stack.appendChild(box);
          boxes.push(box);
        }
      }

      setTimeout(() => {
        let delay = 0;
        for (let j = totalBoxes - 1; j >= 0; j--) {
          const box = boxes[j];
          setTimeout(() => {
            box.classList.add(j % 2 === 0 ? "exit-left" : "exit-right");
          }, delay);
          delay += 80;
        }
      }, 7000);

      setTimeout(() => {
        animateStack(); // loop again
      }, Math.max(minDuration, 10000));
    }

    animateStack();
  }, [minDuration]);

  return <div className="stack" ref={stackRef}></div>;
};

export default BeerCaseStackAnimation;
