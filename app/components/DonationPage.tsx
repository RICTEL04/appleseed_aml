"use client"

import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { Shield, CheckCircle, AlertCircle, CreditCard, ArrowRight, ArrowLeft, Heart } from 'lucide-react';

interface DonorData {
  firstName: string;
  lastName: string;
  secondLastName: string;
  rfc: string;
  email: string;
  phone: string;
  address: string;
  validated: boolean;
}

interface OrganizationData {
  legalName: string;
  description: string;
  rfc: string;
  email: string;
}

export function DonationPage() {
  const { organizationId } = useParams();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [organizationData, setOrganizationData] = useState<OrganizationData | null>(null);
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
    validated: false,
  });

  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    cardHolder: '',
    expiryDate: '',
    cvv: '',
  });

  // Load organization data
  useEffect(() => {
    const savedData = localStorage.getItem(`org_profile_${organizationId}`);
    if (savedData) {
      const data = JSON.parse(savedData);
      setOrganizationData({
        legalName: data.legalName,
        description: data.description,
        rfc: data.rfc,
        email: data.email,
      });
    }
  }, [organizationId]);

  const handleDonorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDonorData({
      ...donorData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Format card number
    if (e.target.name === 'cardNumber') {
      value = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
    }
    
    // Format expiry date
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
    
    // Simulate validation
    setTimeout(() => {
      setDonorData({ ...donorData, validated: true });
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
    
    // Simulate payment processing
    setTimeout(() => {
      setPaymentCompleted(true);
      setLoading(false);
    }, 2000);
  };

  const selectedAmount = customAmount || donationAmount;

  const predefinedAmounts = ['100', '500', '1000', '2000', '5000'];

  if (!organizationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Organización No Encontrada</h2>
          <p className="text-gray-600">
            La organización no ha completado su perfil o el enlace no es válido.
          </p>
        </div>
      </div>
    );
  }

  if (paymentCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
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
          <p className="text-gray-700">¡Gracias por tu generosidad!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
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
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Validación de Donante</h2>
            <form onSubmit={validateDonor} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre(s) *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    value={donorData.firstName}
                    onChange={handleDonorChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    placeholder="Juan"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apellido Paterno *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    required
                    value={donorData.lastName}
                    onChange={handleDonorChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    placeholder="Pérez"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apellido Materno *
                  </label>
                  <input
                    type="text"
                    name="secondLastName"
                    required
                    value={donorData.secondLastName}
                    onChange={handleDonorChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    placeholder="García"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    RFC *
                  </label>
                  <input
                    type="text"
                    name="rfc"
                    required
                    value={donorData.rfc}
                    onChange={handleDonorChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    placeholder="PEGJ850101XXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={donorData.email}
                    onChange={handleDonorChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    placeholder="correo@ejemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={donorData.phone}
                    onChange={handleDonorChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    placeholder="+52 55 1234 5678"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección *
                  </label>
                  <input
                    type="text"
                    name="address"
                    required
                    value={donorData.address}
                    onChange={handleDonorChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    placeholder="Calle, número, colonia, ciudad"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition shadow-lg shadow-emerald-600/30"
              >
                {loading ? 'Validando...' : 'Continuar'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Donation Amount */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Otra cantidad (MXN)
                </label>
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
                    placeholder="Ingresa un monto personalizado"
                  />
                </div>
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
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition shadow-lg shadow-emerald-600/30"
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
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Información de Pago</h2>
            
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg p-6 mb-6 text-white">
              <p className="text-sm text-emerald-50 mb-1">Monto a donar</p>
              <p className="text-4xl font-bold">${selectedAmount} MXN</p>
            </div>

            <form onSubmit={processPayment} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Tarjeta *
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="cardNumber"
                    required
                    maxLength={19}
                    value={paymentData.cardNumber}
                    onChange={handlePaymentChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    placeholder="1234 5678 9012 3456"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Titular *
                </label>
                <input
                  type="text"
                  name="cardHolder"
                  required
                  value={paymentData.cardHolder}
                  onChange={handlePaymentChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  placeholder="JUAN PEREZ GARCIA"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Vencimiento *
                  </label>
                  <input
                    type="text"
                    name="expiryDate"
                    required
                    maxLength={5}
                    value={paymentData.expiryDate}
                    onChange={handlePaymentChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    placeholder="MM/AA"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CVV *
                  </label>
                  <input
                    type="text"
                    name="cvv"
                    required
                    maxLength={3}
                    value={paymentData.cvv}
                    onChange={handlePaymentChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    placeholder="123"
                  />
                </div>
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
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition shadow-lg shadow-emerald-600/30"
                >
                  {loading ? 'Procesando Pago...' : 'Completar Donación'}
                  <CheckCircle className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-600">
            Sistema seguro verificado por Appleseed México
          </p>
        </div>
      </div>
    </div>
  );
}
