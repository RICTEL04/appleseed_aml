"use client"
import { useState } from 'react';
import { FileText, Upload, CheckCircle, Clock, AlertTriangle, Download, Calendar, Eye } from 'lucide-react';

interface Document {
  id: number;
  name: string;
  type: string;
  status: 'approved' | 'pending' | 'overdue' | 'in_review';
  dueDate: string;
  uploadDate?: string;
  size?: string;
  notes?: string;
}

const mockDocuments: Document[] = [
  {
    id: 1,
    name: 'Reporte Trimestral Q1 2026',
    type: 'Reporte Financiero',
    status: 'overdue',
    dueDate: '2026-02-28',
    notes: 'Debe incluir todas las transacciones del trimestre',
  },
  {
    id: 2,
    name: 'Estados Financieros Enero',
    type: 'Estado Financiero',
    status: 'pending',
    dueDate: '2026-02-25',
    notes: 'Balance general y estado de resultados',
  },
  {
    id: 3,
    name: 'Certificado de Donaciones',
    type: 'Certificado',
    status: 'pending',
    dueDate: '2026-03-05',
  },
  {
    id: 4,
    name: 'Reporte Anual 2025',
    type: 'Reporte Anual',
    status: 'approved',
    dueDate: '2026-01-31',
    uploadDate: '2026-01-28',
    size: '2.4 MB',
  },
  {
    id: 5,
    name: 'Estados Financieros Diciembre',
    type: 'Estado Financiero',
    status: 'approved',
    dueDate: '2026-01-15',
    uploadDate: '2026-01-14',
    size: '1.8 MB',
  },
  {
    id: 6,
    name: 'Acta Constitutiva Actualizada',
    type: 'Documento Legal',
    status: 'in_review',
    dueDate: '2026-02-20',
    uploadDate: '2026-02-18',
    size: '3.2 MB',
    notes: 'En proceso de verificación legal',
  },
];

export function Documents() {
  const [selectedTab, setSelectedTab] = useState<'all' | 'pending' | 'approved'>('all');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const filteredDocuments = mockDocuments.filter((doc) => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'pending') return doc.status === 'pending' || doc.status === 'overdue' || doc.status === 'in_review';
    if (selectedTab === 'approved') return doc.status === 'approved';
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
    const today = new Date('2026-02-20'); // Mock current date
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleUploadClick = (doc: Document) => {
    setSelectedDocument(doc);
    setUploadModalOpen(true);
  };

  const handleFileUpload = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock upload
    setUploadModalOpen(false);
    setSelectedDocument(null);
  };

  const pendingCount = mockDocuments.filter(d => d.status === 'pending' || d.status === 'overdue').length;
  const approvedCount = mockDocuments.filter(d => d.status === 'approved').length;

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
              <p className="text-2xl font-bold text-gray-900">{mockDocuments.length}</p>
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
        {filteredDocuments.map((doc) => {
          const daysUntilDue = getDaysUntilDue(doc.dueDate);
          const isUrgent = daysUntilDue <= 5 && (doc.status === 'pending' || doc.status === 'overdue');

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
                    doc.status === 'approved' ? 'bg-emerald-100' :
                    doc.status === 'overdue' ? 'bg-red-100' :
                    doc.status === 'in_review' ? 'bg-blue-100' :
                    'bg-orange-100'
                  }`}>
                    <FileText className={`w-6 h-6 ${
                      doc.status === 'approved' ? 'text-emerald-600' :
                      doc.status === 'overdue' ? 'text-red-600' :
                      doc.status === 'in_review' ? 'text-blue-600' :
                      'text-orange-600'
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1">{doc.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{doc.type}</p>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>Vence: {new Date(doc.dueDate).toLocaleDateString('es-MX')}</span>
                      </div>
                      {doc.uploadDate && (
                        <div className="flex items-center gap-1.5">
                          <Upload className="w-4 h-4" />
                          <span>Subido: {new Date(doc.uploadDate).toLocaleDateString('es-MX')}</span>
                        </div>
                      )}
                      {doc.size && (
                        <span className="text-gray-500">{doc.size}</span>
                      )}
                    </div>

                    {doc.notes && (
                      <p className="text-sm text-gray-600 mt-3 p-3 bg-gray-50 rounded-lg">
                        <strong>Nota:</strong> {doc.notes}
                      </p>
                    )}

                    {isUrgent && (
                      <div className="flex items-center gap-2 mt-3 text-sm font-medium text-red-600">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{daysUntilDue < 0 ? 'Vencido' : `${daysUntilDue} días restantes`}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:items-end">
                  {getStatusBadge(doc.status)}

                  <div className="flex gap-2">
                    {doc.status === 'approved' && (
                      <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition">
                        <Download className="w-4 h-4" />
                        Descargar
                      </button>
                    )}
                    {(doc.status === 'pending' || doc.status === 'overdue') && (
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
              Subir Documento: {selectedDocument.name}
            </h2>

            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar Archivo
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-emerald-500 transition cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-1">
                    Haz clic para seleccionar o arrastra el archivo aquí
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, DOC, DOCX hasta 10MB
                  </p>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
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
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setUploadModalOpen(false);
                    setSelectedDocument(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition"
                >
                  Subir Documento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
