// components/SingleAnnouncementModal.tsx
// Este componente es un modal para enviar un aviso a una organización específica,
// muestra el nombre de la organización a la que se enviará el aviso, incluye un formulario 
// para ingresar el título, mensaje, categoría y urgencia del aviso,
// y maneja el envío del aviso a través del componente AnnouncementForm, además de permitir 
// cerrar el modal al hacer clic fuera o presionar la tecla Escape.
'use client'

import { useEffect } from 'react';
import { X, Send, Building2 } from 'lucide-react';
import { AnnouncementForm } from './Announcementform';
import { useWorker } from '@/app/hooks/useWorker';

interface SingleAnnouncementModalProps {
  orgId: string;
  orgName: string;
  onClose: () => void;
}

export function SingleAnnouncementModal({ orgId, orgName, onClose }: SingleAnnouncementModalProps) {
  const { worker } = useWorker();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-5 flex-shrink-0">
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Enviar Aviso</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-200" />
                <p className="text-sm text-emerald-100 truncate max-w-[220px]">{orgName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          <AnnouncementForm
            targetOrgIds={[orgId]}
            allowedCategorias={['general', 'documento']}
            senderName={worker?.nombre ?? ''}
            onSuccess={onClose}
          />
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex-shrink-0 border-t border-gray-100 pt-4">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}