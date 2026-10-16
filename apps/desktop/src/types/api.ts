/** Backend DTO mirrors (see backend/.../dto). Money travels as strings. */

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
}

export interface DatabaseHealth {
  status: string;
  product: string;
  dbVersion: string;
}
