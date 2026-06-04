import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconClassName?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Logo({ className, iconClassName, showText = true, size = "md" }: LogoProps) {
  const sizes = {
    sm: "h-8",
    md: "h-12",
    lg: "h-20",
    xl: "h-32",
  };

  return (
    <div className={cn("flex items-center", className)}>
      <img 
        src="/LOGO.png" 
        alt="Botes CAB Logo" 
        className={cn(
          "object-contain",
          sizes[size],
          iconClassName
        )}
      />
    </div>
  );
}
