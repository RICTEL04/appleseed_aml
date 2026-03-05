import { useState, useEffect, useCallback } from 'react';
import { documentRepository } from '@/lib/repositories/document.repository';
import { DocumentModel, IDocument } from '@/lib/models/document.model';

export function useDocument(){
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [documents, setDocuments] = useState<DocumentModel[]>([]);

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

    return { documents, loading, error, 
            fetchDocuments, 
            createRegisterDocument,
            fetchAllDocumentsByOrg};


}