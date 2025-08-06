import { cn } from "@/lib/utils";
import { Path, SVG } from "@wordpress/primitives";

export default function ShareIconSVG({
  width = 16.739,
  height = 18.004,
  className,
  ...props
}) {
  return (
    <SVG
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 16.739 18.004"
      className={cn(className, "ml-3")}
    >
      <Path
        d="M6.541,9.518a1.889,1.889,0,1,0,0,1.835m0-1.835a1.891,1.891,0,0,1,0,1.835m0-1.835,8.031-4.461m-8.031,6.3,8.031,4.461m0,0a1.89,1.89,0,1,0,2.57-.734,1.89,1.89,0,0,0-2.57.734Zm0-10.758a1.889,1.889,0,1,0,.734-2.569,1.889,1.889,0,0,0-.734,2.569Z"
        transform="translate(-2.25 -1.493)"
        fill="none"
        stroke="#6f6f6f"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </SVG>
  );
}
