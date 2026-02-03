import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentManager } from '@/components/documents/DocumentManager';
import { useVehicules } from '@/hooks/useVehicules';
import { useChauffeurs } from '@/hooks/useChauffeurs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FileText, Car, Users } from 'lucide-react';

export default function Documents() {
    const { data: vehicules } = useVehicules();
    const { data: chauffeurs } = useChauffeurs();

    const [selectedVehicule, setSelectedVehicule] = useState<number | null>(null);
    const [selectedChauffeur, setSelectedChauffeur] = useState<number | null>(null);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Centre de Documents</h1>
                <p className="text-muted-foreground mt-1">Archivage et gestion des documents obligatoires</p>
            </div>

            <Tabs defaultValue="vehicules" className="space-y-4">
                <TabsList className="bg-muted p-1">
                    <TabsTrigger value="vehicules" className="gap-2">
                        <Car className="w-4 h-4" />
                        Véhicules
                    </TabsTrigger>
                    <TabsTrigger value="chauffeurs" className="gap-2">
                        <Users className="w-4 h-4" />
                        Chauffeurs
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="vehicules" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Sélectionner un véhicule</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="max-w-md space-y-2">
                                <Label>Véhicule</Label>
                                <Select
                                    value={selectedVehicule?.toString() || ''}
                                    onValueChange={(v) => setSelectedVehicule(parseInt(v))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choisir un véhicule..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vehicules?.map((v) => (
                                            <SelectItem key={v.vehicule_id} value={v.vehicule_id.toString()}>
                                                {v.marque} {v.modele} ({v.immatriculation})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {selectedVehicule ? (
                        <DocumentManager entiteType="vehicule" entiteId={selectedVehicule} />
                    ) : (
                        <div className="text-center py-20 bg-muted/10 rounded-xl border-2 border-dashed">
                            <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground font-medium">Sélectionnez un véhicule pour gérer ses documents</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="chauffeurs" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Sélectionner un chauffeur</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="max-w-md space-y-2">
                                <Label>Chauffeur</Label>
                                <Select
                                    value={selectedChauffeur?.toString() || ''}
                                    onValueChange={(v) => setSelectedChauffeur(parseInt(v))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choisir un chauffeur..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {chauffeurs?.map((c) => (
                                            <SelectItem key={c.chauffeur_id} value={c.chauffeur_id.toString()}>
                                                {c.prenom} {c.nom}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {selectedChauffeur ? (
                        <DocumentManager entiteType="chauffeur" entiteId={selectedChauffeur} />
                    ) : (
                        <div className="text-center py-20 bg-muted/10 rounded-xl border-2 border-dashed">
                            <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground font-medium">Sélectionnez un chauffeur pour gérer ses documents</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
