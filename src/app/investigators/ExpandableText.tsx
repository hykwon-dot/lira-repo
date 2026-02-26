"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ExpandableTextProps {
  text: string;
  maxLines?: number;
  className?: string;
}

export default function ExpandableText({ text, maxLines = 5, className = "" }: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);

  // Note: CSS line-clamp doesn't easily allow detecting if truncation happened without JS measurement.
  // However, for a simple "Show More" that toggles the class, we can just toggle the line-clamp class.
  // But ideally we only show the button if the text is long enough.
  // A simple approximation is character count, but line count is visual.
  // For now, I will implement a rigorous solution using a toggle.
  // If we want to hide the button when not needed, we'd need a ref and check scrollHeight vs clientHeight.
  // Let's start with a simpler "Show More" if text length > X characters as a heuristic,
  // or just always show "Show More" if we are truncating, allowing user to expand.
  //
  // Better approach for "5 lines": use `line-clamp-5`.
  // To conditionally show the button, we can check text length as a rough logic, or just let users expand if they want.
  
  // Let's try the CSS-only way + State.
  // We can't easily know if it *needs* expansion without layout effect.
  // Let's assume average chars per line ~ 20-30 chars?
  // Let's just use the `line-clamp` class toggle.
  
  return (
    <div className={`group relative ${className}`}>
        <p className={`text-sm leading-relaxed text-slate-600 transition-all ${expanded ? "" : `line-clamp-${maxLines}`}`}>
            {text}
        </p>
        <button 
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation(); // Prevent card click if needed
                setExpanded(!expanded);
            }}
            className="mt-1 text-xs font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1"
        >
            {expanded ? (
                <>접기 <ChevronUp className="w-3 h-3" /></>
            ) : (
                <>더보기 <ChevronDown className="w-3 h-3" /></>
            )}
        </button>
    </div>
  );
}
