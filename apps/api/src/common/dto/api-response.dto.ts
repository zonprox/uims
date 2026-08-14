export class ApiResponseDto<T> {
  success!: boolean;
  data!: T;
  timestamp!: string;
}
