import { HTMLAttributes, ReactNode } from "react";

export default function Card({ children, className = "", ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={`bg-white border border-steel-200 rounded-lg shadow-card ${className}`} {...rest}>
      {children}
    </div>
  );
}
