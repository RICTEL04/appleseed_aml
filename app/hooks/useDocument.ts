// hooks/useDocument.ts
// Este hook es usado para la obtencion y manejo de documentos, incluyendo la carga de documentos por organización,
// la creación de nuevos documentos, la actualización de documentos existentes y la obtención de documentos con URLs firmadas,
// utilizando el repositorio de documentos para interactuar con la base de datos y manejar estados de carga y error.

import { useState, useEffect, useCallback } from 'react';
import { documentRepository } from '@/lib/repositories/document.repository';
import { DocumentModel, IDocument } from '@/lib/models/document.model';

export function useDocument(){
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [documents, setDocuments] = useState<DocumentModel[]>([]);

    // hook para obtener documentos por organización
    // se activa automaticamente al cargar el perfil de la organización
    // se puede usar para cargar los documentos de la organización en el perfil de la organización
    const fetchDocuments = useCallback(async (orgId: string) => {
        try {
            setLoading(true);
            console.log('[useDocument] fetching documents for orgId =>', orgId);
            const docs = await documentRepository.getAllByOrg(orgId);
            console.log('[useDocument] documents =>', docs);
            setError(null);
            setDocuments(docs);
        }
        catch (err) {
            console.error('[useDocument] fetch error:', err);
            setError('Failed to fetch documents');
        }
        finally {
            setLoading(false);
        }
    }, []); 

    // hook para crear un nuevo documento de registro
    // se puede usar para crear un documento individualmente
    const createRegisterDocument = useCallback(async (document: IDocument) => {
        try {
            setLoading(true);
            console.log('[useDocument] creating document =>', document);
            const created = await documentRepository.createDocumentRegister(document);
            setDocuments((prev) => [...prev, created]);
            return created;
        } catch (err) {
            console.error('[useDocument] create error:', err);
            setError('Failed to create document');
            throw err;
        }
        finally {
            setLoading(false);
        }
    }, []);

    // hook para obtener todos los documentos con URLs firmadas por organización
    // hook para obtener todos los documentos con URLs firmadas por organización, 
    // se puede usar para cargar los documentos de la organización en el perfil de 
    // la organización, pero con las URLs firmadas para poder visualizarlos o descargarlos directamente desde el frontend
    const fetchAllDocumentsByOrg = useCallback(async (id: string) => {
        try {
            setLoading(true);
            console.log('[useDocument] fetching document by id =>', id);
            const url = await documentRepository.getAllWithSignedUrlsByOrg(id);
            console.log('[useDocument] document url =>', url);
            setError(null);
            return url;
        }
        catch (err) {
            console.error('[useDocument] fetch by id error:', err);
            setError('Failed to fetch document by id');
            throw err;
        }
        finally {
            setLoading(false);
        }
    }, []);

    // hook para actualizar un documento existente
    // se puede usar para actualizar un documento individualmente
    const updateDocument = useCallback(async (document: DocumentModel) => {
        try {
            setLoading(true);
            console.log('[useDocument] updating document =>', document);
            const updated = await documentRepository.updateDocument(document);
            setDocuments((prev) =>
                prev.map((d) => (d.id_documento === updated.id_documento ? updated : d))
            );
            return updated;
        } catch (err) {
            console.error('[useDocument] update error:', err);
            setError('Failed to update document');
            throw err;
        }
        finally {
            setLoading(false);
        }
    }, []);

    return { documents, loading, error, 
            fetchDocuments, 
            createRegisterDocument,
            fetchAllDocumentsByOrg,
            updateDocument};


}