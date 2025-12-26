import { cn } from "@/lib/utils";

interface ForzeoLogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export function ForzeoLogo({ className, showText = true, size = "md" }: ForzeoLogoProps) {
  const sizes = {
    sm: { icon: "h-6 w-6", text: "text-lg" },
    md: { icon: "h-8 w-8", text: "text-xl" },
    lg: { icon: "h-10 w-10", text: "text-2xl" },
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* FORZEO Icon - Stylized F with diagonal lines */}
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={sizes[size].icon}
      >
        {/* Three diagonal lines forming the F mark */}
        <path
          d="M8 32L20 8"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="text-muted-foreground"
        />
        <path
          d="M14 32L26 8"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="text-muted-foreground/70"
        />
        <path
          d="M20 32L32 8"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="text-muted-foreground/40"
        />
      </svg>
      
      {showText && (
        <span className={cn("font-semibold tracking-tight text-foreground", sizes[size].text)}>
          FORZEO
        </span>
      )}
    </div>
  );
}

export function ForzeoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Three diagonal lines forming the F mark */}
      <path
        d="M8 32L20 8"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="text-slate-400"
      />
      <path
        d="M14 32L26 8"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="text-slate-500"
      />
      <path
        d="M20 32L32 8"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="text-slate-600"
      />
    </svg>
  );
}
