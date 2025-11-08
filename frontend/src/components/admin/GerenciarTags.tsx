import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ColorPicker } from '@/components/ui/color-picker';
import { Plus, Trash2, Edit2, X, Save } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface TagSaude {
  id: string;
  nome: string;
  cor?: string;
  _count?: {
    criancas: number;
  };
}

interface GerenciarTagsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTagsUpdated?: () => void;
}

export function GerenciarTags({ open, onOpenChange, onTagsUpdated }: GerenciarTagsProps) {
  const [tags, setTags] = useState<TagSaude[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTag, setEditingTag] = useState<TagSaude | null>(null);
  const [novaTag, setNovaTag] = useState({ nome: '', cor: '#6b7280' });

  const fetchTags = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getTagsSaude();
      setTags(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar tags',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTags();
    }
  }, [open]);

  const handleCreateTag = async () => {
    if (!novaTag.nome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Digite um nome para a tag',
        variant: 'destructive',
      });
      return;
    }

    try {
      await apiClient.createTagSaude(novaTag);
      toast({
        title: 'Tag criada!',
        description: `A tag "${novaTag.nome}" foi criada com sucesso.`,
      });
      setNovaTag({ nome: '', cor: '#6b7280' });
      fetchTags();
      onTagsUpdated?.();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar tag',
        description: error.response?.data?.error?.message || error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateTag = async (tag: TagSaude) => {
    if (!tag.nome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Digite um nome para a tag',
        variant: 'destructive',
      });
      return;
    }

    try {
      await apiClient.updateTagSaude(tag.id, { nome: tag.nome, cor: tag.cor });
      toast({
        title: 'Tag atualizada!',
        description: `A tag foi atualizada com sucesso.`,
      });
      setEditingTag(null);
      fetchTags();
      onTagsUpdated?.();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar tag',
        description: error.response?.data?.error?.message || error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTag = async (tag: TagSaude) => {
    if (tag._count && tag._count.criancas > 0) {
      toast({
        title: 'Tag em uso',
        description: `Esta tag está sendo usada por ${tag._count.criancas} criança(s). Não é possível excluir.`,
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir a tag "${tag.nome}"?`)) {
      return;
    }

    try {
      await apiClient.deleteTagSaude(tag.id);
      toast({
        title: 'Tag excluída!',
        description: `A tag "${tag.nome}" foi excluída com sucesso.`,
      });
      fetchTags();
      onTagsUpdated?.();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir tag',
        description: error.response?.data?.error?.message || error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Tags de Saúde</DialogTitle>
          <DialogDescription>
            Crie e gerencie tags de saúde que podem ser associadas às crianças.
            Tags em uso não podem ser excluídas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Criar Nova Tag */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Criar Nova Tag</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nova-tag-nome">Nome da Tag</Label>
                    <Input
                      id="nova-tag-nome"
                      placeholder="Ex: Diabetes, Asma, Alergia..."
                      value={novaTag.nome}
                      onChange={(e) => setNovaTag({ ...novaTag, nome: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateTag();
                        }
                      }}
                    />
                  </div>
                  <div>
                    <ColorPicker
                      id="nova-tag-cor"
                      label="Cor da Tag"
                      value={novaTag.cor}
                      onChange={(cor) => setNovaTag({ ...novaTag, cor })}
                    />
                  </div>
                  <Button onClick={handleCreateTag} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Tag
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Tags Existentes */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Tags Cadastradas</h3>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando tags...
              </div>
            ) : tags.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma tag cadastrada ainda. Crie a primeira tag acima.
              </div>
            ) : (
              <div className="space-y-2">
                {tags.map((tag) => (
                  <Card key={tag.id}>
                    <CardContent className="p-4">
                      {editingTag?.id === tag.id ? (
                        // Modo de edição
                        <div className="space-y-3">
                          <Input
                            value={editingTag.nome}
                            onChange={(e) =>
                              setEditingTag({ ...editingTag, nome: e.target.value })
                            }
                            placeholder="Nome da tag"
                          />
                          <ColorPicker
                            id={`edit-tag-${editingTag.id}`}
                            label="Cor"
                            value={editingTag.cor || '#6b7280'}
                            onChange={(cor) =>
                              setEditingTag({ ...editingTag, cor })
                            }
                          />
                          <div className="flex gap-2 justify-end pt-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateTag(editingTag)}
                            >
                              <Save className="h-4 w-4 mr-1" />
                              Salvar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingTag(null)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Modo de visualização
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge
                              style={{ backgroundColor: tag.cor || '#6b7280' }}
                              className="text-white"
                            >
                              {tag.nome}
                            </Badge>
                            {tag._count && tag._count.criancas > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {tag._count.criancas}{' '}
                                {tag._count.criancas === 1 ? 'criança' : 'crianças'}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingTag(tag)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteTag(tag)}
                              disabled={tag._count && tag._count.criancas > 0}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
