import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction 
}: EmptyStateProps) {
  return (
    <Card className="text-center py-12">
      <CardContent className="space-y-4">
        <Icon className="h-12 w-12 text-muted-foreground mx-auto" />
        <div>
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            {description}
          </p>
        </div>
        {actionLabel && onAction && (
          <Button onClick={onAction} className="mt-4">
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}