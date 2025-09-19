export type PedidosResponseDto = {
    id: number;
    criacao: string;
    criacaoBr: string;
    dataPagaemento: string;
    metodoPagamento: string;
    valor: number;
    vendedorId: number;
    vendedorNome: string;
    produto: string;
    status: number;
};
