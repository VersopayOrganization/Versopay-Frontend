export type AuthResponseDto = {
  accessToken: string;
  expiresAtUtc: string;
  usuario: { id: number; nome: string; email: string; isAdmin: boolean };
};
