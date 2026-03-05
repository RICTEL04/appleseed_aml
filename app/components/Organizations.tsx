"use client"

import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Filter, Building2, Phone, Mail, MapPin, Loader2, Send } from 'lucide-react';
import { useOrganizations } from '../hooks/useOrganizations';
import { useWorker } from '@/app/hooks/useWorker';
import { OrganizationModel } from '@/lib/models/organization.model';
import { DirectionModel } from '@/lib/models/direction.model';
import { OrganizationModal } from '@/app/components/Organizationmodal';
import { BulkAnnouncementModal } from '@/app/components/Bulkannouncementmodal';
import { SingleAnnouncementModal } from '@/app/components/Singleannouncementmodal';

interface OrganizationDetail {
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
    const { loading, error, allOrganizationsWithDirections } = useOrganizations();
    const { worker } = useWorker();

    const [organizationsWithDirections, setOrganizationsWithDirections] = useState<OrganizationDetail[]>([]);
    const [loadingDirections, setLoadingDirections] = useState(false);

    const [selectedOrg, setSelectedOrg]         = useState<OrganizationDetail | null>(null); // info modal
    const [announcementOrg, setAnnouncementOrg] = useState<OrganizationDetail | null>(null); // send modal
    const [showBulkModal, setShowBulkModal]     = useState(false);

    const [searchTerm, setSearchTerm]     = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    useEffect(() => {
        async function fetchData() {
            setLoadingDirections(true);
            try {
                const data = await allOrganizationsWithDirections();
                const mapped = data.map(([organization, direction]: [OrganizationModel, DirectionModel | null]) => ({
                    id: organization.id_osc,
                    name: organization.nombre_organizacion || '',
                    type: organization.tipo || '',
                    contact: organization.telefono || '',
                    email: organization.email || '',
                    location: direction ? direction.formatAddress() : 'Dirección no disponible',
                    status: (organization.estado_verificacion || 'Pendiente') as 'Verificada' | 'En revisión' | 'Pendiente',
                    risk: (organization.riesgo || 'Bajo') as 'Bajo' | 'Medio' | 'Alto',
                    registrationDate: organization.created_at || new Date().toISOString(),
                }));
                setOrganizationsWithDirections(mapped);
            } catch (err) {
                console.error('Error fetching organizations with directions:', err);
            } finally {
                setLoadingDirections(false);
            }
        }
        fetchData();
    }, [allOrganizationsWithDirections]);

    const filteredOrganizations = organizationsWithDirections.filter((org) => {
        const matchesSearch =
            org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            org.location.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'all' || org.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const allOrgIds = organizationsWithDirections.map(o => o.id);

    if (loading || loadingDirections) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Cargando organizaciones...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8 text-red-500">
                <p>Error: {error}</p>
                <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg">
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Organizaciones</h1>
                        <p className="text-gray-600">Gestiona y supervisa las organizaciones registradas</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowBulkModal(true)}
                            disabled={allOrgIds.length === 0}
                            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white border border-emerald-600 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition"
                        >
                            <Send className="w-4 h-4" />
                            Aviso General
                        </button>
                        <Link
                            to="/organizations/register"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition shadow-lg shadow-emerald-600/30"
                        >
                            <Plus className="w-5 h-5" />
                            Registrar Organización
                        </Link>
                    </div>
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
                                <option value="Verificada">Verificada</option>
                                <option value="En revisión">En revisión</option>
                                <option value="Pendiente">Pendiente</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Organizations Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredOrganizations.map((org) => (
                        <div key={org.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-emerald-300 transition flex flex-col">

                            {/* Clickable info area → opens info modal */}
                            <div
                                onClick={() => setSelectedOrg(org)}
                                className="p-6 cursor-pointer flex-1"
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
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                        org.status === 'Verificada' ? 'bg-emerald-100 text-emerald-700'
                                        : org.status === 'En revisión' ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}>
                                        {org.status}
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <MapPin className="w-4 h-4 flex-shrink-0" /><span>{org.location}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Phone className="w-4 h-4 flex-shrink-0" /><span>{org.contact}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Mail className="w-4 h-4 flex-shrink-0" /><span>{org.email}</span>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-gray-500">Nivel de Riesgo</p>
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                                            org.risk === 'Bajo' ? 'bg-green-100 text-green-700'
                                            : org.risk === 'Medio' ? 'bg-orange-100 text-orange-700'
                                            : 'bg-red-100 text-red-700'
                                        }`}>
                                            {org.risk}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">Registrada</p>
                                        <p className="text-sm text-gray-900 mt-1">
                                            {new Date(org.registrationDate).toLocaleDateString('es-MX', {
                                                day: '2-digit', month: '2-digit', year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Card footer — send button, does NOT open info modal */}
                            <div className="px-6 pb-4 pt-3 border-t border-gray-100">
                                <button
                                    onClick={() => setAnnouncementOrg(org)}
                                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 border border-emerald-200 hover:bg-emerald-50 rounded-lg transition"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    Enviar Aviso
                                </button>
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

            {/* Info modal */}
            {selectedOrg && (
                <OrganizationModal
                    organization={selectedOrg}
                    onClose={() => setSelectedOrg(null)}
                />
            )}

            {/* Single announcement modal */}
            {announcementOrg && (
                <SingleAnnouncementModal
                    orgId={announcementOrg.id}
                    orgName={announcementOrg.name}
                    onClose={() => setAnnouncementOrg(null)}
                />
            )}

            {/* Bulk announcement modal */}
            {showBulkModal && (
                <BulkAnnouncementModal
                    orgIds={allOrgIds}
                    senderName={worker?.nombre ?? ''}
                    onClose={() => setShowBulkModal(false)}
                />
            )}
        </>
    );
}