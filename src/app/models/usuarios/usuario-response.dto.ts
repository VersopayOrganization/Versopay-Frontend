export type UsuarioResponseDto = {
  id: number;
  nome: string;
  email: string;
  tipoCadastro?: number;
  instagram?: string | null;
  telefone?: string | null;
  createdAt?: string;
  cpfCnpj?: string | null;
  cpfCnpjFormatado?: string | null;
  isAdmin?: boolean;
};
