// app/components/BankAccountForm.tsx
'use client'

import { CreditCard } from 'lucide-react';

export interface BankAccountData {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  clabe: string;
}

interface BankAccountFormProps {
  value: BankAccountData;
  onChange: (data: BankAccountData) => void;
  error?: string;
}

export function BankAccountForm({ value, onChange, error }: BankAccountFormProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onChange({
      ...value,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-6">
        <CreditCard className="w-5 h-5 text-emerald-600" />
        <h2 className="text-xl font-semibold text-gray-900">Información Bancaria</h2>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-2">
            Banco *
          </label>
          <select
            id="bankName"
            name="bankName"
            required
            value={value.bankName}
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
            value={value.accountHolder}
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
            value={value.accountNumber}
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
            value={value.clabe}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            placeholder="012345678901234567"
          />
          <p className="text-xs text-gray-500 mt-1">18 dígitos</p>
        </div>
      </div>
    </div>
  );
}