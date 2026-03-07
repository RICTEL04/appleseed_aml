// lib/models/announcement.model.
// Este model representa un aviso que puede ser mandado a una organizacion
import { UrgencyLevel, AvisoStatus } from './types'
import { OrganizationModel } from './organization.model'

export interface IAnnouncement {
  id_aviso: string
  titulo: string
  mensaje: string
  remitente: string
  id_osc: string | null
  estado: string
  fecha: string | null
  categoria: string
  urgencia: string
}

export class AnnouncementModel implements IAnnouncement {
  id_aviso: string
  titulo: string
  mensaje: string
  remitente: string
  id_osc: string | null
  estado: string
  fecha: string | null
  categoria: string
  urgencia: string



  constructor(data: IAnnouncement) {
    this.id_aviso = data.id_aviso
    this.titulo = data.titulo
    this.mensaje = data.mensaje
    this.remitente = data.remitente
    this.id_osc = data.id_osc
    this.estado = data.estado
    this.fecha = data.fecha
    this.urgencia = data.urgencia
    this.categoria = data.categoria
  }

  // Domain methods
  getUrgencyLevel(): UrgencyLevel {
    const validLevels: UrgencyLevel[] = ['baja', 'media', 'alta', 'urgente']
    return validLevels.includes(this.urgencia as UrgencyLevel) 
      ? this.urgencia as UrgencyLevel 
      : 'media'
  }

  getUrgencyColor(): string {
    const colors: Record<UrgencyLevel, string> = {
      baja: 'green',
      media: 'yellow',
      alta: 'orange',
      urgente: 'red'
    }
    return colors[this.getUrgencyLevel()]
  }

  getStatus(): AvisoStatus {
    const validStatus: AvisoStatus[] = ['leido', 'noleido']
    return validStatus.includes(this.estado as AvisoStatus)
      ? this.estado as AvisoStatus
      : 'noleido'
  }

  getBoolStatus() : boolean{
    return this.getStatus() === 'leido'
  }

  isUrgent(): boolean {
    return this.getUrgencyLevel() === 'urgente'
  }

  /*
  getFormattedDate(): string {
    const date = this.fecha ? new Date(this.fecha) : new Date(this.created_at)
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  */
  getPreview(length: number = 100): string {
    return this.mensaje.length > length 
      ? `${this.mensaje.substring(0, length)}...` 
      : this.mensaje
  }

  toJSON() {
    return {
      id: this.id_aviso,
      titulo: this.titulo,
      mensaje: this.mensaje,
      remitente: this.remitente,
      urgencia: this.urgencia,
      fecha: this.fecha,
      estado: this.estado,
      id_osc: this.id_osc,
      categoria: this.categoria
    }
  }
}