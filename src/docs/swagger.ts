import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openapiSpec } from './openapi';

const customCss = `
  .swagger-ui .topbar { background-color: #0b1220; padding: 14px 20px; }
  .swagger-ui .topbar .topbar-wrapper .link { content: "Insighta Labs+"; }
  .swagger-ui .info .title { color: #0b1220; }
  .swagger-ui .info .title small.version-stamp { background: #2563eb; }
  .swagger-ui .scheme-container { background: #f8fafc; box-shadow: none; }
  .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #2563eb; }
  .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #16a34a; }
  .swagger-ui .opblock.opblock-patch .opblock-summary-method { background: #f59e0b; }
  .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #dc2626; }
  .swagger-ui .btn.authorize { background: #0b1220; color: #fff; border-color: #0b1220; }
  .swagger-ui .btn.authorize svg { fill: #fff; }
`;

const swaggerOptions: swaggerUi.SwaggerUiOptions = {
  customCss,
  customSiteTitle: 'Insighta Labs+ API Docs',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 2,
  },
};

export const docsRouter = Router();

docsRouter.get('/openapi.json', (_req: Request, res: Response) => {
  res.json(openapiSpec);
});

docsRouter.use('/', swaggerUi.serveFiles(openapiSpec, swaggerOptions), swaggerUi.setup(openapiSpec, swaggerOptions));
