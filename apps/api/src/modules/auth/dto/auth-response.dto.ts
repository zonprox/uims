export class AuthUserDto {
  id!: string;
  email!: string;
  name!: string;
  role!: string;
}

export class AuthResponseDto {
  accessToken!: string;
  token?: string;
  user!: AuthUserDto;
}
