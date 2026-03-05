'use client'

import { useEffect, useState } from 'react';
import { X, Building2, Phone, Mail, MapPin, Shield, Calendar, Tag, AlertTriangle, CheckCircle, Clock, Send, ChevronDown } from 'lucide-react';
import { useAnnouncement } from '@/app/hooks/useAnnouncement';
import { AnnouncementModel, IAnnouncement } from '@/lib/models/announcement.model';
import { WorkerModel, IWorker } from '@/lib/models/worker.model';
import { useWorker } from '@/app/hooks/useWorker';

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
  workerName?: string;
}

interface OrganizationModalProps {
  organization: OrganizationDetail | null;
  onClose: () => void;
}

const CATEGORIAS = ['general', 'documento'];
const URGENCIAS  = ['baja', 'media', 'alta'];

const EMPTY_FORM = {
  titulo: '',
  mensaje: '',
  categoria: 'general',
  urgencia: 'media',
};

export function OrganizationModal({ organization, onClose }: OrganizationModalProps) {
  const { createAnnouncement, loading: sending } = useAnnouncement();
  const { worker } = useWorker();
  const [form, setForm]           = useState(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
      async function fetchWorker() {
          try {
              console.log('[Organizations] fetching worker...');  
              const workerData = await worker;
              console.log('[Organizations] worker =>', workerData);
          }
          catch (err) {
              console.error('[Organizations] worker fetch error:', err);
          }
      }
      fetchWorker();
  }, [worker]);

  // Escape key + body scroll lock
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

  const handleField = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (formError) setFormError(null);
  };

  const handleSend = async () => {
    if (!form.titulo.trim()) { setFormError('El título es requerido'); return; }
    if (!form.mensaje.trim()) { setFormError('El mensaje es requerido'); return; }

    const payload = new AnnouncementModel({
                             
      titulo:    form.titulo.trim(),
      mensaje:   form.mensaje.trim(),
      remitente: worker?.nombre || 'Desconocido',
      id_osc:    organization.id,
      estado:    'noleido',
      fecha:     new Date().toISOString(),
      categoria: form.categoria,
      urgencia:  form.urgencia,
    } as IAnnouncement);

    const result = await createAnnouncement(payload);
    if (result) {
      setSubmitted(true);
      setForm(EMPTY_FORM);
    } else {
      setFormError('No se pudo enviar el aviso. Intenta de nuevo.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-6 pt-6 pb-10 flex-shrink-0">
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition">
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

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <div className="px-6 pb-6 space-y-5 overflow-y-auto flex-1">

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

          {/* ── Announcement form ──────────────────────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Send className="w-3.5 h-3.5" /> Enviar Aviso
            </h3>

            {submitted ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="font-semibold text-gray-900 mb-1">¡Aviso enviado!</p>
                <p className="text-sm text-gray-500 mb-4">La organización recibirá el comunicado.</p>
                <button onClick={() => setSubmitted(false)}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                  Enviar otro aviso
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Título */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Título *</label>
                  <input
                    type="text"
                    value={form.titulo}
                    onChange={e => handleField('titulo', e.target.value)}
                    placeholder="Asunto del aviso"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Mensaje */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mensaje *</label>
                  <textarea
                    rows={3}
                    value={form.mensaje}
                    onChange={e => handleField('mensaje', e.target.value)}
                    placeholder="Contenido del comunicado..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                  />
                </div>

                {/* Categoría + Urgencia side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
                    <div className="relative">
                      <select
                        value={form.categoria}
                        onChange={e => handleField('categoria', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none appearance-none bg-white pr-8"
                      >
                        {CATEGORIAS.map(c => (
                          <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Urgencia</label>
                    <div className="relative">
                      <select
                        value={form.urgencia}
                        onChange={e => handleField('urgencia', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none appearance-none bg-white pr-8"
                      >
                        {URGENCIAS.map(u => (
                          <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Remitente (read-only) */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Remitente</label>
                  <input
                    type="text"
                    readOnly
                    value={worker?.nombre}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 outline-none"
                  />
                </div>

                {formError && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />{formError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Footer ──────────────────────────────────────────────────────── */}
          {!submitted && (
            <div className="pt-2 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
                Cerrar
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center gap-2"
              >
                {sending
                  ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Enviando...</>
                  : <><Send className="w-3.5 h-3.5" />Enviar aviso</>
                }
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm text-gray-800 font-medium truncate">{value || '—'}</p>
      </div>
    </div>
  );
}