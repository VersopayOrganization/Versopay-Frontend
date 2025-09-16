export type WebhooksResponseDto = {
    id: number;
    url: string;
    ativo: boolean;
    hasSecret: boolean;
    eventos: [];
    eventosMask: number
    criadoEmUtc: string;
    atualizadoEmUtc: string
};