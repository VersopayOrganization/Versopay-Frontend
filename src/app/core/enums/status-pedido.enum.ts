export enum StatusPedido {
    // Pré-pagamento
    Pendente = 0,
    Expirado = 1,
    Cancelado = 2,

    // Análise / risco
    Processando = 10,
    Recusado = 11,

    // Cartão
    Autorizado = 20,
    Capturado = 21,

    // Confirmação de pagamento
    Pago = 30,
    Aprovado = StatusPedido.Pago,
    Concluido = 31,
    Liquidado = 32,

    // Pós-pagamento
    EstornoParcial = 40,
    Estornado = 41,
    Chargeback = 42,
}