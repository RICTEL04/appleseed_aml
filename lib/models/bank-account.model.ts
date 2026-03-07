// lib/models/bank-account.model.ts
// este modelo representa la cuenta bancaria de una organizacion
export interface IBankAccount {
  id_cuenta_banco: string | undefined
  clabe: string
  num_cuenta: string
  banco: string
  id_persona: string | null
  titular: string
}

export class BankAccountModel implements IBankAccount {
  id_cuenta_banco: string | undefined
  clabe: string
  num_cuenta: string
  banco: string
  id_persona: string | null
  titular: string

  constructor(data: IBankAccount) {
    this.id_cuenta_banco = data.id_cuenta_banco
    this.clabe = data.clabe
    this.num_cuenta = data.num_cuenta
    this.banco = data.banco
    this.id_persona = data.id_persona
    this.titular = data.titular
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

  /*
  toJSON() {
    return {
      id_cuenta_banco: this.id_cuenta_banco,
      banco: this.getBankName(),
      clabe: this.maskCLABE(),
      cuenta: this.maskAccountNumber(),
      id_persona : this.id_persona
    }
  }
  */
  private maskCLABE(): string {
    return `**** **** **** ${this.clabe.slice(-4)}`
  }

  private maskAccountNumber(): string {
    return `**** ${this.num_cuenta.slice(-4)}`
  }
}