import { type InputHTMLAttributes, forwardRef } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = "", id, ...props }, ref) => {
    const checkId = id || label?.replace(/\s+/g, "-").toLowerCase();
    return (
      <label
        htmlFor={checkId}
        className="flex items-center gap-2 cursor-pointer"
      >
        <input
          ref={ref}
          id={checkId}
          type="checkbox"
          className={`h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 ${className}`}
          {...props}
        />
        {label && (
          <span className="text-sm font-medium text-slate-700">{label}</span>
        )}
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";
