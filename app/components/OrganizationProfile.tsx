"use client"

import { useState, useEffect } from 'react';
import { Building2, CreditCard, Share2, CheckCircle, Copy } from 'lucide-react';

interface OrganizationData {
  legalName: string;
  rfc: string;
  bankName: string;
  accountNumber: string;
  clabe: string;
  accountHolder: string;
  address: string;
  phoneNumber: string;
  email: string;
  description: string;
  isComplete: boolean;
}

export function OrganizationProfile() {
  const [organizationId, setOrganizationId] = useState<string>('');
  const [organizationName, setOrganizationName] = useState<string>('');
  const [origin, setOrigin] = useState<string>('');
  const [copied, setCopied] = useState(false);
  
  const [formData, setFormData] = useState<OrganizationData>({
    legalName: '',
    rfc: '',
    bankName: '',
    accountNumber: '',
    clabe: '',
    accountHolder: '',
    address: '',
    phoneNumber: '',
    email: '',
    description: '',
    isComplete: false,
  });

  useEffect(() => {
    setOrganizationId(localStorage.getItem('organization_id') || '');
    setOrganizationName(localStorage.getItem('organization_name') || '');
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (organizationName) {
      setFormData((prev) => ({
        ...prev,
        legalName: prev.legalName || organizationName,
      }));
    }
  }, [organizationName]);

  // Mock: Check if data exists in localStorage
  useEffect(() => {
    const savedData = localStorage.getItem(`org_profile_${organizationId}`);
    if (savedData) {
      setFormData(JSON.parse(savedData));
    }
  }, [organizationId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const isFormComplete = Boolean(
    formData.legalName &&
    formData.rfc &&
    formData.bankName &&
    formData.accountNumber &&
    formData.clabe &&
    formData.accountHolder &&
    formData.address &&
    formData.phoneNumber &&
    formData.email &&
    formData.description
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const completeData = { ...formData, isComplete: isFormComplete };
    localStorage.setItem(`org_profile_${organizationId}`, JSON.stringify(completeData));
    setFormData(completeData);
  };

  const donationLink = origin && organizationId ? `${origin}/donacion/${organizationId}` : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(donationLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Perfil de Organización</h1>
        <p className="text-gray-600">Configure su información bancaria para recibir donaciones</p>
      </div>

      {/* Donation Link Card - Only show if complete */}
      {formData.isComplete && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Share2 className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">¡Tu Link de Donación está Listo!</h2>
              <p className="text-emerald-50 mb-4">
                Comparte este enlace con tus donadores para recibir contribuciones
              </p>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-3">
                <div className="flex items-center gap-3">
                  <code className="flex-1 text-sm break-all">{donationLink}</code>
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2 flex-shrink-0"
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-semibold text-gray-900">Información General</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="sm:col-span-2">
              <label htmlFor="legalName" className="block text-sm font-medium text-gray-700 mb-2">
                Razón Social *
              </label>
              <input
                type="text"
                id="legalName"
                name="legalName"
                required
                value={formData.legalName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="Nombre legal de la organización"
              />
            </div>

            <div>
              <label htmlFor="rfc" className="block text-sm font-medium text-gray-700 mb-2">
                RFC *
              </label>
              <input
                type="text"
                id="rfc"
                name="rfc"
                required
                value={formData.rfc}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="ABC123456XYZ"
              />
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono *
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                required
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="+52 55 1234 5678"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="contacto@organizacion.org"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                Dirección Fiscal *
              </label>
              <input
                type="text"
                id="address"
                name="address"
                required
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="Calle, número, colonia, ciudad"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Descripción de la Organización *
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                placeholder="Breve descripción de la misión y actividades de la organización..."
              />
            </div>
          </div>
        </div>

        {/* Bank Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-semibold text-gray-900">Información Bancaria</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-2">
                Banco *
              </label>
              <select
                id="bankName"
                name="bankName"
                required
                value={formData.bankName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              >
                <option value="">Seleccionar banco...</option>
                <option value="BBVA">BBVA</option>
                <option value="Santander">Santander</option>
                <option value="Banorte">Banorte</option>
                <option value="HSBC">HSBC</option>
                <option value="Scotiabank">Scotiabank</option>
                <option value="Citibanamex">Citibanamex</option>
                <option value="Inbursa">Inbursa</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div>
              <label htmlFor="accountHolder" className="block text-sm font-medium text-gray-700 mb-2">
                Titular de la Cuenta *
              </label>
              <input
                type="text"
                id="accountHolder"
                name="accountHolder"
                required
                value={formData.accountHolder}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="Nombre del titular"
              />
            </div>

            <div>
              <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Número de Cuenta *
              </label>
              <input
                type="text"
                id="accountNumber"
                name="accountNumber"
                required
                value={formData.accountNumber}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="1234567890"
              />
            </div>

            <div>
              <label htmlFor="clabe" className="block text-sm font-medium text-gray-700 mb-2">
                CLABE Interbancaria *
              </label>
              <input
                type="text"
                id="clabe"
                name="clabe"
                required
                maxLength={18}
                value={formData.clabe}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="012345678901234567"
              />
              <p className="text-xs text-gray-500 mt-1">18 dígitos</p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!isFormComplete}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition shadow-lg shadow-emerald-600/30"
          >
            {formData.isComplete ? 'Actualizar Información' : 'Guardar y Generar Link'}
          </button>
        </div>
      </form>

    </div>
  );
}
