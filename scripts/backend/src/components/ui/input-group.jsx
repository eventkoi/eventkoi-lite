import * as React from "react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const InputGroup = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-stretch rounded-md border border-input bg-background shadow-none overflow-hidden",
      className
    )}
    {...props}
  />
));
InputGroup.displayName = "InputGroup";

const InputGroupText = React.forwardRef(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "inline-flex items-center px-3 text-sm text-muted-foreground border-r border-input bg-muted/40",
      className
    )}
    {...props}
  />
));
InputGroupText.displayName = "InputGroupText";

const InputGroupInput = React.forwardRef(({ className, ...props }, ref) => (
  <Input
    ref={ref}
    className={cn(
      "border-0 rounded-none h-10 focus-visible:ring-0 focus-visible:ring-offset-0",
      className
    )}
    {...props}
  />
));
InputGroupInput.displayName = "InputGroupInput";

export { InputGroup, InputGroupText, InputGroupInput };
