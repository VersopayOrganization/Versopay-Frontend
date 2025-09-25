import { MetodoPagamento } from "../../core/enums/metodoPagamento.enum";

export type TransferenciasResponseDto = {
    id: number;
    dataSolicitacao: string;
    valorSolicitado: number;
    solicitanteId: number;
    nome: string;
    produto: string;
    status: number;
    empresa: string;
    chavePix: string;
    aprovacao: number;
    tipoEnvio: number;
    taxa: number;
    valorFinal: number;
    dataCadastro: string;
    dataAprovacao: string;
    metodoPagamento: MetodoPagamento
};
