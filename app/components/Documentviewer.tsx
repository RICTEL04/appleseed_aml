// components/DocumentViewer.tsx
'use client'

import { useEffect, useState, useCallback } from 'react';
import { FileText, ExternalLink, AlertTriangle, Loader2, ChevronDown, CheckCircle, XCircle } from 'lucide-react';
import { useDocument } from '@/app/hooks/useDocument';
import { useWorker } from '@/app/hooks/useWorker';
import { DocumentModel } from '@/lib/models/document.model';
import { WorkerModel } from '@/lib/models/worker.model';

interface DocumentViewerProps {
  orgId: string;
  worker: WorkerModel | null;
}

interface DocWithUrl {
  doc: DocumentModel;
  url: string | null;
}

const EMPTY_REVIEW = {
  nota:       '',
  comentario: '',
  estado:     'aprobado' as 'aprobado' | 'rechazado',
};

export function DocumentViewer({ orgId, worker }: DocumentViewerProps) {
  const { fetchAllDocumentsByOrg, updateDocument, loading, error } = useDocument();
  
  const [docsWithUrls, setDocsWithUrls]   = useState<DocWithUrl[]>([]);
  const [activeIndex, setActiveIndex]     = useState(0);
  const [review, setReview]               = useState(EMPTY_REVIEW);
  const [reviewError, setReviewError]     = useState<string | null>(null);
  const [saving, setSaving]               = useState(false);
  const [refreshing, setRefreshing]       = useState(false);
  const [savedId, setSavedId]             = useState<string | null>(null); // tracks which doc was just saved

  // Memoize the fetch function to avoid recreating it on each render
  const fetchDocuments = useCallback(async () => {
    if (!orgId) return;
    try {
      const [docs, urls] = await fetchAllDocumentsByOrg(orgId);
      setDocsWithUrls(docs.map((doc, i) => ({ doc, url: urls[i] ?? null })));
      // Keep the active index if it's still valid, otherwise reset to 0
      setActiveIndex(prev => (prev < docs.length ? prev : 0));
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  }, [orgId, fetchAllDocumentsByOrg]);

  // Initial fetch
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Reset review form when switching tabs
  const handleTabChange = (i: number) => {
    setActiveIndex(i);
    setReview(EMPTY_REVIEW);
    setReviewError(null);
    setSavedId(null);
  };

  const handleSave = async () => {
    if (!review.nota.trim())       { setReviewError('La nota es obligatoria');       return; }
    if (!review.comentario.trim()) { setReviewError('El comentario es obligatorio'); return; }

    const active = docsWithUrls[activeIndex];
    if (!active) return;

    setSaving(true);
    setReviewError(null);

    try {
      await updateDocument({
        ...active.doc,
        nota:         review.nota.trim(),
        comentario:   review.comentario.trim(),
        estado:       review.estado,
        id_trabajador: worker?.id_trabajador ?? undefined,
      } as DocumentModel);

      // Refetch all documents to get the updated data
      setRefreshing(true);
      await fetchDocuments();
      
      setSavedId(active.doc.id ?? null);
      setReview(EMPTY_REVIEW);
    } catch (error) {
      setReviewError('No se pudo guardar la revisión. Intenta de nuevo.');
      console.error('Error saving review:', error);
    } finally {
      setSaving(false);
      setRefreshing(false);
    }
  };

  // ── Loading / error / empty states ──────────────────────────────────────────
  if (loading && !docsWithUrls.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500 bg-gray-50 rounded-xl">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <span className="text-sm font-medium">Cargando documentos...</span>
      </div>
    );
  }

  if (error && !docsWithUrls.length) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
      </div>
    );
  }

  if (docsWithUrls.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center bg-gray-50 rounded-xl">
        <FileText className="w-12 h-12 mb-3 text-gray-300" />
        <p className="text-sm font-medium text-gray-600">Sin documentos en revisión</p>
        <p className="text-xs mt-1 text-gray-400 max-w-[200px]">Los documentos enviados por la organización aparecerán aquí.</p>
      </div>
    );
  }

  const active = docsWithUrls[activeIndex];
  const justSaved = savedId === (active.doc.id ?? null);

  return (
    <div className="space-y-4">
      {/* Refresh indicator */}
      {refreshing && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Actualizando documentos...
        </div>
      )}

      {/* Tab strip */}
      {docsWithUrls.length > 1 && (
        <div className="flex gap-2 flex-wrap border-b border-gray-200 pb-3">
          {docsWithUrls.map(({ doc }, i) => (
            <button key={doc.id ?? i} onClick={() => handleTabChange(i)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                i === activeIndex ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {doc.nombre_documento || `Documento ${i + 1}`}
              {doc.estado && (
                <span className={`ml-2 inline-block w-2 h-2 rounded-full ${
                  doc.estado === 'aprobado' ? 'bg-green-500' : 
                  doc.estado === 'rechazado' ? 'bg-red-500' : 
                  'bg-yellow-500'
                }`} />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Document header */}
      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 truncate">{active.doc.nombre_documento || 'Documento sin nombre'}</p>
            {active.doc.estado && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                active.doc.estado === 'aprobado' ? 'bg-green-100 text-green-700' :
                active.doc.estado === 'rechazado' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {active.doc.estado === 'aprobado' && <CheckCircle className="w-3 h-3" />}
                {active.doc.estado === 'rechazado' && <XCircle className="w-3 h-3" />}
                {active.doc.estado}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{active.doc.tipo_documento || 'Tipo no especificado'}</p>
        </div>
        {active.url && (
          <a href={active.url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-600 border border-emerald-200 hover:bg-emerald-50 rounded-lg transition ml-3">
            <ExternalLink className="w-3.5 h-3.5" />Abrir
          </a>
        )}
      </div>

      {/* iFrame */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 shadow-sm">
        {active.url ? (
          <iframe key={active.url} src={active.url}
            title={active.doc.nombre_documento || 'Documento'}
            className="w-full h-[500px]" />
        ) : (
          <div className="h-[500px] flex flex-col items-center justify-center text-gray-400 gap-3">
            <FileText className="w-12 h-12" />
            <p className="text-sm font-medium">Archivo no disponible</p>
          </div>
        )}
      </div>

      {/* Existing nota / comentario */}
      {(active.doc.nota || active.doc.comentario) && (
        <div className="space-y-2">
          {active.doc.nota && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs font-semibold text-blue-700 mb-1">Nota</p>
              <p className="text-sm text-gray-700">{active.doc.nota}</p>
            </div>
          )}
          {active.doc.comentario && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs font-semibold text-gray-500 mb-1">Comentario</p>
              <p className="text-sm text-gray-700">{active.doc.comentario}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Review form ──────────────────────────────────────────────────── */}
      <div className="border-t border-dashed border-gray-200 pt-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Revisión del documento</p>

        {justSaved && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Revisión guardada correctamente.
          </div>
        )}

        {/* Estado */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Estado *</label>
          <div className="relative">
            <select value={review.estado}
              onChange={e => setReview(prev => ({ ...prev, estado: e.target.value as 'aprobado' | 'rechazado' }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none appearance-none bg-white pr-8">
              <option value="aprobado">Aprobado</option>
              <option value="rechazado">Rechazado</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Nota */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nota *</label>
          <textarea rows={2} value={review.nota}
            onChange={e => { setReview(prev => ({ ...prev, nota: e.target.value })); setReviewError(null); }}
            placeholder="Escribe una nota sobre el documento..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
          />
        </div>

        {/* Comentario */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Comentario *</label>
          <textarea rows={2} value={review.comentario}
            onChange={e => { setReview(prev => ({ ...prev, comentario: e.target.value })); setReviewError(null); }}
            placeholder="Agrega un comentario para la organización..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
          />
        </div>

        {/* Reviewer (read-only) */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Revisor</label>
          <input type="text" readOnly value={worker?.nombre ?? '—'}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 outline-none"
          />
        </div>

        {reviewError && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />{reviewError}
          </p>
        )}

        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving || refreshing}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition ${
              review.estado === 'aprobado'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            } disabled:bg-gray-300 disabled:cursor-not-allowed`}>
            {saving || refreshing
              ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Guardando...</>
              : review.estado === 'aprobado'
                ? <><CheckCircle className="w-3.5 h-3.5" />Aprobar documento</>
                : <><XCircle className="w-3.5 h-3.5" />Rechazar documento</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}