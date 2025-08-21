"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Slider = React.forwardRef(({ className, value, onValueChange, max = 100, min = 0, step = 1, ...props }, ref) => {
  const [internalValue, setInternalValue] = React.useState(value || [min]);
  const currentValue = value || internalValue;
  
  const handleChange = (event) => {
    const newValue = [parseFloat(event.target.value)];
    setInternalValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <div className={cn("relative flex w-full touch-none select-none items-center", className)} ref={ref} {...props}>
      <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <div 
          className="absolute h-full bg-primary transition-all"
          style={{ width: `${((currentValue[0] - min) / (max - min)) * 100}%` }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue[0]}
        onChange={handleChange}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
      <div 
        className="absolute h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        style={{ left: `calc(${((currentValue[0] - min) / (max - min)) * 100}% - 10px)` }}
      />
    </div>
  );
});
Slider.displayName = "Slider";

export { Slider };