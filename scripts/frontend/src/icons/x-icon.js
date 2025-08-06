import { Path, SVG } from "@wordpress/primitives";

export default function XIconSVG({
  width = 23,
  height = 21,
  className,
  ...props
}) {
  return (
    <SVG
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 23.006 20.85"
    >
      <Path
        d="M18.118.75h3.529L13.939,9.582,23.006,21.6h-7.1l-5.56-7.29L3.984,21.6H.454L8.7,12.153,0,.75H7.28l5.025,6.662L18.119.75ZM16.881,19.483h1.956L6.216,2.756H4.12Z"
        transform="translate(0 -0.75)"
      />
    </SVG>
  );
}
