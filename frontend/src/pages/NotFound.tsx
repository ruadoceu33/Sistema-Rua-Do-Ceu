import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardContent className="p-8 text-center">
          <div className="gradient-primary rounded-full p-6 w-20 h-20 mx-auto mb-6">
            <Search className="h-8 w-8 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">404</h1>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Página não encontrada
          </h2>
          <p className="text-muted-foreground mb-6">
            A página que você está procurando não existe ou foi movida.
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={() => window.location.href = "/"} 
              className="w-full" 
              variant="gradient"
            >
              <Home className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
            <Button 
              onClick={() => window.history.back()} 
              variant="outline" 
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Página Anterior
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
