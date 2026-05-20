import React from "react";
import { cn } from "./Icon";

export function Button({ children, className = "", variant = "primary", ...props }) {
  const styles = {
    primary: "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200 hover:shadow-indigo-300",
    secondary: "border border-slate-200 bg-white/90 text-slate-800 hover:border-indigo-200 hover:bg-indigo-50",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
    soft: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100",
  };
  return (
    <button type="button" {...props} className={cn("inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[14px] leading-5 font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70", styles[variant], className)}>
      {children}
    </button>
  );
}