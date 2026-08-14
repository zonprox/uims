export interface CreateResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface UpdateResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
}
