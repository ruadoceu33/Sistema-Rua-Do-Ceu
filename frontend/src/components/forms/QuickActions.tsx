import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { 
  Users, 
  Gift, 
  MapPin, 
  Calendar as CalendarIcon,
  Plus 
} from "lucide-react";
import { cn } from "@/lib/utils";

export function QuickActions() {
  const [childBirthDate, setChildBirthDate] = useState<Date>();
  const [donationDate, setDonationDate] = useState<Date>();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Cadastrar Criança */}
      <Dialog>
        <DialogTrigger asChild>
          <Card className="hover:shadow-lg transition-smooth cursor-pointer group">
            <CardContent className="p-6 text-center">
              <div className="gradient-primary rounded-full p-4 w-16 h-16 mx-auto mb-4 group-hover:scale-110 transition-smooth">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Cadastrar Criança</h3>
              <p className="text-sm text-muted-foreground">
                Adicionar nova criança ao sistema
              </p>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Cadastrar Nova Criança
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="child-name">Nome Completo</Label>
              <Input id="child-name" placeholder="Digite o nome da criança" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="child-gender">Gênero</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data de Nascimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !childBirthDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {childBirthDate ? (
                        format(childBirthDate, "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        "Selecionar"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={childBirthDate}
                      onSelect={setChildBirthDate}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <Label htmlFor="child-school">Escola</Label>
              <Input id="child-school" placeholder="Nome da escola" />
            </div>
            <div>
              <Label htmlFor="child-local">Local de Atendimento</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar local" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="centro-norte">Centro Norte</SelectItem>
                  <SelectItem value="centro-sul">Centro Sul</SelectItem>
                  <SelectItem value="centro-leste">Centro Leste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" variant="gradient">
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Criança
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Registrar Doação */}
      <Dialog>
        <DialogTrigger asChild>
          <Card className="hover:shadow-lg transition-smooth cursor-pointer group">
            <CardContent className="p-6 text-center">
              <div className="gradient-secondary rounded-full p-4 w-16 h-16 mx-auto mb-4 group-hover:scale-110 transition-smooth">
                <Gift className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Registrar Doação</h3>
              <p className="text-sm text-muted-foreground">
                Adicionar itens ao estoque
              </p>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-secondary" />
              Registrar Nova Doação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="donation-item">Descrição do Item</Label>
              <Input id="donation-item" placeholder="Ex: Kit escolar, brinquedos, roupas..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="donation-quantity">Quantidade</Label>
                <Input id="donation-quantity" type="number" placeholder="0" min="1" />
              </div>
              <div>
                <Label>Data de Recebimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !donationDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {donationDate ? (
                        format(donationDate, "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        "Hoje"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={donationDate}
                      onSelect={setDonationDate}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <Label htmlFor="donation-local">Local de Destino</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar local" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="centro-norte">Centro Norte</SelectItem>
                  <SelectItem value="centro-sul">Centro Sul</SelectItem>
                  <SelectItem value="centro-leste">Centro Leste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="donation-notes">Observações</Label>
              <Textarea 
                id="donation-notes" 
                placeholder="Informações adicionais sobre a doação..."
                className="resize-none"
                rows={3}
              />
            </div>
            <Button className="w-full" variant="gradient-secondary">
              <Plus className="h-4 w-4 mr-2" />
              Registrar Doação
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cadastrar Local */}
      <Dialog>
        <DialogTrigger asChild>
          <Card className="hover:shadow-lg transition-smooth cursor-pointer group">
            <CardContent className="p-6 text-center">
              <div className="gradient-accent rounded-full p-4 w-16 h-16 mx-auto mb-4 group-hover:scale-110 transition-smooth">
                <MapPin className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Cadastrar Local</h3>
              <p className="text-sm text-muted-foreground">
                Adicionar ponto de atendimento
              </p>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent-foreground" />
              Cadastrar Novo Local
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="local-name">Nome do Local</Label>
              <Input id="local-name" placeholder="Ex: Centro Comunitário Norte" />
            </div>
            <div>
              <Label htmlFor="local-address">Endereço Completo</Label>
              <Textarea 
                id="local-address" 
                placeholder="Rua, número, bairro, cidade..."
                className="resize-none"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="local-phone">Telefone</Label>
              <Input id="local-phone" placeholder="(11) 99999-9999" />
            </div>
            <div>
              <Label htmlFor="local-responsible">Responsável Principal</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="joao">João Silva</SelectItem>
                  <SelectItem value="maria">Maria Santos</SelectItem>
                  <SelectItem value="pedro">Pedro Costa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" variant="gradient">
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Local
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}