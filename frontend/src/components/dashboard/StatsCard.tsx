import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    type: "increase" | "decrease" | "neutral";
  };
  variant?: "default" | "primary" | "secondary" | "accent";
  className?: string;
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = "default",
  className,
}: StatsCardProps) {
  const gradientClass = {
    default: "",
    primary: "gradient-primary text-white",
    secondary: "gradient-secondary text-white", 
    accent: "gradient-accent text-white",
  }[variant];

  const iconBgClass = {
    default: "bg-muted",
    primary: "bg-white/20",
    secondary: "bg-white/20",
    accent: "bg-white/20",
  }[variant];

  const textClass = {
    default: "text-card-foreground",
    primary: "text-white",
    secondary: "text-white",
    accent: "text-white",
  }[variant];

  return (
    <Card className={cn(
      "shadow-elegant transition-smooth hover:shadow-xl", 
      gradientClass, 
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={cn(
          "text-sm font-medium",
          variant === "default" ? "text-muted-foreground" : "text-white/80"
        )}>
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-lg", iconBgClass)}>
          <Icon className={cn(
            "h-4 w-4",
            variant === "default" ? "text-muted-foreground" : "text-white"
          )} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className={cn("text-2xl font-bold", textClass)}>
              {value}
            </div>
            {description && (
              <p className={cn(
                "text-xs mt-1",
                variant === "default" ? "text-muted-foreground" : "text-white/70"
              )}>
                {description}
              </p>
            )}
          </div>
          {trend && (
            <Badge 
              variant={trend.type === "increase" ? "default" : trend.type === "decrease" ? "destructive" : "secondary"}
              className="text-xs"
            >
              {trend.value}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}