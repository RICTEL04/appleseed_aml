// lib/models/organization.model.ts
import { OrganizationType } from './types'

export interface IOrganization {
  id_osc: string
  nombre_organizacion: string
  tipo: OrganizationType | string
  rfc: string
  representante: string
  telefono: string
  email: string
  direccion: string
  actividades_principales: string
  financiamiento: string
  created_at: string
}

export class OrganizationModel implements IOrganization {
  id_osc: string
  nombre_organizacion: string
  tipo: OrganizationType | string
  rfc: string
  representante: string
  telefono: string
  email: string
  direccion: string
  actividades_principales: string
  financiamiento: string
  created_at: string

  constructor(data: IOrganization) {
    this.id_osc = data.id_osc
    this.nombre_organizacion = data.nombre_organizacion
    this.tipo = data.tipo
    this.rfc = data.rfc
    this.representante = data.representante
    this.telefono = data.telefono
    this.email = data.email
    this.direccion = data.direccion
    this.actividades_principales = data.actividades_principales
    this.financiamiento = data.financiamiento
    this.created_at = data.created_at
  }

  // Domain methods
  getContactInfo() {
    return {
      representante: this.representante,
      telefono: this.telefono,
      email: this.email,
      direccion: this.direccion
    }
  }

  isValidRFC(): boolean {
    // Mexican RFC validation (12 characters for personas morales)
    return this.rfc.length === 12 && /^[A-Z&Ñ]{3}[0-9]{6}[A-Z0-9]{3}$/.test(this.rfc)
  }

  toJSON() {
    return {
      id: this.id_osc,
      nombre: this.nombre_organizacion,
      tipo: this.tipo,
      rfc: this.rfc,
      representante: this.representante,
      contacto: this.getContactInfo()
    }
  }
}