// components/DocumentViewer.tsx
'use client'

import { useEffect, useState } from 'react';
import { FileText, ExternalLink, AlertTriangle, Loader2, Maximize2 } from 'lucide-react';
import { useDocument } from '@/app/hooks/useDocument';
import { DocumentModel } from '@/lib/models/document.model';

interface DocumentViewerProps {
  orgId: string;
}

interface DocWithUrl {
  doc: DocumentModel;
  url: string | null;
}

export function DocumentViewer({ orgId }: DocumentViewerProps) {
  const { fetchAllDocumentsByOrg, loading, error } = useDocument();
  const [docsWithUrls, setDocsWithUrls] = useState<DocWithUrl[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!orgId) return;
    fetchAllDocumentsByOrg(orgId)
      .then(([docs, urls]) => {
        setDocsWithUrls(docs.map((doc, i) => ({ doc, url: urls[i] ?? null })));
        setActiveIndex(0);
      })
      .catch(() => {});
  }, [orgId, fetchAllDocumentsByOrg]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500 bg-gray-50 rounded-xl">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <span className="text-sm font-medium">Cargando documentos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        {error}
      </div>
    );
  }

  if (docsWithUrls.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center bg-gray-50 rounded-xl">
        <FileText className="w-12 h-12 mb-3 text-gray-300" />
        <p className="text-sm font-medium text-gray-600">Sin documentos en revisión</p>
        <p className="text-xs mt-1 text-gray-400 max-w-[200px]">
          Los documentos enviados por la organización aparecerán aquí.
        </p>
      </div>
    );
  }

  const active = docsWithUrls[activeIndex];

  return (
    <div className="space-y-4">
      {/* Document selector tabs */}
      {docsWithUrls.length > 1 && (
        <div className="flex gap-2 flex-wrap border-b border-gray-200 pb-3">
          {docsWithUrls.map(({ doc }, i) => (
            <button
              key={doc.id ?? i}
              onClick={() => setActiveIndex(i)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                i === activeIndex
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {doc.nombre_documento || `Documento ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Document header with actions */}
      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {active.doc.nombre_documento || 'Documento sin nombre'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {active.doc.tipo_documento || 'Tipo no especificado'}
          </p>
        </div>
        {active.url && (
          <div className="flex gap-2 ml-3">
            <a
              href={active.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-600 border border-emerald-200 hover:bg-emerald-50 rounded-lg transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir
            </a>
          </div>
        )}
      </div>

      {/* Document preview */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 shadow-sm">
        {active.url ? (
          <iframe
            key={active.url}
            src={active.url}
            title={active.doc.nombre_documento || 'Documento'}
            className="w-full h-[500px]"
          />
        ) : (
          <div className="h-[500px] flex flex-col items-center justify-center text-gray-400 gap-3">
            <FileText className="w-12 h-12" />
            <p className="text-sm font-medium">Archivo no disponible</p>
            <p className="text-xs">El documento no pudo ser cargado</p>
          </div>
        )}
      </div>

      {/* Notes section */}
      {(active.doc.nota || active.doc.comentario) && (
        <div className="space-y-3 mt-4">
          {active.doc.nota && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs font-semibold text-blue-700 mb-1">Nota</p>
              <p className="text-sm text-gray-700">{active.doc.nota}</p>
            </div>
          )}
          {active.doc.comentario && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 mb-1">Comentario</p>
              <p className="text-sm text-gray-700">{active.doc.comentario}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}