"use client"
import { useEffect, useRef, useState } from 'react';
import { FileText, Upload, CheckCircle, Clock, AlertTriangle, Calendar, Eye } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';

type DocumentStatus = 'approved' | 'pending' | 'overdue' | 'in_review';

interface Document {
  id: string;
  created_at: string;
  nombre_documento: string | null;
  tipo_documento: string | null;
  vencimiento: string | null;
  nota: string | null;
  estado: string | null;
  id_documento: string | null;
  id_osc: string | null;
  comentario: string | null;
  documento_enviado: string | null;
}

const DOCUMENT_COLUMNS = 'id, created_at, nombre_documento, tipo_documento, vencimiento, nota, estado, id_documento, id_osc, comentario, documento_enviado';

const normalizeStatus = (status: string | null): DocumentStatus => {
  const normalized = (status ?? '').trim().toLowerCase();

  if (normalized === 'aprobado' || normalized === 'approved') return 'approved';
  if (normalized === 'en revision' || normalized === 'en revisión' || normalized === 'in_review') return 'in_review';
  if (normalized === 'vencido' || normalized === 'overdue') return 'overdue';
  return 'pending';
};

export function Documents() {
  const [selectedTab, setSelectedTab] = useState<'all' | 'pending' | 'approved'>('all');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadComment, setUploadComment] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragDepthRef = useRef(0);

  useEffect(() => {
    const currentOrganizationId = localStorage.getItem('organization_id');
    setOrganizationId(currentOrganizationId);
  }, []);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!organizationId) {
        setDocuments([]);
        setLoading(false);
        setLoadingError('No se encontró la organización activa.');
        return;
      }

      setLoading(true);
      setLoadingError(null);

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('documentos')
        .select(DOCUMENT_COLUMNS)
        .eq('id_osc', organizationId)
        .order('vencimiento', { ascending: true });

      if (error) {
        setLoadingError(`No fue posible cargar los documentos: ${error.message}`);
        setDocuments([]);
      } else {
        setDocuments((data ?? []) as Document[]);
      }

      setLoading(false);
    };

    void fetchDocuments();
  }, [organizationId]);

  const filteredDocuments = documents.filter((doc) => {
    const status = normalizeStatus(doc.estado);
    if (selectedTab === 'all') return true;
    if (selectedTab === 'pending') return status === 'pending' || status === 'overdue' || status === 'in_review';
    if (selectedTab === 'approved') return status === 'approved';
    return true;
  });

  const getStatusBadge = (status: string) => {
    const configs = {
      approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Aprobado', icon: CheckCircle },
      pending: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Pendiente', icon: Clock },
      overdue: { bg: 'bg-red-100', text: 'text-red-700', label: 'Vencido', icon: AlertTriangle },
      in_review: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En Revisión', icon: Eye },
    };

    const config = configs[status as keyof typeof configs];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleUploadClick = (doc: Document) => {
    setSelectedDocument(doc);
    setSelectedFile(null);
    setUploadComment(doc.comentario ?? '');
    setUploadError(null);
    setIsDragOver(false);
    setUploadModalOpen(true);
  };

  const handleSelectedFile = (file: File | null) => {
    if (!file) return;
    setSelectedFile(file);
    setUploadError(null);
  };

  const handlePreviewDocument = async (doc: Document) => {
    if (!doc.id_documento) {
      setPreviewError('Este documento no tiene archivo asociado.');
      return;
    }

    setPreviewModalOpen(true);
    setPreviewDocument(doc);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewUrl(null);

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .storage
      .from('documentos')
      .createSignedUrl(doc.id_documento, 60 * 60);

    if (error || !data?.signedUrl) {
      setPreviewError(`No fue posible abrir el documento: ${error?.message ?? 'archivo no disponible'}`);
      setPreviewLoading(false);
      return;
    }

    setPreviewUrl(data.signedUrl);
    setPreviewLoading(false);
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDocument) return;
    if (!selectedFile) {
      setUploadError('Selecciona un archivo antes de subir.');
      return;
    }

    const supabase = getSupabaseClient();
    const documentUuid = crypto.randomUUID();

    setUploading(true);
    setUploadError(null);

    const { error: uploadStorageError } = await supabase
      .storage
      .from('documentos')
      .upload(documentUuid, selectedFile, {
        upsert: false,
        contentType: selectedFile.type || undefined,
      });

    if (uploadStorageError) {
      setUploadError(`No fue posible subir el archivo al bucket: ${uploadStorageError.message}`);
      setUploading(false);
      return;
    }

    const updatePayload = {
      id_documento: documentUuid,
      comentario: uploadComment.trim() ? uploadComment.trim() : null,
      estado: 'en revision',
      documento_enviado: new Date().toISOString(),
    };

    const { data: updatedDocument, error: updateError } = await supabase
      .from('documentos')
      .update(updatePayload)
      .eq('id', selectedDocument.id)
      .select(DOCUMENT_COLUMNS)
      .single();

    if (updateError) {
      setUploadError(`El archivo se subió, pero no se pudo actualizar el documento: ${updateError.message}`);
      setUploading(false);
      return;
    }

    setDocuments((prev) => prev.map((doc) => (doc.id === selectedDocument.id ? (updatedDocument as Document) : doc)));
    setUploadModalOpen(false);
    setSelectedDocument(null);
    setSelectedFile(null);
    setUploadComment('');
    setUploading(false);
  };

  const pendingCount = documents.filter((d) => {
    const status = normalizeStatus(d.estado);
    return status === 'pending' || status === 'overdue';
  }).length;
  const approvedCount = documents.filter((d) => normalizeStatus(d.estado) === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Documentos</h1>
        <p className="text-gray-600">Gestiona y sube los documentos requeridos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
              <p className="text-sm text-gray-600">Pendientes</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
              <p className="text-sm text-gray-600">Aprobados</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedTab('all')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
              selectedTab === 'all'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setSelectedTab('pending')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
              selectedTab === 'pending'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Pendientes ({pendingCount})
          </button>
          <button
            onClick={() => setSelectedTab('approved')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
              selectedTab === 'approved'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Aprobados ({approvedCount})
          </button>
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        {loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-gray-600">
            Cargando documentos...
          </div>
        )}

        {!loading && loadingError && (
          <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-6 text-red-700">
            {loadingError}
          </div>
        )}

        {!loading && !loadingError && filteredDocuments.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-gray-600">
            No hay documentos para mostrar.
          </div>
        )}

        {filteredDocuments.map((doc) => {
          const status = normalizeStatus(doc.estado);
          const hasDueDate = Boolean(doc.vencimiento);
          const daysUntilDue = hasDueDate ? getDaysUntilDue(doc.vencimiento as string) : null;
          const isUrgent = daysUntilDue !== null && daysUntilDue <= 5 && (status === 'pending' || status === 'overdue');

          return (
            <div
              key={doc.id}
              className={`bg-white rounded-xl shadow-sm border-2 p-6 transition ${
                isUrgent ? 'border-red-200 bg-red-50' : 'border-gray-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    status === 'approved' ? 'bg-emerald-100' :
                    status === 'overdue' ? 'bg-red-100' :
                    status === 'in_review' ? 'bg-blue-100' :
                    'bg-orange-100'
                  }`}>
                    <FileText className={`w-6 h-6 ${
                      status === 'approved' ? 'text-emerald-600' :
                      status === 'overdue' ? 'text-red-600' :
                      status === 'in_review' ? 'text-blue-600' :
                      'text-orange-600'
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1">{doc.nombre_documento || 'Documento sin nombre'}</h3>
                    <p className="text-sm text-gray-600 mb-3">{doc.tipo_documento || 'Sin tipo'}</p>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      {doc.vencimiento && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span>Vence: {new Date(doc.vencimiento).toLocaleDateString('es-MX')}</span>
                        </div>
                      )}
                      {doc.documento_enviado && (
                        <div className="flex items-center gap-1.5">
                          <Upload className="w-4 h-4" />
                          <span>Subido: {new Date(doc.documento_enviado).toLocaleDateString('es-MX')}</span>
                        </div>
                      )}
                    </div>

                    {doc.nota && (
                      <p className="text-sm text-gray-600 mt-3 p-3 bg-gray-50 rounded-lg">
                        <strong>Nota:</strong> {doc.nota}
                      </p>
                    )}

                    {doc.comentario && (
                      <p className="text-sm text-gray-600 mt-3 p-3 bg-gray-50 rounded-lg">
                        <strong>Comentario:</strong> {doc.comentario}
                      </p>
                    )}

                    {isUrgent && daysUntilDue !== null && (
                      <div className="flex items-center gap-2 mt-3 text-sm font-medium text-red-600">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{daysUntilDue < 0 ? 'Vencido' : `${daysUntilDue} días restantes`}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:items-end">
                  {getStatusBadge(status)}

                  <div className="flex gap-2">
                    {(status === 'approved' || status === 'in_review') && doc.id_documento && (
                      <button
                        onClick={() => void handlePreviewDocument(doc)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
                      >
                        <Eye className="w-4 h-4" />
                        Ver documento
                      </button>
                    )}
                    {status === 'pending' && (
                      <button
                        onClick={() => handleUploadClick(doc)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition"
                      >
                        <Upload className="w-4 h-4" />
                        Subir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Subir Documento: {selectedDocument.nombre_documento || 'Documento'}
            </h2>

            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar Archivo
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    dragDepthRef.current += 1;
                    setIsDragOver(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    event.dataTransfer.dropEffect = 'copy';
                    setIsDragOver(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
                    if (dragDepthRef.current === 0) {
                      setIsDragOver(false);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    dragDepthRef.current = 0;
                    setIsDragOver(false);
                    const droppedFile = event.dataTransfer.files?.[0] ?? null;
                    handleSelectedFile(droppedFile);
                  }}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer ${
                    isDragOver
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-300 hover:border-emerald-500'
                  }`}
                >
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-1">
                    Haz clic para seleccionar o arrastra el archivo aquí
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, DOC, DOCX hasta 10MB
                  </p>
                  {selectedFile && (
                    <p className="text-xs text-emerald-700 mt-2 font-medium">
                      Archivo seleccionado: {selectedFile.name}
                    </p>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      handleSelectedFile(file);
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comentarios (opcional)
                </label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                  placeholder="Agrega cualquier comentario adicional..."
                  value={uploadComment}
                  onChange={(event) => setUploadComment(event.target.value)}
                />
              </div>

              {uploadError && (
                <p className="text-sm text-red-600">{uploadError}</p>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => {
                    setUploadModalOpen(false);
                    setSelectedDocument(null);
                    setSelectedFile(null);
                    setUploadComment('');
                    setUploadError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Subiendo...' : 'Subir Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewModalOpen && previewDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Documento: {previewDocument.nombre_documento || 'Documento'}
            </h2>

            <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              {previewLoading && (
                <div className="h-[70vh] flex items-center justify-center text-gray-600">
                  Cargando vista previa...
                </div>
              )}

              {!previewLoading && previewError && (
                <div className="h-[70vh] flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <p className="text-red-600">{previewError}</p>
                </div>
              )}

              {!previewLoading && !previewError && previewUrl && (
                <iframe
                  src={previewUrl}
                  title={`Vista previa de ${previewDocument.nombre_documento || 'documento'}`}
                  className="w-full h-[70vh]"
                />
              )}
            </div>

            <div className="flex gap-3 pt-4">
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition text-center"
                >
                  Abrir en pestaña nueva
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  setPreviewModalOpen(false);
                  setPreviewDocument(null);
                  setPreviewUrl(null);
                  setPreviewError(null);
                  setPreviewLoading(false);
                }}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
