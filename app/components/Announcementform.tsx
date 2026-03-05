// components/AnnouncementForm.tsx
'use client'

import { useState } from 'react';
import { Send, AlertTriangle, CheckCircle, ChevronDown, FileText } from 'lucide-react';
import { AnnouncementModel, IAnnouncement } from '@/lib/models/announcement.model';
import { IDocument } from '@/lib/models/document.model';
import { useAnnouncement } from '@/app/hooks/useAnnouncement';
import { useDocument } from '@/app/hooks/useDocument';

export type CategoriaOption = 'general' | 'documento';
export type UrgenciaOption  = 'baja' | 'media' | 'alta';

const URGENCIAS: UrgenciaOption[] = ['baja', 'media', 'alta'];

const CATEGORIA_LABELS: Record<CategoriaOption, string> = {
  general:   'General',
  documento: 'Documento',
};

interface AnnouncementFormProps {
  targetOrgIds: string[];
  allowedCategorias: CategoriaOption[];
  senderName: string;
  onSuccess?: () => void;
}

const EMPTY_FORM = {
  titulo:    '',
  mensaje:   '',
  categoria: '' as CategoriaOption | '',
  urgencia:  'media' as UrgenciaOption,
};

const EMPTY_DOC = {
  nombre_documento: '',
  tipo_documento:   '',
  vencimiento:      '',
};

