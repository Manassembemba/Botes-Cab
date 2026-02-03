import { useState } from 'react';
import { useDocuments, useCreateDocument, useDeleteDocument, uploadDocumentFile } from '@/hooks/useDocuments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, Trash2, ExternalLink, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DocumentManagerProps {
    entiteType: 'vehicule' | 'chauffeur';
    entiteId: number;
}

export function DocumentManager({ entiteType, entiteId }: DocumentManagerProps) {
    const { data: documents, isLoading } = useDocuments(entiteType, entiteId);
    const createMutation = useCreateDocument();
    const deleteMutation = useDeleteDocument();
    const { toast } = useToast();

    const [isUploading, setIsUploading] = useState(false);
    const [newDoc, setNewDoc] = useState({
        nom: '',
        type_document: '',
        date_expiration: '',
    });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!newDoc.nom || !newDoc.type_document) {
            toast({
                title: "Champs requis",
                description: "Veuillez saisir un nom et un type de document avant d'uploader.",
                variant: "destructive"
            });
            return;
        }

        setIsUploading(true);
        try {
            const fileName = `${entiteType}/${entiteId}/${Date.now()}_${file.name}`;
            const publicUrl = await uploadDocumentFile(file, fileName);

            await createMutation.mutateAsync({
                nom: newDoc.nom,
                type_document: newDoc.type_document,
                fichier_url: publicUrl,
                date_expiration: newDoc.date_expiration || null,
                entite_type: entiteType,
                entite_id: entiteId,
            });

            toast({ title: "Document ajouté avec succès" });
            setNewDoc({ nom: '', type_document: '', date_expiration: '' });
            // Reset input file
            e.target.value = '';
        } catch (error) {
            toast({
                title: "Erreur d'upload",
                description: error instanceof Error ? error.message : "Une erreur est survenue",
                variant: "destructive"
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) return;

        try {
            await deleteMutation.mutateAsync({ id, entiteType, entiteId });
            toast({ title: "Document supprimé" });
        } catch (error) {
            toast({
                title: "Erreur",
                description: "Impossible de supprimer le document",
                variant: "destructive"
            });
        }
    };

    const isExpired = (date: string | null) => {
        if (!date) return false;
        return new Date(date) < new Date();
    };

    const getDocTypeColor = (type: string) => {
        const types: Record<string, string> = {
            'Assurance': 'bg-blue-100 text-blue-800',
            'Contrôle technique': 'bg-purple-100 text-purple-800',
            'Permis': 'bg-green-100 text-green-800',
            'Contrat': 'bg-orange-100 text-orange-800',
            'Autre': 'bg-gray-100 text-gray-800',
        };
        return types[type] || types['Autre'];
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        Ajouter un document
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="space-y-2">
                            <Input
                                placeholder="Nom du document (ex: Assurance 2024)"
                                value={newDoc.nom}
                                onChange={(e) => setNewDoc(prev => ({ ...prev, nom: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <select
                                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                value={newDoc.type_document}
                                onChange={(e) => setNewDoc(prev => ({ ...prev, type_document: e.target.value }))}
                            >
                                <option value="">Type de document</option>
                                <option value="Assurance">Assurance</option>
                                <option value="Contrôle technique">Contrôle technique</option>
                                <option value="Carte grise">Carte grise</option>
                                <option value="Permis">Permis de conduire</option>
                                <option value="Contrat">Contrat de travail</option>
                                <option value="Autre">Autre</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Input
                                type="date"
                                placeholder="Date d'expiration"
                                value={newDoc.date_expiration}
                                onChange={(e) => setNewDoc(prev => ({ ...prev, date_expiration: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <div className="relative">
                            <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleFileUpload}
                                disabled={isUploading || !newDoc.nom || !newDoc.type_document}
                            />
                            <Button disabled={isUploading || !newDoc.nom || !newDoc.type_document} className="gap-2">
                                {isUploading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Upload className="w-4 h-4" />
                                )}
                                Sélectionner et uploader
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                    <div className="col-span-full flex justify-center py-10">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : documents?.length === 0 ? (
                    <div className="col-span-full text-center py-10 bg-muted/20 rounded-lg border-2 border-dashed">
                        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">Aucun document archivé</p>
                    </div>
                ) : (
                    documents?.map((doc) => (
                        <Card key={doc.document_id} className="relative group overflow-hidden">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <FileText className="w-6 h-6 text-primary" />
                                    </div>
                                    <Badge className={getDocTypeColor(doc.type_document)}>
                                        {doc.type_document}
                                    </Badge>
                                </div>

                                <h3 className="font-semibold text-sm mb-1 truncate" title={doc.nom}>
                                    {doc.nom}
                                </h3>

                                {doc.date_expiration && (
                                    <div className={`flex items-center gap-1 text-xs mb-3 ${isExpired(doc.date_expiration) ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                                        <Calendar className="w-3 h-3" />
                                        Exp: {format(new Date(doc.date_expiration), 'dd MMMM yyyy', { locale: fr })}
                                        {isExpired(doc.date_expiration) && " (Expiré)"}
                                    </div>
                                )}

                                <div className="flex gap-2 pt-2 border-t">
                                    <Button variant="outline" size="sm" className="flex-1 gap-1" asChild>
                                        <a href={doc.fichier_url} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="w-3 h-3" />
                                            Voir
                                        </a>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDelete(doc.document_id)}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </CardContent>
                            {isExpired(doc.date_expiration) && (
                                <div className="absolute top-0 right-0 w-2 h-full bg-destructive" />
                            )}
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
