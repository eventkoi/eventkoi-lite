import { Path, SVG } from "@wordpress/primitives";

export default function EmailIconSVG({
  width = 26,
  height = 20,
  className,
  ...props
}) {
  return (
    <SVG
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 29.025 22.935"
    >
      <g transform="translate(1.741 1.25)">
        <Path
          d="M5.554,6H25.989a2.562,2.562,0,0,1,2.554,2.554V23.88a2.562,2.562,0,0,1-2.554,2.554H5.554A2.562,2.562,0,0,1,3,23.88V8.554A2.562,2.562,0,0,1,5.554,6Z"
          transform="translate(-3 -6)"
          fill="none"
          stroke="#000"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
        <Path
          d="M28.543,9,15.771,17.94,3,9"
          transform="translate(-3 -6.446)"
          fill="none"
          stroke="#000"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
      </g>
    </SVG>
  );
}
