'use client'

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { DirectionModel, IDirection } from '@/lib/models/direction.model';

interface DirectionFormProps {
  value: Partial<IDirection>;
  onChange: (direction: Partial<IDirection>) => void;
  error?: string;
}

// Mexican states
const MEXICAN_STATES = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
  'Chiapas', 'Chihuahua', 'Coahuila', 'Colima', 'Durango', 'Estado de México',
  'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos',
  'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo',
  'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala',
  'Veracruz', 'Yucatán', 'Zacatecas', 'Ciudad de México'
];

export function DirectionForm({ value, onChange, error }: DirectionFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof IDirection, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue });
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-5 h-5 text-emerald-600" />
        <h3 className="text-lg font-semibold text-gray-900">Dirección Fiscal</h3>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Calle */}
        <div className="sm:col-span-2">
          <label htmlFor="calle" className="block text-sm font-medium text-gray-700 mb-1">
            Calle *
          </label>
          <input
            type="text"
            id="calle"
            value={value.calle || ''}
            onChange={(e) => handleChange('calle', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none ${
              errors.calle ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Calle"
            required
          />
        </div>

        {/* Número Exterior */}
        <div>
          <label htmlFor="num_exterior" className="block text-sm font-medium text-gray-700 mb-1">
            Número Exterior *
          </label>
          <input
            type="text"
            id="num_exterior"
            value={value.num_exterior || ''}
            onChange={(e) => handleChange('num_exterior', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none ${
              errors.num_exterior ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="123"
            required
          />
        </div>

        {/* Número Interior */}
        <div>
          <label htmlFor="num_interior" className="block text-sm font-medium text-gray-700 mb-1">
            Número Interior
          </label>
          <input
            type="text"
            id="num_interior"
            value={value.num_interior || ''}
            onChange={(e) => handleChange('num_interior', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            placeholder="1A (opcional)"
          />
        </div>

        {/* Código Postal */}
        <div>
          <label htmlFor="cp" className="block text-sm font-medium text-gray-700 mb-1">
            Código Postal *
          </label>
          <input
            type="text"
            id="cp"
            value={value.cp || ''}
            onChange={(e) => handleChange('cp', e.target.value)}
            maxLength={5}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none ${
              errors.cp ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="12345"
            required
          />
        </div>

        {/* Ciudad/Alcaldía */}
        <div>
          <label htmlFor="ciudad_alcaldia" className="block text-sm font-medium text-gray-700 mb-1">
            Alcaldía/Municipio *
          </label>
          <input
            type="text"
            id="ciudad_alcaldia"
            value={value.ciudad_alcaldia || ''}
            onChange={(e) => handleChange('ciudad_alcaldia', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none ${
              errors.ciudad_alcaldia ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Benito Juárez"
            required
          />
        </div>

        {/* Entidad Federativa */}
        <div className="sm:col-span-2">
          <label htmlFor="entidad_federativa" className="block text-sm font-medium text-gray-700 mb-1">
            Entidad Federativa *
          </label>
          <select
            id="entidad_federativa"
            value={value.entidad_federativa || ''}
            onChange={(e) => handleChange('entidad_federativa', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none ${
              errors.entidad_federativa ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          >
            <option value="">Seleccionar estado...</option>
            {MEXICAN_STATES.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Helper text */}
      <p className="text-xs text-gray-500 mt-2">
        * Campos obligatorios. Esta dirección se usará para fines fiscales.
      </p>
    </div>
  );
}