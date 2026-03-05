// components/OrganizationModal.tsx
'use client'

import { useEffect } from 'react';
import { X, Building2, Phone, Mail, MapPin, Shield, Calendar, Tag, AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react';
import { DocumentViewer } from './Documentviewer';

interface OrganizationDetail {
  id: string;
  name: string;
  type: string;
  contact: string;
  email: string;
  location: string;
  status: 'Verificada' | 'En revisión' | 'Pendiente';
  risk: 'Bajo' | 'Medio' | 'Alto';
  registrationDate: string;
}

interface OrganizationModalProps {
  organization: OrganizationDetail | null;
  onClose: () => void;
}

export function OrganizationModal({ organization, onClose }: OrganizationModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!organization) return null;

  const statusConfig = {
    'Verificada':  { icon: <CheckCircle className="w-4 h-4" />, classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    'En revisión': { icon: <Clock className="w-4 h-4" />,        classes: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    'Pendiente':   { icon: <AlertTriangle className="w-4 h-4" />, classes: 'bg-gray-100 text-gray-600 border-gray-200' },
  };
  const riskConfig = {
    'Bajo':  { classes: 'bg-green-100 text-green-700',   bar: 'w-1/3 bg-green-500' },
    'Medio': { classes: 'bg-orange-100 text-orange-700', bar: 'w-2/3 bg-orange-500' },
    'Alto':  { classes: 'bg-red-100 text-red-700',       bar: 'w-full bg-red-500' },
  };

  const status = statusConfig[organization.status] ?? statusConfig['Pendiente'];
  const risk   = riskConfig[organization.risk]     ?? riskConfig['Bajo'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header - Full width */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-6 pt-6 pb-10 flex-shrink-0">
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition z-10">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white leading-tight">{organization.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Tag className="w-3.5 h-3.5 text-emerald-200" />
                <span className="text-sm text-emerald-100">{organization.type || 'Sin tipo'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status badge */}
        <div className="relative px-6 -mt-5 mb-2 flex items-center gap-3 flex-shrink-0">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm bg-white ${status.classes}`}>
            {status.icon}{organization.status}
          </span>
        </div>

        {/* Split Content - Info left, Documents right */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left Column - Organization Info */}
          <div className="w-3/10 overflow-y-auto px-6 pb-6 space-y-5 border-r border-gray-200">
            {/* Contact info */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contacto</h3>
              <InfoRow icon={<MapPin className="w-4 h-4 text-emerald-500" />} label="Dirección" value={organization.location} />
              <InfoRow icon={<Phone className="w-4 h-4 text-emerald-500" />} label="Teléfono"   value={organization.contact} />
              <InfoRow icon={<Mail  className="w-4 h-4 text-emerald-500" />} label="Correo"     value={organization.email} />
            </div>

            {/* Risk + Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Nivel de Riesgo</h3>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${risk.classes}`}>
                  <Shield className="w-3.5 h-3.5" />{organization.risk}
                </span>
                <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${risk.bar}`} />
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Fecha de Registro</h3>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  {new Date(organization.registrationDate).toLocaleDateString('es-MX', {
                    day: '2-digit', month: 'long', year: 'numeric'
                  })}
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Additional info could go here */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Información adicional</h3>
              <p className="text-sm text-gray-600">
                Aquí puedes agregar más detalles sobre la organización, historial de verificaciones, 
                o cualquier otra información relevante para el proceso de revisión.
              </p>
            </div>
          </div>

          {/* Right Column - Document Viewer (Full height, scrollable if needed) */}
          <div className="w-7/10 overflow-y-auto px-6 pb-6">
            <div className="sticky top-0 bg-white pt-2 pb-3 z-10">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Documentos en Revisión
              </h3>
            </div>
            <DocumentViewer orgId={organization.id} />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-3 flex justify-end bg-gray-50">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm text-gray-800 font-medium break-words">{value || '—'}</p>
      </div>
    </div>
  );
}