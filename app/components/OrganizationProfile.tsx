"use client"

import { useState, useEffect } from 'react';
import { Building2, CreditCard, Share2, CheckCircle, Copy, Eye, X, ArrowRight, ArrowLeft, Heart, AlertCircle, Shield } from 'lucide-react';
import {DirectionForm} from './DirectionForm';
import { DirectionModel, IDirection } from '@/lib/models/direction.model';
import { useOrganizations } from '../hooks/useOrganizations';
import { OrganizationModel, IOrganization } from '@/lib/models/organization.model';
import { v4 as uuidv4 } from 'uuid';
import { useDirections } from '../hooks/useDirections';

interface OrganizationData {
  legalName: string;
  rfc: string;
  bankName: string;
  accountNumber: string;
  clabe: string;
  accountHolder: string;
  direction?: Partial<IDirection>;
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
  const { fetchOrganization, setDirectionById, updateOrganization } = useOrganizations();
  const { fetchDirectionById, upsertDirection, loading: directionLoading } = useDirections();

  const [organizationId, setOrganizationId] = useState<string>('');
  const [organizationName, setOrganizationName] = useState<string>('');
  const [origin, setOrigin] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [directionError, setDirectionError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [data, setData] = useState<OrganizationModel | null>(null);
  const [direction, setDirection] = useState<DirectionModel | null>(null);

  const [formData, setFormData] = useState<OrganizationData>({
    legalName: '',
    rfc: '',
    bankName: '',
    accountNumber: '',
    clabe: '',
    accountHolder: '',
    direction: undefined,
    phoneNumber: '',
    email: '',
    description: '',
    isComplete: false,
  });

  // Load organization data
  useEffect(() => {
    async function fetchData() {
      const orgData = await fetchOrganization();
      setData(orgData);
    }
    fetchData();
  }, [fetchOrganization]);

  // Load direction data
  useEffect(() => {
    if (!data?.id_direccion) return;
    
    async function fetchDirectionData() {
      const dirData = await fetchDirectionById(data?.id_direccion);
      setDirection(dirData);
    }
    fetchDirectionData();
  }, [data, fetchDirectionById]);

  // Update form when data or direction changes
  useEffect(() => {
    if (data) {
      setFormData((prev) => ({
        ...prev,
        legalName: data.nombre_organizacion,
        rfc: data.rfc,
        phoneNumber: data.telefono,
        email: data.email,
        description: data.actividades_principales,
        direction: direction ? {
          calle: direction.calle || '',
          num_exterior: direction.num_exterior || '',
          num_interior: direction.num_interior || null,
          cp: direction.cp || '',
          entidad_federativa: direction.entidad_federativa || '',
          ciudad_alcaldia: direction.ciudad_alcaldia || '',
          id_direccion: direction.id_direccion // Keep the ID for updates
        } : prev.direction
      }));
    }
  }, [data, direction]);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };



  const handleDirectionChange = (directionData: Partial<IDirection>) => {
    setFormData({
      ...formData,
      direction: directionData,
    });

    if (directionError) setDirectionError('');
  };

  const validateDirection = (direction?: Partial<IDirection>): boolean => {
    if (!direction) return false;
    
    const required: (keyof IDirection)[] = [
      'calle', 'num_exterior', 'cp', 
      'entidad_federativa', 'ciudad_alcaldia'
    ];
    
    for (const field of required) {
      if (!direction[field] || direction[field]?.trim() === '') {
        setDirectionError(`La dirección requiere ${field.replace('_', ' ')}`);
        return false;
      }
    }
    
    if (direction.cp && !/^\d{5}$/.test(direction.cp)) {
      setDirectionError('El código postal debe tener 5 dígitos');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate direction
    if (!validateDirection(formData.direction)) {
      return;
    }

    setIsSubmitting(true);

    try {
      // STEP 1: Save/Create the direction
      const directionModel = new DirectionModel({
        id_direccion: direction?.id_direccion, // Use existing ID if available
        calle: formData.direction!.calle!,
        num_exterior: formData.direction!.num_exterior!,
        num_interior: formData.direction!.num_interior || "",
        cp: formData.direction!.cp!,
        entidad_federativa: formData.direction!.entidad_federativa!,
        ciudad_alcaldia: formData.direction!.ciudad_alcaldia!,
      });

      console.log("STEP 1: Saving direction...");
      const savedDirection = await upsertDirection(directionModel);
      console.log("Direction saved:", savedDirection);

      if (savedDirection && data) {
        // STEP 2: Update the organization with the saved direction ID and description
        const updatedOrgData = {
          ...data,
          id_direccion: savedDirection.id_direccion,
          actividades_principales: formData.description
        };

        console.log("STEP 2: Updating organization...");
        const updatedOrganization = new OrganizationModel(updatedOrgData);
        await updateOrganization(updatedOrganization);
        
        // STEP 3: Update all local states
        setData(updatedOrganization);
        setDirection(savedDirection);
        
        // STEP 4: Mark as complete and update form
        setFormData(prev => ({
          ...prev,
          direction: {
            ...prev.direction,
            id_direccion: savedDirection.id_direccion
          },
          isComplete: true // This changes the button text
        }));

        // Save to localStorage
        localStorage.setItem(`org_profile_${organizationId}`, JSON.stringify({
          ...formData,
          isComplete: true
        }));
        
        console.log('✅ All done in ONE click!');
      }
    } catch (error) {
      console.error('Error:', error);
      setDirectionError('Error al guardar. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const donationLink = origin && organizationId ? `${origin}/donate/${organizationId}` : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(donationLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isFormComplete = true;

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
                Nombre Legal
              </label>
              <textarea
                readOnly
                id="legalName"
                name="legalName"
                value={formData.legalName}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="Nombre legal de la organización"
              />
            </div>

            <div>
              <label htmlFor="rfc" className="block text-sm font-medium text-gray-700 mb-2">
                RFC 
              </label>
              <textarea
                readOnly
                id="rfc"
                name="rfc"
                value={formData.rfc}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono 
              </label>
              <textarea
                readOnly
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico 
              </label>
              <textarea
                readOnly
                id="email"
                name="email"
                value={formData.email}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Direction Form - Replaces the old address field */}
            <div className="sm:col-span-2">
              <DirectionForm 
                value={formData.direction || {}}
                onChange={handleDirectionChange}
                error={directionError}
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

        {/* Bank Information 
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
            disabled={!isFormComplete || isSubmitting || directionLoading}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition shadow-lg shadow-emerald-600/30 flex items-center gap-2"
          >
            {(isSubmitting || directionLoading) ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              formData.isComplete ? 'Actualizar Información' : 'Guardar'
            )}
          </button>
        </div>
      </form>    
    </div>
  );
}