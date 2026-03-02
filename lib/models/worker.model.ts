// lib/models/worker.model.ts
import { WorkerRole } from './types'

export interface IWorker {
  id_trabajador: string
  rol: string
  email: string
  created_at: string
}

export class WorkerModel implements IWorker {
  id_trabajador: string
  rol: string
  email: string
  created_at: string

  constructor(data: IWorker) {
    this.id_trabajador = data.id_trabajador
    this.rol = data.rol
    this.email = data.email
    this.created_at = data.created_at
  }

  // Domain methods
  getRole(): WorkerRole {
    const validRoles: WorkerRole[] = ['admin', 'gestor', 'contador', 'visualizador']
    return validRoles.includes(this.rol as WorkerRole)
      ? this.rol as WorkerRole
      : 'visualizador'
  }

  hasPermission(permission: string): boolean {
    const permissions: Record<WorkerRole, string[]> = {
      admin: ['*'], // All permissions
      gestor: ['read:donations', 'create:donations', 'read:avisos', 'create:avisos'],
      contador: ['read:donations', 'read:reports'],
      visualizador: ['read:avisos', 'read:donations:public']
    }

    const role = this.getRole()
    return role === 'admin' || permissions[role]?.includes(permission) || false
  }

  canManageDonations(): boolean {
    return this.hasPermission('create:donations') || this.getRole() === 'admin'
  }

  canViewReports(): boolean {
    return this.hasPermission('read:reports') || this.getRole() === 'admin'
  }

  toJSON() {
    return {
      id: this.id_trabajador,
      email: this.email,
      rol: this.getRole(),
      permissions: {
        manageDonations: this.canManageDonations(),
        viewReports: this.canViewReports()
      }
    }
  }
}