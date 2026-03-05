// components/BulkAnnouncementModal.tsx
'use client'

import { useEffect } from 'react';
import { X, Send, Users } from 'lucide-react';
import { AnnouncementForm } from './Announcementform';

interface BulkAnnouncementModalProps {
  /** IDs of all organizations to send to */
  orgIds: string[];
  senderName: string;
  onClose: () => void;
}

export function BulkAnnouncementModal({ orgIds, senderName, onClose }: BulkAnnouncementModalProps) {
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
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Aviso General</h2>
              <p className="text-sm text-emerald-100">
                Se enviará a <span className="font-semibold">{orgIds.length}</span> organizaciones
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-xs text-emerald-700 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 flex-shrink-0" />
              Este aviso llegará a todas las organizaciones registradas.
            </p>
          </div>

          <AnnouncementForm
            targetOrgIds={orgIds}
            allowedCategorias={['general']}
            senderName={senderName}
            onSuccess={onClose}
          />
        </div>

        {/* Footer close */}
        <div className="px-6 pb-5 flex-shrink-0 border-t border-gray-100 pt-4 flex justify-start">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}