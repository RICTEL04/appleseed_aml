"use client"

import { useState, useEffect } from 'react';
import { Building2, CreditCard, Share2, CheckCircle, Copy, Eye, X, ArrowRight, ArrowLeft, Heart, AlertCircle, Shield } from 'lucide-react';

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

interface DonorData {
  firstName: string;
  lastName: string;
  secondLastName: string;
  rfc: string;
  email: string;
  phone: string;
  address: string;
}

export function OrganizationProfile() {
  const organizationId = localStorage.getItem('organization_id');
  const organizationName = localStorage.getItem('organization_name');
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const [formData, setFormData] = useState<OrganizationData>({
    legalName: organizationName || '',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const completeData = { ...formData, isComplete: true };
    localStorage.setItem(`org_profile_${organizationId}`, JSON.stringify(completeData));
    setFormData(completeData);
  };

  const donationLink = `${window.location.origin}/donate/${organizationId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(donationLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isFormComplete = formData.legalName && formData.rfc && formData.bankName && 
                        formData.accountNumber && formData.clabe && formData.accountHolder;

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

              <button
                onClick={() => setShowPreview(true)}
                className="inline-flex items-center gap-2 text-sm text-white hover:text-emerald-100 transition bg-white/10 px-4 py-2 rounded-lg"
              >
                <Eye className="w-4 h-4" />
                Ver vista previa de la página
              </button>
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

      {/* Preview Modal */}
      {showPreview && (
        <DonationPreviewModal 
          organizationData={formData}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

// Preview Modal Component
function DonationPreviewModal({ organizationData, onClose }: { organizationData: OrganizationData; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [donationAmount, setDonationAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const [donorData, setDonorData] = useState<DonorData>({
    firstName: '',
    lastName: '',
    secondLastName: '',
    rfc: '',
    email: '',
    phone: '',
    address: '',
  });

  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    cardHolder: '',
    expiryDate: '',
    cvv: '',
  });

  const handleDonorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDonorData({
      ...donorData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    if (e.target.name === 'cardNumber') {
      value = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
    }
    
    if (e.target.name === 'expiryDate') {
      value = value.replace(/\D/g, '').replace(/(\d{2})(\d{0,2})/, '$1/$2').substr(0, 5);
    }

    setPaymentData({
      ...paymentData,
      [e.target.name]: value,
    });
  };

  const validateDonor = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setStep(2);
      setLoading(false);
    }, 1500);
  };

  const proceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setStep(3);
      setLoading(false);
    }, 1000);
  };

  const processPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setPaymentCompleted(true);
      setLoading(false);
    }, 2000);
  };

  const selectedAmount = customAmount || donationAmount;
  const predefinedAmounts = ['100', '500', '1000', '2000', '5000'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white hover:bg-gray-100 rounded-full shadow-lg transition"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-full mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Donación a {organizationData.legalName}
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              {organizationData.description}
            </p>
          </div>

          {!paymentCompleted ? (
            <>
              {/* Progress Steps */}
              <div className="mb-8">
                <div className="flex items-center justify-center gap-4">
                  {[1, 2, 3].map((stepNum) => (
                    <div key={stepNum} className="flex items-center">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition ${
                        step >= stepNum
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {step > stepNum ? <CheckCircle className="w-6 h-6" /> : stepNum}
                      </div>
                      {stepNum < 3 && (
                        <div className={`w-12 sm:w-24 h-1 mx-2 ${
                          step > stepNum ? 'bg-emerald-600' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-center gap-8 sm:gap-24 mt-3">
                  <span className="text-xs sm:text-sm text-gray-600 font-medium">Validación</span>
                  <span className="text-xs sm:text-sm text-gray-600 font-medium">Monto</span>
                  <span className="text-xs sm:text-sm text-gray-600 font-medium">Pago</span>
                </div>
              </div>

              {/* Step 1: Donor Validation */}
              {step === 1 && (
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Validación de Donante</h2>
                  <form onSubmit={validateDonor} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input
                        type="text"
                        name="firstName"
                        required
                        value={donorData.firstName}
                        onChange={handleDonorChange}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        placeholder="Nombre(s) *"
                      />
                      <input
                        type="text"
                        name="lastName"
                        required
                        value={donorData.lastName}
                        onChange={handleDonorChange}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        placeholder="Apellido Paterno *"
                      />
                      <input
                        type="text"
                        name="secondLastName"
                        required
                        value={donorData.secondLastName}
                        onChange={handleDonorChange}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        placeholder="Apellido Materno *"
                      />
                      <input
                        type="text"
                        name="rfc"
                        required
                        value={donorData.rfc}
                        onChange={handleDonorChange}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        placeholder="RFC *"
                      />
                      <input
                        type="email"
                        name="email"
                        required
                        value={donorData.email}
                        onChange={handleDonorChange}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        placeholder="Correo Electrónico *"
                      />
                      <input
                        type="tel"
                        name="phone"
                        required
                        value={donorData.phone}
                        onChange={handleDonorChange}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        placeholder="Teléfono *"
                      />
                      <input
                        type="text"
                        name="address"
                        required
                        value={donorData.address}
                        onChange={handleDonorChange}
                        className="sm:col-span-2 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        placeholder="Dirección completa *"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition"
                    >
                      {loading ? 'Validando...' : 'Continuar'}
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              )}

              {/* Step 2: Amount */}
              {step === 2 && (
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Selecciona el Monto</h2>
                  <form onSubmit={proceedToPayment} className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {predefinedAmounts.map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => {
                            setDonationAmount(amount);
                            setCustomAmount('');
                          }}
                          className={`p-4 border-2 rounded-lg font-semibold text-lg transition ${
                            donationAmount === amount && !customAmount
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                              : 'border-gray-200 hover:border-emerald-300 text-gray-700'
                          }`}
                        >
                          ${amount}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                      <input
                        type="number"
                        min="10"
                        value={customAmount}
                        onChange={(e) => {
                          setCustomAmount(e.target.value);
                          setDonationAmount('');
                        }}
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        placeholder="Otra cantidad"
                      />
                    </div>
                    {selectedAmount && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                        <p className="text-center text-gray-700">
                          Estás a punto de donar{' '}
                          <span className="text-2xl font-bold text-emerald-700">${selectedAmount} MXN</span>
                        </p>
                      </div>
                    )}
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                      >
                        <ArrowLeft className="w-5 h-5" />
                        Atrás
                      </button>
                      <button
                        type="submit"
                        disabled={!selectedAmount || loading}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition"
                      >
                        {loading ? 'Procesando...' : 'Continuar al Pago'}
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Step 3: Payment */}
              {step === 3 && (
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Información de Pago</h2>
                  <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg p-6 mb-6 text-white">
                    <p className="text-sm text-emerald-50 mb-1">Monto a donar</p>
                    <p className="text-4xl font-bold">${selectedAmount} MXN</p>
                  </div>
                  <form onSubmit={processPayment} className="space-y-4">
                    <input
                      type="text"
                      name="cardNumber"
                      required
                      maxLength={19}
                      value={paymentData.cardNumber}
                      onChange={handlePaymentChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                      placeholder="Número de Tarjeta *"
                    />
                    <input
                      type="text"
                      name="cardHolder"
                      required
                      value={paymentData.cardHolder}
                      onChange={handlePaymentChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                      placeholder="Nombre del Titular *"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        name="expiryDate"
                        required
                        maxLength={5}
                        value={paymentData.expiryDate}
                        onChange={handlePaymentChange}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        placeholder="MM/AA *"
                      />
                      <input
                        type="text"
                        name="cvv"
                        required
                        maxLength={3}
                        value={paymentData.cvv}
                        onChange={handlePaymentChange}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        placeholder="CVV *"
                      />
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex gap-3">
                        <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-900 mb-1">Transacción Segura</p>
                          <p className="text-sm text-blue-700">
                            Tu información está protegida con cifrado de nivel bancario. Verificado por Appleseed México.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                      >
                        <ArrowLeft className="w-5 h-5" />
                        Atrás
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition"
                      >
                        {loading ? 'Procesando Pago...' : 'Completar Donación'}
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          ) : (
            /* Success Screen */
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">¡Donación Exitosa!</h2>
              <p className="text-lg text-gray-600 mb-6">
                Tu donación de <span className="font-bold text-emerald-600">${selectedAmount} MXN</span> ha sido procesada exitosamente.
              </p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mb-6 text-left">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Beneficiario:</strong> {organizationData.legalName}
                </p>
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Donante:</strong> {donorData.firstName} {donorData.lastName}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>ID de transacción:</strong> DON-{Date.now().toString().slice(-8)}
                </p>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Recibirás un comprobante por correo electrónico a <strong>{donorData.email}</strong>
              </p>
              <Heart className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-700 mb-6">¡Gracias por tu generosidad!</p>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition"
              >
                Cerrar Vista Previa
              </button>
            </div>
          )}

          {/* Footer */}
          {!paymentCompleted && (
            <div className="text-center mt-6">
              <p className="text-sm text-gray-600">
                Vista previa - Sistema verificado por Appleseed México
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
