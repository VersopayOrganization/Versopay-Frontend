import { TipoCadastro } from "../../core/enums/tipo-cadastro.enum";

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  chaveCarteiraCripto: string;
  chavePix: string;
  cpfCnpj: string;
  cpfCnpjFormatado: string;
  createdAt: string;
  isAdmin: boolean;
  instagram: string;
  nome: string;
  nomeCompletoBanco: string;
  nomeFantasia: string;
  razaoSocial: string;
  site: string;
  telefone: string;
  tipoCadastro: TipoCadastro;
  enderecoCep: string;
  enderecoLogradouro: string;
  enderecoNumero: string;
  enderecoComplemento: string;
  enderecoBairro: string;
  enderecoCidade: string;
  enderecoUF: string;
};
