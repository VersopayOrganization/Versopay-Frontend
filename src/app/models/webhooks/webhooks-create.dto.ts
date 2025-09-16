export type WebhooksCreateDto = {
    url: string;
    ativo: boolean;
    secret: string;
    eventos: [];
};
