import {
  extendZodWithOpenApi,
  OpenApiGeneratorV31,
  OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import {
  API_TITLE,
  API_VERSION,
  OVERVIEW_DESCRIPTION,
  TAG_DESCRIPTIONS,
  V1_DESCRIPTION,
} from './api_docs_content';

extendZodWithOpenApi(z);

// Every module registers its routes here from the same Zod schemas that validate requests,
// so the docs cannot drift from the implementation (NFR-MAINT-02).
export const openApiRegistry = new OpenAPIRegistry();

export const bearerAuth = openApiRegistry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Paste `data.tokens.accessToken` from *Auth → Sign in*, without the word "Bearer".',
});

export function buildApiV1Document() {
  return new OpenApiGeneratorV31(openApiRegistry.definitions).generateDocument({
    openapi: '3.1.0',
    info: { title: `${API_TITLE} — v1`, version: API_VERSION, description: V1_DESCRIPTION },
    servers: [{ url: '/api/v1' }],
    tags: TAG_DESCRIPTIONS,
  });
}

// Landing page in Swagger UI: information only, no endpoints.
export function buildOverviewDocument() {
  return {
    openapi: '3.1.0',
    info: { title: API_TITLE, version: API_VERSION, description: OVERVIEW_DESCRIPTION },
    paths: {},
  };
}
