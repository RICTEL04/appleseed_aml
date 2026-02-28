// lib/models/donation.model.ts
import { DonorModel } from './donor.model'
import { BankAccountModel } from './bank-account.model'

export interface IDonation {
  id_donacion: string
  cantidad: number
  id_cuenta_banco: string | null
  id_donante: string | null
  created_at: string
}

export class DonationModel implements IDonation {
  id_donacion: string
  cantidad: number
  id_cuenta_banco: string | null
  id_donante: string | null
  created_at: string

  // Optional relations
  donor?: DonorModel
  bankAccount?: BankAccountModel

  constructor(data: IDonation) {
    this.id_donacion = data.id_donacion
    this.cantidad = data.cantidad
    this.id_cuenta_banco = data.id_cuenta_banco
    this.id_donante = data.id_donante
    this.created_at = data.created_at
  }

  // Domain methods
  getFormattedAmount(): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(this.cantidad)
  }

  isAnonymous(): boolean {
    return !this.id_donante
  }

  getDonorInfo(): string {
    if (this.isAnonymous()) return 'Donación Anónima'
    return this.donor?.getDisplayName() || 'Donante'
  }

  withRelations(donor?: DonorModel, bankAccount?: BankAccountModel): this {
    this.donor = donor
    this.bankAccount = bankAccount
    return this
  }

  toJSON() {
    return {
      id: this.id_donacion,
      cantidad: this.getFormattedAmount(),
      donante: this.getDonorInfo(),
      fecha: new Date(this.created_at).toLocaleDateString('es-MX'),
      anonymous: this.isAnonymous()
    }
  }
}