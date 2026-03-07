// lib/models/document.model.ts
// este modelo representa un documento que una organizacion le pide a un trabajador,
// el documento tiene un estado, una fecha de vencimiento, y puede tener una nota o comentario

export interface IDocument{
    id: string | undefined
    nombre_documento: string
    tipo_documento: string
    estado: string
    vencimiento: string
    id_osc: string
    //a partir de aqui son cosas que si van pero no 
    //se modifican tan directo desde el trabajador
    id_documento: string | undefined
    nota: string | undefined
    comentario: string | undefined
    documento_enviado: string | undefined
    id_trabajador: string | undefined
}

export class DocumentModel implements IDocument{
    id: string | undefined
    nombre_documento: string
    tipo_documento: string
    estado: string
    vencimiento: string
    id_osc: string
    id_documento: string | undefined
    nota: string | undefined
    comentario: string | undefined
    documento_enviado: string | undefined
    id_trabajador: string | undefined


    constructor(data: IDocument){
        this.id = data.id || undefined
        this.nombre_documento = data.nombre_documento
        this.tipo_documento = data.tipo_documento
        this.estado = data.estado
        this.vencimiento = data.vencimiento
        this.id_osc = data.id_osc
        this.id_documento = data.id_documento || undefined
        this.nota = data.nota || undefined
        this.comentario = data.comentario || undefined
        this.documento_enviado = data.documento_enviado || undefined
        this.id_trabajador = data.id_trabajador || undefined
    }

    

}
