"use client"

import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router';
import { Shield, LayoutDashboard, Bell, FileText, MessageSquare, LogOut, Menu, User } from 'lucide-react';

export function OrganizationLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [organizationName, setOrganizationName] = useState('');

  useEffect(() => {
    const auth = localStorage.getItem('appleseed_auth');
    const userType = localStorage.getItem('user_type');
    const orgName = localStorage.getItem('organization_name');
    
    if (!auth || userType !== 'organization') {
      navigate('/login');
    } else {
      setOrganizationName(orgName || '');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('appleseed_auth');
    localStorage.removeItem('user_type');
    localStorage.removeItem('organization_id');
    localStorage.removeItem('organization_name');
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <Menu className="w-6 h-6 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-emerald-600 rounded-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-gray-900">{organizationName}</h1>
                  <p className="text-xs text-gray-600">Portal de Organización</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:sticky top-16 left-0 z-30 w-64 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out`}
        >
          <nav className="p-4 space-y-2">
            <Link
              to="/organization"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive('/organization')
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/organization/profile"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive('/organization/profile')
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <User className="w-5 h-5" />
              <span>Perfil y Donaciones</span>
            </Link>

            <Link
              to="/organization/announcements"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive('/organization/announcements')
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Bell className="w-5 h-5" />
              <span>Avisos</span>
            </Link>

            <Link
              to="/organization/documents"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive('/organization/documents')
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>Documentos</span>
            </Link>

            <Link
              to="/organization/messages"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive('/organization/messages')
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span>Mensajes</span>
            </Link>
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20 top-16"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}