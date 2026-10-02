import React from "react";
import "./beerCaseStackAnimation.css";

type Props = {
  /** Minimum time for one complete logo reveal (ms). */
  minDuration?: number;
  /** Retained as a pacing hint for existing feed callers. */
  maxStagger?: number;
  /** Retained as a pacing hint for existing feed callers. */
  dropMs?: number;
  /** Whether the logo reveal repeats. */
  loop?: boolean;
  /** Retained for API compatibility with the former grid loader. */
  gridSize?: number;
  /** Large for the initial feed reveal; compact for pagination. */
  size?: "hero" | "compact";
};

type LoaderStyle = React.CSSProperties & {
  "--logo-cycle-duration": string;
};

const DISPLAYGRAM_D_PATH =
  "m 149.76555,351.30723 c -0.16425,-14.74398 -0.29119,-67.30112 -0.28209,-116.79365 l 0.0165,-89.98642 48.33413,-0.35484 c 62.32433,-0.45755 77.33123,0.75381 98.32369,7.93671 30.49497,10.43435 55.16972,36.08795 64.76418,67.33339 7.34476,23.91903 7.52621,59.85359 0.41104,81.3988 -7.96188,24.10908 -23.3704,45.2815 -42.31882,58.14912 -10.46528,7.10684 -22.57309,11.98734 -40.10194,16.16459 -9.10263,2.16922 -11.37689,2.2548 -69.13019,2.60127 l -59.71791,0.35826 -0.29863,-26.80723 z m 115.35681,-27.72577 c 10.39192,-3.40667 16.42121,-7.02799 23.63777,-14.19735 C 301.86888,296.3611 308.08251,273.64397 305.00297,250 302.21833,228.62018 294.22394,214.9181 278.66886,204.86437 267.49259,197.6408 262.76198,196.70022 235.25,196.23147 L 211,195.8183 V 260.90915 326 h 23.37236 c 22.02027,0 23.79915,-0.13991 30.75,-2.41854 z";

const BeerCaseStackAnimation: React.FC<Props> = ({
  minDuration = 3200,
  maxStagger = 0,
  dropMs = 0,
  loop = true,
  size = "hero",
}) => {
  const cycleDuration = Math.max(
    minDuration,
    maxStagger + dropMs + 300,
    2400,
  );
  const style: LoaderStyle = {
    "--logo-cycle-duration": `${cycleDuration}ms`,
  };

  return (
    <div
      aria-label="Loading posts"
      className="displaygram-mark-loader"
      data-loop={loop ? "true" : "false"}
      data-size={size}
      role="status"
      style={style}
    >
      <span aria-hidden="true" className="displaygram-mark-loader__glow" />
      <svg
        aria-hidden="true"
        className="displaygram-mark-loader__svg"
        viewBox="0 110 512 300"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id="displaygram-loader-gradient"
            x1="256"
            x2="256"
            y1="130"
            y2="390"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#19ddfd" />
            <stop offset="1" stopColor="#9d98e3" />
          </linearGradient>
        </defs>

        <rect
          className="displaygram-mark-loader__seed"
          x="223"
          y="228"
          width="66"
          height="66"
          rx="5"
        />

        <g className="displaygram-mark-loader__split">
          <polygon
            className="displaygram-mark-loader__triangle displaygram-mark-loader__triangle--left-inner"
            points="256,214 256,308 209,261"
          />
          <polygon
            className="displaygram-mark-loader__triangle displaygram-mark-loader__triangle--right-inner"
            points="256,214 303,261 256,308"
          />
          <polygon
            className="displaygram-mark-loader__triangle displaygram-mark-loader__triangle--left-outer"
            points="256,214 256,308 209,261"
          />
          <polygon
            className="displaygram-mark-loader__triangle displaygram-mark-loader__triangle--right-outer"
            points="256,214 303,261 256,308"
          />
        </g>

        <path
          className="displaygram-mark-loader__d"
          d={DISPLAYGRAM_D_PATH}
          fillRule="evenodd"
        />
      </svg>
    </div>
  );
};

export default BeerCaseStackAnimation;
