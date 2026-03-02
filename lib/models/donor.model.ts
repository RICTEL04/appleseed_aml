// lib/models/donor.model.ts
export interface IDonor {
  id_donante: string
  nombre_varchar: string
  rfc: string
  created_at: string
}

export class DonorModel implements IDonor {
  id_donante: string
  nombre_varchar: string
  rfc: string
  created_at: string

  constructor(data: IDonor) {
    this.id_donante = data.id_donante
    this.nombre_varchar = data.nombre_varchar
    this.rfc = data.rfc
    this.created_at = data.created_at
  }

  // Domain methods
  isValidRFC(): boolean {
    // Mexican RFC validation for individuals (13 characters)
    return this.rfc.length === 13 && /^[A-Z&Ñ]{4}[0-9]{6}[A-Z0-9]{3}$/.test(this.rfc)
  }

  getDisplayName(): string {
    return this.nombre_varchar || 'Donante Anónimo'
  }

  toJSON() {
    return {
      id: this.id_donante,
      nombre: this.nombre_varchar,
      rfc: this.rfc
    }
  }
}