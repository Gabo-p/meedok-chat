export interface LoginDto {
  email: string;
  password: string;
  tenantId: string;
}

export interface TokenPairDto {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface LogoutDto {
  refreshToken: string;
}
