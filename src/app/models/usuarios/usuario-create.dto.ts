export type UsuarioCreateDto = {
  nome: string;
  email: string;
  senha: string;
  confirmarSenha: string;
  tipoCadastro?: number;
  cpfCnpj?: string;
  instagram?: string;
  telefone?: string;
};