export function AnnouncementForm({
  targetOrgIds,
  allowedCategorias,
  senderName,
  onSuccess,
}: AnnouncementFormProps) {
  const { createAnnouncement, createManyAnnouncements, loading: sendingAnnouncement } = useAnnouncement();
  const { createRegisterDocument, loading: sendingDocument } = useDocument();

  const sending = sendingAnnouncement || sendingDocument;

  const [form, setForm]       = useState({ ...EMPTY_FORM, categoria: allowedCategorias[0] ?? '' as CategoriaOption | '' });
  const [doc, setDoc]         = useState(EMPTY_DOC);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isDocumento = form.categoria === 'documento';

  const handleField = <K extends keyof typeof EMPTY_FORM>(field: K, value: typeof EMPTY_FORM[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (formError) setFormError(null);
  };

  const handleDoc = (field: keyof typeof EMPTY_DOC, value: string) => {
    setDoc(prev => ({ ...prev, [field]: value }));
    if (formError) setFormError(null);
  };

  const handleSend = async () => {
    if (!form.titulo.trim())  { setFormError('El título es requerido');   return; }
    if (!form.mensaje.trim()) { setFormError('El mensaje es requerido');  return; }
    if (!form.categoria)      { setFormError('Selecciona una categoría'); return; }

    if (isDocumento) {
      if (!doc.nombre_documento.trim()) { setFormError('El nombre del documento es requerido'); return; }
      if (!doc.tipo_documento.trim())   { setFormError('El tipo de documento es requerido');    return; }
      if (!doc.vencimiento)             { setFormError('La fecha de vencimiento es requerida'); return; }
    }

    const base = {
      titulo:    form.titulo.trim(),
      mensaje:   form.mensaje.trim(),
      remitente: senderName,
      estado:    'noleido',
      fecha:     new Date().toISOString(),
      categoria: form.categoria,
      urgencia:  form.urgencia,
    };

    try {
      // 1. Send announcement(s)
      if (targetOrgIds.length === 1) {
        const result = await createAnnouncement(
          new AnnouncementModel({ ...base, id_osc: targetOrgIds[0] } as IAnnouncement)
        );
        if (!result) { setFormError('No se pudo enviar el aviso. Intenta de nuevo.'); return; }
      } else {
        const payloads = targetOrgIds.map(id =>
          new AnnouncementModel({ ...base, id_osc: id } as IAnnouncement)
        );
        const results = await createManyAnnouncements(payloads);
        if (!results.length) { setFormError('No se pudo enviar el aviso. Intenta de nuevo.'); return; }
      }

      // 2. If documento, create one document record per org
      if (isDocumento) {
        await Promise.all(
          targetOrgIds.map(orgId =>
            createRegisterDocument({
              id:               undefined,
              nombre_documento: doc.nombre_documento.trim(),
              tipo_documento:   doc.tipo_documento.trim(),
              estado:           'pendiente',
              vencimiento:      doc.vencimiento,
              id_osc:           orgId,
              nota:             undefined,
              comentario:       undefined,
              documento_enviado: undefined,
              id_trabajador:    undefined,
            } as IDocument)
          )
        );
      }

      setSubmitted(true);
      setForm({ ...EMPTY_FORM, categoria: allowedCategorias[0] ?? '' });
      setDoc(EMPTY_DOC);
      onSuccess?.();

    } catch {
      setFormError('Ocurrió un error al enviar. Intenta de nuevo.');
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
          <CheckCircle className="w-6 h-6 text-emerald-600" />
        </div>
        <p className="font-semibold text-gray-900 mb-1">
          {targetOrgIds.length === 1 ? '¡Aviso enviado!' : `¡${targetOrgIds.length} avisos enviados!`}
        </p>
        <p className="text-sm text-gray-500 mb-4">
          {targetOrgIds.length === 1
            ? 'La organización recibirá el comunicado.'
            : 'Todas las organizaciones recibirán el comunicado.'}
        </p>
        <button onClick={() => setSubmitted(false)}
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
          Enviar otro aviso
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* Título */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Título *</label>
        <input type="text" value={form.titulo}
          onChange={e => handleField('titulo', e.target.value)}
          placeholder="Asunto del aviso"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Mensaje */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Mensaje *</label>
        <textarea rows={3} value={form.mensaje}
          onChange={e => handleField('mensaje', e.target.value)}
          placeholder="Contenido del comunicado..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
        />
      </div>

      {/* Categoría + Urgencia */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
          <div className="relative">
            <select value={form.categoria}
              onChange={e => handleField('categoria', e.target.value as CategoriaOption)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none appearance-none bg-white pr-8">
              {allowedCategorias.map(c => (
                <option key={c} value={c}>{CATEGORIA_LABELS[c]}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Urgencia</label>
          <div className="relative">
            <select value={form.urgencia}
              onChange={e => handleField('urgencia', e.target.value as UrgenciaOption)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none appearance-none bg-white pr-8">
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
        <input type="text" readOnly value={senderName || '—'}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 outline-none"
        />
      </div>

      {/* ── Document fields — only when categoria === 'documento' ── */}
      {isDocumento && (
        <div className="pt-1 space-y-3 border-t border-dashed border-emerald-200">
          <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5 pt-2">
            <FileText className="w-3.5 h-3.5" /> Datos del Documento
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del documento *</label>
            <input type="text" value={doc.nombre_documento}
              onChange={e => handleDoc('nombre_documento', e.target.value)}
              placeholder="Ej. Acta constitutiva"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de documento *</label>
            <input type="text" value={doc.tipo_documento}
              onChange={e => handleDoc('tipo_documento', e.target.value)}
              placeholder="Ej. Legal, Fiscal, Contable..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de vencimiento *</label>
            <input type="date" value={doc.vencimiento}
              onChange={e => handleDoc('vencimiento', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Estado is always 'pendiente' — show it read-only for transparency */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
            <input type="text" readOnly value="Pendiente"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 outline-none"
            />
          </div>
        </div>
      )}

      {formError && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" />{formError}
        </p>
      )}

      {/* Submit */}
      <div className="pt-1 flex justify-end">
        <button onClick={handleSend} disabled={sending}
          className="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center gap-2">
          {sending
            ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Enviando...</>
            : <><Send className="w-3.5 h-3.5" />{targetOrgIds.length > 1 ? `Enviar a ${targetOrgIds.length} orgs` : 'Enviar aviso'}</>
          }
        </button>
      </div>
    </div>
  );
}