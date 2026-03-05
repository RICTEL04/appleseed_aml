"use client"
import { useEffect, useRef, useState } from 'react';
import { FileText, Upload, CheckCircle, Clock, AlertTriangle, Calendar, Eye, Search, SlidersHorizontal } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';

type DocumentStatus = 'approved' | 'pending' | 'overdue' | 'in_review' | 'rejected';

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
  if (normalized === 'rechazado' || normalized === 'rejected') return 'rejected';
  if (normalized === 'vencido' || normalized === 'overdue') return 'overdue';
  if (normalized === 'atrasado' || normalized === 'late') return 'overdue';
  return 'pending';
};

const statusSortPriority: Record<DocumentStatus, number> = {
  pending: 0,
  overdue: 1,
  in_review: 2,
  rejected: 3,
  approved: 4,
};

const statusLabels: Record<DocumentStatus, string> = {
  pending: 'Pendiente',
  overdue: 'Atrasado',
  in_review: 'En revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};

const statusFilterIcons: Record<DocumentStatus, typeof Clock> = {
  pending: Clock,
  overdue: AlertTriangle,
  in_review: Eye,
  approved: CheckCircle,
  rejected: AlertTriangle,
};

const canUploadDocument = (status: DocumentStatus) =>
  status === 'pending' || status === 'overdue' || status === 'rejected';

export function Documents() {
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | DocumentStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [createReviewModalOpen, setCreateReviewModalOpen] = useState(false);
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

  const [newDocumentTitle, setNewDocumentTitle] = useState('');
  const [newDocumentType, setNewDocumentType] = useState('');
  const [newDocumentNote, setNewDocumentNote] = useState('');
  const [newDocumentFile, setNewDocumentFile] = useState<File | null>(null);
  const [creatingReviewDocument, setCreatingReviewDocument] = useState(false);
  const [createReviewError, setCreateReviewError] = useState<string | null>(null);

  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const createFileInputRef = useRef<HTMLInputElement | null>(null);
  const dragDepthRef = useRef(0);
  const createDragDepthRef = useRef(0);
  const [isCreateDragOver, setIsCreateDragOver] = useState(false);

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
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const matchesStatus = selectedStatusFilter === 'all' ? true : status === selectedStatusFilter;

    const searchableText = [
      doc.nombre_documento,
      doc.tipo_documento,
      doc.nota,
      doc.comentario,
      statusLabels[status],
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesSearch = normalizedSearch ? searchableText.includes(normalizedSearch) : true;

    return matchesStatus && matchesSearch;
  }).sort((firstDoc, secondDoc) => {
    const firstStatus = normalizeStatus(firstDoc.estado);
    const secondStatus = normalizeStatus(secondDoc.estado);

    const priorityDiff = statusSortPriority[firstStatus] - statusSortPriority[secondStatus];
    if (priorityDiff !== 0) return priorityDiff;

    const firstDate = firstDoc.vencimiento ? new Date(firstDoc.vencimiento).getTime() : Number.MAX_SAFE_INTEGER;
    const secondDate = secondDoc.vencimiento ? new Date(secondDoc.vencimiento).getTime() : Number.MAX_SAFE_INTEGER;

    return firstDate - secondDate;
  });

  const getStatusBadge = (status: string) => {
    const configs = {
      approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Aprobado', icon: CheckCircle },
      pending: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Pendiente', icon: Clock },
      overdue: { bg: 'bg-red-100', text: 'text-red-700', label: 'Atrasado', icon: AlertTriangle },
      in_review: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En Revisión', icon: Eye },
      rejected: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Rechazado', icon: AlertTriangle },
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

  const getHoursUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    return diffHours;
  };

  const handleUploadClick = (doc: Document) => {
    if (!canUploadDocument(normalizeStatus(doc.estado))) return;

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

  const resetCreateReviewModal = () => {
    setCreateReviewModalOpen(false);
    setNewDocumentTitle('');
    setNewDocumentType('');
    setNewDocumentNote('');
    setNewDocumentFile(null);
    setCreateReviewError(null);
    setIsCreateDragOver(false);
  };

  const handleCreateReviewFile = (file: File | null) => {
    if (!file) return;
    setNewDocumentFile(file);
    setCreateReviewError(null);
  };

  const handleCreateReviewDocument = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organizationId) {
      setCreateReviewError('No se encontró la organización activa.');
      return;
    }

    if (!newDocumentTitle.trim() || !newDocumentType.trim() || !newDocumentNote.trim()) {
      setCreateReviewError('Título, tipo y nota son obligatorios.');
      return;
    }

    if (!newDocumentFile) {
      setCreateReviewError('Selecciona un archivo para enviar a revisión.');
      return;
    }

    const supabase = getSupabaseClient();
    const documentUuid = crypto.randomUUID();

    setCreatingReviewDocument(true);
    setCreateReviewError(null);

    const { error: uploadStorageError } = await supabase
      .storage
      .from('documentos')
      .upload(documentUuid, newDocumentFile, {
        upsert: false,
        contentType: newDocumentFile.type || undefined,
      });

    if (uploadStorageError) {
      setCreateReviewError(`No fue posible subir el archivo al bucket: ${uploadStorageError.message}`);
      setCreatingReviewDocument(false);
      return;
    }

    const insertPayload = {
      nombre_documento: newDocumentTitle.trim(),
      tipo_documento: newDocumentType.trim(),
      nota: newDocumentNote.trim(),
      vencimiento: null,
      comentario: null,
      estado: 'en revision',
      id_documento: documentUuid,
      id_osc: organizationId,
      documento_enviado: new Date().toISOString(),
    };

    const { data: insertedDocument, error: insertError } = await supabase
      .from('documentos')
      .insert(insertPayload)
      .select(DOCUMENT_COLUMNS)
      .single();

    if (insertError) {
      setCreateReviewError(`El archivo se subió, pero no se pudo registrar el documento: ${insertError.message}`);
      setCreatingReviewDocument(false);
      return;
    }

    setDocuments((prev) => [insertedDocument as Document, ...prev]);
    setCreatingReviewDocument(false);
    resetCreateReviewModal();
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

    setDocuments((prev) => prev.map((doc) => (doc.id === selectedDocument.id
      ? ({ ...(updatedDocument as Document), estado: 'en revision' })
      : doc)));
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
  const inReviewCount = documents.filter((d) => normalizeStatus(d.estado) === 'in_review').length;
  const rejectedCount = documents.filter((d) => normalizeStatus(d.estado) === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <div className="px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
            <div className="xl:pr-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Documentos</h1>
              <p className="text-sm sm:text-base text-gray-600">Gestiona y sube los documentos requeridos</p>
            </div>

            <button
              onClick={() => {
                setCreateReviewError(null);
                setCreateReviewModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
            >
              <Upload className="w-4 h-4" />
              Enviar documento a revisión
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Search & Filters */}
        <aside className="xl:col-span-4 2xl:col-span-3 xl:sticky xl:top-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-gray-800 mb-3">
              <SlidersHorizontal className="w-4 h-4" />
              <h2 className="text-sm font-semibold">Búsqueda y filtros</h2>
            </div>

            <div className="relative mb-3">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por título, tipo, nota o estado"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedStatusFilter('all')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  selectedStatusFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>

              {(['pending', 'overdue', 'in_review', 'approved', 'rejected'] as DocumentStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatusFilter(status)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                    selectedStatusFilter === status
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {(() => {
                      const Icon = statusFilterIcons[status];
                      return <Icon className="w-4 h-4" />;
                    })()}
                    {statusLabels[status]}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-gray-200 px-3 py-2 bg-gray-50">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-base font-bold text-gray-900">{documents.length}</p>
              </div>
              <div className="rounded-lg border border-gray-200 px-3 py-2 bg-gray-50">
                <p className="text-xs text-gray-500">Pendientes/Atrasados</p>
                <p className="text-base font-bold text-gray-900">{pendingCount}</p>
              </div>
              <div className="rounded-lg border border-gray-200 px-3 py-2 bg-gray-50">
                <p className="text-xs text-gray-500">En revisión</p>
                <p className="text-base font-bold text-gray-900">{inReviewCount}</p>
              </div>
              <div className="rounded-lg border border-gray-200 px-3 py-2 bg-gray-50">
                <p className="text-xs text-gray-500">Aprobados</p>
                <p className="text-base font-bold text-gray-900">{approvedCount}</p>
              </div>
              <div className="rounded-lg border border-gray-200 px-3 py-2 bg-gray-50 col-span-2">
                <p className="text-xs text-gray-500">Rechazados</p>
                <p className="text-base font-bold text-gray-900">{rejectedCount}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Documents List */}
        <section className="xl:col-span-8 2xl:col-span-9 space-y-4 xl:h-[calc(100vh-11rem)] xl:overflow-y-auto xl:pr-2">
        {loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-gray-600 text-sm">
            Cargando documentos...
          </div>
        )}

        {!loading && loadingError && (
          <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-6 text-red-700 text-sm">
            {loadingError}
          </div>
        )}

        {!loading && !loadingError && filteredDocuments.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-gray-600 text-sm">
            No hay documentos para mostrar.
          </div>
        )}

        {filteredDocuments.map((doc) => {
          const status = normalizeStatus(doc.estado);
          const hasDueDate = Boolean(doc.vencimiento);
          const daysUntilDue = hasDueDate ? getDaysUntilDue(doc.vencimiento as string) : null;
          const hoursUntilDue = hasDueDate ? getHoursUntilDue(doc.vencimiento as string) : null;
          const showHoursUntilDue = hoursUntilDue !== null && hoursUntilDue > 0 && hoursUntilDue < 24;
          const isUrgent = daysUntilDue !== null && daysUntilDue <= 5 && (status === 'pending' || status === 'overdue');

          return (
            <div
              key={doc.id}
              className={`bg-white rounded-2xl border-2 p-5 sm:p-6 transition hover:shadow-md ${
                isUrgent ? 'border-red-200 bg-red-50/60' : 'border-gray-200 shadow-sm'
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
                    <h3 className="font-semibold text-gray-900 mb-1 text-base">{doc.nombre_documento || 'Documento sin nombre'}</h3>
                    <p className="text-sm text-gray-600 mb-3">{doc.tipo_documento || 'Sin tipo'}</p>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      {doc.vencimiento && (
                        <div className="inline-flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-md">
                          <Calendar className="w-4 h-4" />
                          <span>Vence: {new Date(doc.vencimiento).toLocaleDateString('es-MX')}</span>
                        </div>
                      )}
                      {doc.documento_enviado && (
                        <div className="inline-flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-md">
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
                        <span>
                          {daysUntilDue < 0
                            ? 'Vencido'
                            : showHoursUntilDue && hoursUntilDue !== null
                              ? `${hoursUntilDue} hora${hoursUntilDue === 1 ? '' : 's'} restantes`
                              : `${daysUntilDue} días restantes`}
                        </span>
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
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition"
                      >
                        <Eye className="w-4 h-4" />
                        Ver documento
                      </button>
                    )}
                    {canUploadDocument(status) && (
                      <button
                        onClick={() => handleUploadClick(doc)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
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
        </section>
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Subir Documento: {selectedDocument.nombre_documento || 'Documento'}
            </h2>

            <p className="text-sm text-gray-600 mb-4">Adjunta el archivo y agrega un comentario opcional.</p>

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
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Subiendo...' : 'Subir Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {createReviewModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Enviar documento a revisión
            </h2>

            <p className="text-sm text-gray-600 mb-4">Completa la información y adjunta el archivo para enviarlo a revisión.</p>

            <form onSubmit={handleCreateReviewDocument} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título del documento
                </label>
                <input
                  type="text"
                  value={newDocumentTitle}
                  onChange={(event) => setNewDocumentTitle(event.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  placeholder="Ej. Reporte financiero mensual"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de documento
                </label>
                <input
                  type="text"
                  value={newDocumentType}
                  onChange={(event) => setNewDocumentType(event.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  placeholder="Ej. Estado financiero"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nota
                </label>
                <textarea
                  rows={3}
                  value={newDocumentNote}
                  onChange={(event) => setNewDocumentNote(event.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                  placeholder="Descripción breve del documento"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Archivo
                </label>
                <div
                  onClick={() => createFileInputRef.current?.click()}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    createDragDepthRef.current += 1;
                    setIsCreateDragOver(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    event.dataTransfer.dropEffect = 'copy';
                    setIsCreateDragOver(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    createDragDepthRef.current = Math.max(0, createDragDepthRef.current - 1);
                    if (createDragDepthRef.current === 0) {
                      setIsCreateDragOver(false);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    createDragDepthRef.current = 0;
                    setIsCreateDragOver(false);
                    const droppedFile = event.dataTransfer.files?.[0] ?? null;
                    handleCreateReviewFile(droppedFile);
                  }}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer ${
                    isCreateDragOver
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
                  {newDocumentFile && (
                    <p className="text-xs text-emerald-700 mt-2 font-medium">
                      Archivo seleccionado: {newDocumentFile.name}
                    </p>
                  )}
                  <input
                    ref={createFileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      handleCreateReviewFile(file);
                    }}
                  />
                </div>
              </div>

              {createReviewError && (
                <p className="text-sm text-red-600">{createReviewError}</p>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  disabled={creatingReviewDocument}
                  onClick={resetCreateReviewModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingReviewDocument}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {creatingReviewDocument ? 'Enviando...' : 'Enviar documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewModalOpen && previewDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full p-6">
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
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition text-center"
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
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition"
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
