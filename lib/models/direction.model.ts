export interface IDirection {
  id_direccion: undefined | string
  calle: string
  num_exterior: string
  num_interior: string | null
  cp: string
  entidad_federativa: string
  ciudad_alcaldia: string
  //created_at: string
}

export class DirectionModel implements IDirection {
    id_direccion: undefined | string
    calle: string
    num_exterior: string
    num_interior: string | null
    cp: string
    entidad_federativa: string
    ciudad_alcaldia: string

    constructor(data: IDirection){
        this.id_direccion = data.id_direccion
        this.calle = data.calle
        this.num_exterior = data.num_exterior
        this.num_interior = data.num_interior
        this.cp = data.cp
        this.entidad_federativa = data.entidad_federativa
        this.ciudad_alcaldia = data.ciudad_alcaldia

    }

    formatAddress(): string {
        return `${this.calle} ${this.num_exterior}${this.num_interior ? ' Int. ' + this.num_interior : ''}, ${this.ciudad_alcaldia}, ${this.entidad_federativa}, CP ${this.cp}`
    }

}