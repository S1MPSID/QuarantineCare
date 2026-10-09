import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  default: "bg-slate-100 text-slate-800",
  success: "bg-teal-50 text-teal-800 border border-teal-200",
  warning: "bg-amber-50 text-amber-900 border border-amber-200",
  danger: "bg-red-50 text-red-800 border border-red-200",
  info: "bg-sky-50 text-sky-900 border border-sky-200",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
