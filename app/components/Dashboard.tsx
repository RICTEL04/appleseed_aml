"use client"
import { Building2, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const alertsData = [
  { month: 'Ene', alertas: 12 },
  { month: 'Feb', alertas: 8 },
  { month: 'Mar', alertas: 15 },
  { month: 'Abr', alertas: 6 },
  { month: 'May', alertas: 10 },
  { month: 'Jun', alertas: 4 },
];

const riskData = [
  { name: 'Bajo', value: 65, color: '#10b981' },
  { name: 'Medio', value: 25, color: '#f59e0b' },
  { name: 'Alto', value: 10, color: '#ef4444' },
];

const recentOrganizations = [
  { id: 1, name: 'Fundación Esperanza', status: 'Verificada', risk: 'Bajo' },
  { id: 2, name: 'ONG Educación Global', status: 'En revisión', risk: 'Medio' },
  { id: 3, name: 'Asociación Salud para Todos', status: 'Verificada', risk: 'Bajo' },
  { id: 4, name: 'Centro de Apoyo Comunitario', status: 'Verificada', risk: 'Bajo' },
];

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Resumen general de prevención de lavado de dinero</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1">Organizaciones Registradas</p>
          <p className="text-3xl font-bold text-gray-900">124</p>
          <p className="text-emerald-600 text-sm mt-2">+12 este mes</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1">Alertas Activas</p>
          <p className="text-3xl font-bold text-gray-900">4</p>
          <p className="text-red-600 text-sm mt-2">Requieren atención</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1">Verificaciones Completas</p>
          <p className="text-3xl font-bold text-gray-900">98</p>
          <p className="text-blue-600 text-sm mt-2">79% del total</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1">Índice de Cumplimiento</p>
          <p className="text-3xl font-bold text-gray-900">94%</p>
          <p className="text-purple-600 text-sm mt-2">+3% vs mes anterior</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Alertas Mensuales</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={alertsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="alertas" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Distribución por Nivel de Riesgo</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={riskData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {riskData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Organizations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Organizaciones Recientes</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Organización</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Estado</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Nivel de Riesgo</th>
              </tr>
            </thead>
            <tbody>
              {recentOrganizations.map((org) => (
                <tr key={org.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 text-gray-900">{org.name}</td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      org.status === 'Verificada' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {org.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      org.risk === 'Bajo' 
                        ? 'bg-green-100 text-green-700' 
                        : org.risk === 'Medio'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {org.risk}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
