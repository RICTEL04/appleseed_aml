"use client"

import { useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Filter, Building2, Phone, Mail, MapPin } from 'lucide-react';
import { organizationRepository } from '@/lib/repositories/organization.repository';
import { useOrganizations } from '../hooks/useOrganizations';
import { OrganizationModel } from '@/lib/models/organization.model';

interface Organization {
  id: string;
  name: string;
  type: string;
  contact: string;
  email: string;
  location: string;
  status: 'Verificada' | 'En revisión' | 'Pendiente';
  risk: 'Bajo' | 'Medio' | 'Alto';
  registrationDate: string;
}



export function Organizations() {

  const { organizations, loading, error } = useOrganizations();

  const mockOrganizations: Organization[] = (organizations || []).map((org: OrganizationModel) => ({
    id: org.id_osc,
    name: org.nombre_organizacion || '',
    type: org.tipo || '',
    contact: org.telefono ||'',
    email: org.email || '',
    location: org.direccion || '',
    status: (org.estado_verificacion || 'Pendiente') as 'Verificada' | 'En revisión' | 'Pendiente',
    risk: (org.riesgo || 'Bajo') as 'Bajo' | 'Medio' | 'Alto',
    registrationDate: org.created_at || new Date().toISOString(),
  }));

  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredOrganizations = mockOrganizations.filter((org) => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || org.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  organizationRepository.getAll().then((organizations) => {
    console.log('Fetched organizations:', organizations);
    console.log(organizations[0].nombre_organizacion);
  }).catch((error) => {
    console.error('Error fetching organizations:', error);
  });

  if (loading) return <div className="text-center py-8">Cargando...</div>
  if (error) return <div className="text-center py-8 text-red-500">{error}</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Organizaciones</h1>
          <p className="text-gray-600">Gestiona y supervisa las organizaciones registradas</p>
        </div>
        <Link
          to="/organizations/register"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition shadow-lg shadow-emerald-600/30"
        >
          <Plus className="w-5 h-5" />
          Registrar Organización
        </Link>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o ubicación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="relative sm:w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none appearance-none bg-white"
            >
              <option value="all">Todos los estados</option>
              <option value="verificada">Verificada</option>
              <option value="en revisión">En revision</option>
              <option value="pendiente">Pendiente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Organizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredOrganizations.map((org) => (
          <div
            key={org.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{org.name}</h3>
                  <p className="text-sm text-gray-600">{org.type}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  org.status === 'Verificada' 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : org.status === 'En revisión'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {org.status}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{org.location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4" />
                <span>{org.contact}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4" />
                <span>{org.email}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Nivel de Riesgo</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                  org.risk === 'Bajo' 
                    ? 'bg-green-100 text-green-700' 
                    : org.risk === 'Medio'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {org.risk}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Registrada</p>
                <p className="text-sm text-gray-900 mt-1">{new Date(org.registrationDate).toLocaleDateString('es-MX')}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredOrganizations.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron organizaciones</h3>
          <p className="text-gray-600">Intenta ajustar tus filtros de búsqueda</p>
        </div>
      )}
    </div>
  );
}
