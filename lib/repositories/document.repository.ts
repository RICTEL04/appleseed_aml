// lib/repositories/document.repository.ts
// esta clase se encarga de manejar la logica de acceso a datos para los documentos,
// permite obtener, crear, y actualizar documentos en la base de datos utilizando Supabase

import { getSupabaseClient } from "../supabase";
import {IDocument, DocumentModel} from "../models/document.model";

export class DocumentRepository{

    // funcion para obtener todos los documentos de una organizacion junto con sus URLs firmadas
    async getAllWithSignedUrlsByOrg(id_osc: string): Promise<[DocumentModel[], (string|null)[]]> {
        const documents = await this.getAllByOrg(id_osc);
        console.log('Documents fetched for orgId', id_osc, ':', documents);
        const urls: (string|null)[] = [];
        for (const doc of documents) {
            const url = await this.getDocumentById(doc?.id_documento ?? '');
            urls.push(url);
        }
        return [documents, urls];
    }

    // funcion para obtener todos los documentos de una organizacion, recibe el id de la organizacion como parametro
    async getAllByOrg(id : string): Promise<DocumentModel[]> {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
            .from('documentos')
            .select('*').order('created_at', { ascending: false })
            .eq('id_osc', id)
            .not('id_documento', 'is', null)
            .eq('estado', 'en revision')
        console.log('Supabase response getAllByOrg:', { data, error })
        if (error) {
            throw new Error(error.message);
        }
        return data as DocumentModel[];
    }

    // funcion para obtener la URL firmada de un documento mediante su ID, recibe el id del documento como parametro
    async  getDocumentById(id: string): Promise<any> {
        if (!id) return null;
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
            .storage
            .from('documentos')
            .createSignedUrl(id, 60 * 60) // URL válida por 1 hora
        if (error) {
            console.error(`Error fetching document with id ${id}:`, error)
            throw new Error('Failed to fetch document')
        }
        return data ? data.signedUrl : null
    }

    // funcion para crear registro de un documento en la base de datos, 
    // recibe un objeto de tipo IDocument con los datos del nuevo documento
    async createDocumentRegister(document: IDocument): Promise<DocumentModel> {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
            .from('documentos')
            .insert(document)
            .select()
            .single()
        if (error) {
            console.error('Error creating document:', error)
            throw new Error('Failed to create document')
        }
        return data as DocumentModel;
    }

    // funcion para actualizar el documento
    async updateDocument(document: IDocument): Promise<DocumentModel>{
        const supabase = getSupabaseClient()
        const { id, ...fields } = document as any
        const { data, error } = await supabase
            .from('documentos')
            .update(fields)
            .eq('id', id)
            .select()
            .single()
        if (error) {
            console.error('Error updating document:', error)
            throw new Error('Failed to update document')
        }
        return data as DocumentModel;
    }

}

export const documentRepository = new DocumentRepository()
