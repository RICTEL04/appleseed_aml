// lib/models/donation-tracking.model.ts
import { DonationModel } from './donation.model'
import { DonorModel } from './donor.model'

export interface IDonationTracking {
  id_seguimiento: string
  id_donacion: string | null
  id_donante: string | null
  fecha_inicio_periodo: string | null
  acumulacion: number | null
  limit_identificacion: boolean | null
  limit_aviso: boolean | null
  created_at: string
}

export class DonationTrackingModel implements IDonationTracking {
  id_seguimiento: string
  id_donacion: string | null
  id_donante: string | null
  fecha_inicio_periodo: string | null
  acumulacion: number | null
  limit_identificacion: boolean | null
  limit_aviso: boolean | null
  created_at: string

  // Optional relations
  donation?: DonationModel
  donor?: DonorModel

  constructor(data: IDonationTracking) {
    this.id_seguimiento = data.id_seguimiento
    this.id_donacion = data.id_donacion
    this.id_donante = data.id_donante
    this.fecha_inicio_periodo = data.fecha_inicio_periodo
    this.acumulacion = data.acumulacion
    this.limit_identificacion = data.limit_identificacion
    this.limit_aviso = data.limit_aviso
    this.created_at = data.created_at
  }

  // Domain methods
  hasReachedIdentificationLimit(): boolean {
    return this.limit_identificacion || false
  }

  hasReachedNotificationLimit(): boolean {
    return this.limit_aviso || false
  }

  getAccumulatedAmount(): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(this.acumulacion || 0)
  }

  getPeriodStartDate(): string {
    if (!this.fecha_inicio_periodo) return 'No definido'
    return new Date(this.fecha_inicio_periodo).toLocaleDateString('es-MX')
  }

  toJSON() {
    return {
      id: this.id_seguimiento,
      acumulado: this.getAccumulatedAmount(),
      periodo: this.getPeriodStartDate(),
      limites: {
        identificacion: this.limit_identificacion,
        aviso: this.limit_aviso
      }
    }
  }
}