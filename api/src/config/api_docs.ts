import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

import { API_TITLE } from './api_docs_content';
import { buildApiV1Document, buildOverviewDocument } from './openapi';

const OVERVIEW_NAME = 'API overview';
const V1_NAME = 'v1';

// Swagger UI opens on the overview, which has no endpoints; choosing "v1" in the top-right
// dropdown shows them. This only tidies the landing page. It is not access control.
const CUSTOM_CSS = `
  .swagger-ui .topbar { background: #14213d; padding: 12px 0; }
  .swagger-ui .topbar .link svg { display: none; }
  .swagger-ui .topbar .link::after { content: '${API_TITLE}'; color: #fff; font: 600 20px sans-serif; }
  .swagger-ui .topbar .download-url-wrapper .select-label { color: #e5e7eb; }
  .swagger-ui .topbar .download-url-wrapper select { border-color: #fca311; min-width: 200px; }
  .swagger-ui .info { margin: 32px 0 24px; }
  .swagger-ui .info .description { max-width: 900px; line-height: 1.6; }
  .swagger-ui .info .description blockquote { border-left: 4px solid #fca311; background: #fff8e6; padding: 8px 16px; margin: 16px 0; }
  .swagger-ui .block.col-12 > h3 { display: none; }
`;

export function mountApiDocs(app: Express): void {
  const v1 = buildApiV1Document();
  const overview = buildOverviewDocument();

  app.get('/api/docs/overview.json', (_req, res) => res.json(overview));
  app.get('/api/docs/v1.json', (_req, res) => res.json(v1));
  // Stable alias for tools and client generators.
  app.get('/api/docs.json', (_req, res) => res.json(v1));

  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(null, {
      customSiteTitle: `${API_TITLE} docs`,
      customCss: CUSTOM_CSS,
      explorer: true,
      swaggerOptions: {
        urls: [
          { url: '/api/docs/overview.json', name: OVERVIEW_NAME },
          { url: '/api/docs/v1.json', name: V1_NAME },
        ],
        'urls.primaryName': OVERVIEW_NAME,
        docExpansion: 'list',
        defaultModelsExpandDepth: -1,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
        persistAuthorization: true,
      },
    }),
  );
}
