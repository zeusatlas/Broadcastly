export type DependencyStatus = 'up' | 'down';

export interface HealthResponse {
  uptimeSeconds: number;
  database: DependencyStatus;
  redis: DependencyStatus;
}
