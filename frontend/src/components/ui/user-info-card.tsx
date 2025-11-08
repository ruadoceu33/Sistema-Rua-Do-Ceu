import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Shield, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function UserInfoCard() {
  const { profile } = useAuth();

  if (!profile) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          label: 'Administrador',
          variant: 'default' as const,
          icon: Shield,
          description: 'Acesso total ao sistema'
        };
      case 'colaborador':
        return {
          label: 'Colaborador',
          variant: 'secondary' as const,
          icon: Users,
          description: 'Acesso aos locais designados'
        };
      default:
        return {
          label: 'Usuário',
          variant: 'outline' as const,
          icon: User,
          description: 'Usuário do sistema'
        };
    }
  };

  const roleInfo = getRoleInfo(profile.role);
  const RoleIcon = roleInfo.icon;

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {getInitials(profile.nome)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-sm truncate">{profile.nome}</p>
              <Badge variant={roleInfo.variant} className="text-xs">
                <RoleIcon className="h-3 w-3 mr-1" />
                {roleInfo.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {profile.email}
            </p>
            <p className="text-xs text-muted-foreground">
              {roleInfo.description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}