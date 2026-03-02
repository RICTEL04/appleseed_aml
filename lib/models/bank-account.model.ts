// lib/models/bank-account.model.ts
export interface IBankAccount {
  id_cuenta_banco: string
  clabe: string
  num_cuenta: string
  banco: string
  created_at: string
  id_donante: string | null
}

export class BankAccountModel implements IBankAccount {
  id_cuenta_banco: string
  clabe: string
  num_cuenta: string
  banco: string
  created_at: string
  id_donante: string | null

  constructor(data: IBankAccount) {
    this.id_cuenta_banco = data.id_cuenta_banco
    this.clabe = data.clabe
    this.num_cuenta = data.num_cuenta
    this.banco = data.banco
    this.created_at = data.created_at
    this.id_donante = data.id_donante
  }

  // Domain methods
  isValidCLABE(): boolean {
    // CLABE validation (18 digits)
    return /^\d{18}$/.test(this.clabe)
  }

  getBankName(): string {
    const banks: Record<string, string> = {
      '002': 'Banamex',
      '012': 'BBVA',
      '014': 'Santander',
      '137': 'Bancoppel'
      // Add more bank codes
    }
    return banks[this.clabe.substring(0, 3)] || this.banco
  }

  toJSON() {
    return {
      id: this.id_cuenta_banco,
      banco: this.getBankName(),
      clabe: this.maskCLABE(),
      cuenta: this.maskAccountNumber()
    }
  }

  private maskCLABE(): string {
    return `**** **** **** ${this.clabe.slice(-4)}`
  }

  private maskAccountNumber(): string {
    return `**** ${this.num_cuenta.slice(-4)}`
  }
}