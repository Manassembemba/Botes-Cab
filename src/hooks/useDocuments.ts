import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { type Database } from '@/integrations/supabase/types';

export type Document = Database['public']['Tables']['tb_documents']['Row'];
export type DocumentInsert = Database['public']['Tables']['tb_documents']['Insert'];
export type DocumentUpdate = Database['public']['Tables']['tb_documents']['Update'];

export function useDocuments(entiteType?: string, entiteId?: number) {
    return useQuery({
        queryKey: ['documents', entiteType, entiteId],
        queryFn: async () => {
            let query = supabase.from('tb_documents').select('*');

            if (entiteType) {
                query = query.eq('entite_type', entiteType);
            }
            if (entiteId) {
                query = query.eq('entite_id', entiteId);
            }

            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            return data as Document[];
        },
        enabled: !!entiteType && !!entiteId,
    });
}

export function useCreateDocument() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newDocument: DocumentInsert) => {
            const { data, error } = await supabase
                .from('tb_documents')
                .insert(newDocument)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['documents', data.entite_type, data.entite_id] });
        },
    });
}

export function useUpdateDocument() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...update }: DocumentUpdate & { id: number }) => {
            const { data, error } = await supabase
                .from('tb_documents')
                .update(update)
                .eq('document_id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['documents', data.entite_type, data.entite_id] });
        },
    });
}

export function useDeleteDocument() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, entiteType, entiteId }: { id: number; entiteType: string; entiteId: number }) => {
            const { error } = await supabase
                .from('tb_documents')
                .delete()
                .eq('document_id', id);

            if (error) throw error;
            return { entiteType, entiteId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['documents', data.entiteType, data.entiteId] });
        },
    });
}

export async function uploadDocumentFile(file: File, path: string) {
    const { data, error } = await supabase.storage
        .from('documents')
        .upload(path, file, {
            cacheControl: '3600',
            upsert: true
        });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(data.path);

    return publicUrl;
}
