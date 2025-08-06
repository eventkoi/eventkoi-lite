import { Path, SVG } from "@wordpress/primitives";

export default function LinkedinIconSVG({
  width = 25,
  height = 25,
  className,
  ...props
}) {
  return (
    <SVG
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24.627 24.627"
    >
      <Path
        d="M5.513,24.627H.407V8.185H5.513ZM2.957,5.943A2.971,2.971,0,1,1,5.914,2.958,2.982,2.982,0,0,1,2.957,5.943ZM24.622,24.627H19.527v-8c0-1.908-.038-4.354-2.655-4.354-2.655,0-3.061,2.072-3.061,4.216v8.141h-5.1V8.185h4.9v2.243h.071A5.365,5.365,0,0,1,18.51,7.773c5.167,0,6.117,3.4,6.117,7.822v9.032Z"
        transform="translate(0 -0.001)"
      />
    </SVG>
  );
}
