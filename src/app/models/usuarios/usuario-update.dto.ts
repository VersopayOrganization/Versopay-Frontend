import { TipoCadastro } from "../../core/enums/tipo-cadastro.enum";

export type UsuarioUpdateDto = {
  nome: string;
  email: string;
  senha: string;
  tipoCadastro?: TipoCadastro;
  cpfCnpj?: string;
  instagram?: string;
  telefone?: string;
  nomeFantasia?: string;
  razaoSocial?: string;
  site?: string;
  enderecoCep?: string;
  enderecoLogradouro?: string;
  enderecoNumero?: string;
  enderecoComplemento?: string;
  enderecoBairro?: string;
  enderecoCidade?: string;
  enderecoUF?: string;
  nomeCompletoBanco?: string;
  chavePix?: string;
  chaveCarteiraCripto?: string;
};
