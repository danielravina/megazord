interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export function Card({
  children,
  className = "",
  onClick,
  hover = false,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border border-slate-200 ${onClick ? "cursor-pointer" : ""} ${hover ? "hover:shadow-md hover:border-slate-300 transition-shadow" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
