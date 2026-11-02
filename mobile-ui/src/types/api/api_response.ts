// The backend envelope. Every endpoint answers with one of these two shapes.

// Success. T is the `data` payload; leave it as undefined for endpoints that return none.
export interface ApiResponse<T = undefined> {
  status: string;
  status_code: number;
  message: string;
  data: T;
}

export interface ErrorMessages {
  [key: string]: string[] | string;
}

// Failure. `errors` is keyed by field name for validation failures.
export interface ErrorResponse {
  status: string;
  errors: ErrorMessages;
}
