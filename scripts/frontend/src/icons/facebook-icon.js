import { Path, SVG } from "@wordpress/primitives";

export default function FacebookIconSVG({
  width = 30,
  height = 30,
  className,
  ...props
}) {
  return (
    <SVG
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 30.421 30.421"
    >
      <Path
        d="M30.419,15.3A15.211,15.211,0,1,0,12.83,30.42V19.727H8.971V15.3h3.863V11.93c0-3.835,2.272-5.952,5.745-5.952a23.263,23.263,0,0,1,3.4.3v3.764H20.066a2.206,2.206,0,0,0-2.477,2.392V15.3h4.217l-.673,4.422H17.587V30.418A15.279,15.279,0,0,0,30.419,15.3"
        transform="translate(0.002 0.001)"
      />
    </SVG>
  );
}
