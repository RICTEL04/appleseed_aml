// lib/models/organization.model.ts
// organizaciones sin fines de lucro que pueden recibir donaciones, 
// avisos, y tener trabajadores asociados.

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
  riesgo: string
  estado_verificacion: string
  id_direccion: string | undefined
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
  riesgo: string
  estado_verificacion: string
  id_direccion: string | undefined

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
    this.riesgo = data.riesgo
    this.estado_verificacion = data.estado_verificacion
    this.id_direccion = data.id_direccion
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
      id_osc: this.id_osc,
      nombre_organizacion: this.nombre_organizacion,
      tipo: this.tipo,
      rfc: this.rfc,
      representante: this.representante,
      telefono: this.telefono,
      email: this.email,
      direccion: this.direccion,
      actividades_principales: this.actividades_principales,
      financiamiento: this.financiamiento,
      //created_at: this.created_at,
      riesgo: this.riesgo,
      estado_verificacion: this.estado_verificacion,
      id_direccion: this.id_direccion
    }
  }
  
}