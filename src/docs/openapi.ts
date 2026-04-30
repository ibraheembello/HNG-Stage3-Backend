import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const definition: swaggerJsdoc.OAS3Definition = {
  openapi: '3.0.3',
  info: {
    title: 'Insighta Labs+ API',
    version: '1.0.0',
    description: `
**Insighta Labs+** — Profile Intelligence System backend (HNG Stage 3).

A secure, multi-interface API for collecting and analyzing demographic profile data with GitHub OAuth + PKCE authentication, role-based access control (admin/analyst), refresh-token rotation, CSRF protection, and CSV export.

### Authentication flows
- **Web** — Browser → \`GET /auth/github\` → GitHub authorize → \`/auth/github/callback\` → HTTP-only cookies set, redirect to portal.
- **CLI** — CLI generates PKCE pair, calls \`POST /auth/github\` with \`code_challenge\`, opens browser, completes via \`POST /auth/github/cli/exchange\` with \`code_verifier\`.
- **Bearer** — Use the returned \`access_token\` as \`Authorization: Bearer <token>\` on protected routes.

### Token lifetimes (per TRD)
- Access token (JWT, HS256): **3 minutes**.
- Refresh token (opaque, SHA-256 hashed in DB): **5 minutes**, rotated on every use.

### Required headers on protected routes
- \`Authorization: Bearer <access_token>\` *(or HTTP-only cookie)*
- \`X-API-Version: 1\` *(on \`/api/v1/*\`)*
- \`X-CSRF-Token: <token>\` *(on cookie-authenticated mutating requests — get one from \`/auth/csrf\`)*

### Rate limits
- Auth endpoints: **5 requests/min**
- Protected endpoints: **60 requests/min** (per-user)
    `.trim(),
    contact: {
      name: 'Ibraheem Bello',
      url: 'https://github.com/ibraheembello',
    },
    license: {
      name: 'MIT',
    },
  },
  servers: [
    {
      url: 'https://pep3ec3gaj.us-east-1.awsapprunner.com',
      description: 'Production (AWS App Runner)',
    },
    {
      url: 'https://insighta-web-eta.vercel.app',
      description: 'Production (Vercel proxy → App Runner)',
    },
    {
      url: 'http://localhost:8787',
      description: 'Local development',
    },
  ],
  tags: [
    { name: 'Auth', description: 'OAuth login, token refresh, session management' },
    { name: 'Profiles', description: 'Profile CRUD, search, export (RBAC-protected)' },
    { name: 'Users', description: 'User directory and role management (admin only)' },
    { name: 'Health', description: 'Liveness probes' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Paste an access_token returned from `/auth/github/callback`, `/auth/refresh`, or `/auth/login`.',
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'access_token',
        description: 'HTTP-only cookie set by the web flow (browser sends automatically).',
      },
      csrfHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'X-CSRF-Token',
        description:
          'Required on mutating requests when using cookie auth. Fetch from `GET /auth/csrf`.',
      },
      apiVersion: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Version',
        description: "Must be `1` on /api/v1/* routes.",
      },
    },
    schemas: {
      ErrorEnvelope: {
        type: 'object',
        required: ['status', 'message', 'code', 'error'],
        properties: {
          status: { type: 'string', enum: ['error'], example: 'error' },
          message: { type: 'string', example: 'Invalid input' },
          code: { type: 'string', example: 'UNPROCESSABLE_ENTITY' },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'UNPROCESSABLE_ENTITY' },
              message: { type: 'string', example: 'Invalid input' },
              details: { nullable: true, example: null },
            },
          },
        },
      },
      PaginationLinks: {
        type: 'object',
        properties: {
          self: { type: 'string', example: '/api/v1/profiles?page=2&limit=20' },
          first: { type: 'string', example: '/api/v1/profiles?page=1&limit=20' },
          prev: { type: 'string', nullable: true, example: '/api/v1/profiles?page=1&limit=20' },
          next: { type: 'string', nullable: true, example: '/api/v1/profiles?page=3&limit=20' },
          last: { type: 'string', example: '/api/v1/profiles?page=10&limit=20' },
        },
      },
      Profile: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '7a3f8c1e-1c2d-4b6a-9e5f-2c1a8d4f7b9e' },
          name: { type: 'string', example: 'Adaeze' },
          gender: { type: 'string', enum: ['male', 'female'], example: 'female' },
          gender_probability: { type: 'number', minimum: 0, maximum: 1, example: 0.97 },
          age: { type: 'integer', example: 28 },
          age_group: {
            type: 'string',
            enum: ['child', 'teenager', 'adult', 'senior'],
            example: 'adult',
          },
          country_id: { type: 'string', example: 'NG', description: 'ISO 3166-1 alpha-2' },
          country_name: { type: 'string', example: 'Nigeria' },
          country_probability: { type: 'number', minimum: 0, maximum: 1, example: 0.92 },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      CreateProfileInput: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', example: 'Adaeze' },
          gender: { type: 'string', enum: ['male', 'female'], example: 'female' },
          gender_probability: { type: 'number', minimum: 0, maximum: 1, example: 0.97 },
          age: { type: 'integer', example: 28 },
          age_group: {
            type: 'string',
            enum: ['child', 'teenager', 'adult', 'senior'],
            example: 'adult',
          },
          country_id: { type: 'string', example: 'NG' },
          country_name: { type: 'string', example: 'Nigeria' },
          country_probability: { type: 'number', minimum: 0, maximum: 1, example: 0.92 },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          github_id: { type: 'string', example: '12345678' },
          github_username: { type: 'string', example: 'ibraheembello' },
          email: { type: 'string', format: 'email', nullable: true },
          name: { type: 'string', nullable: true },
          avatar_url: { type: 'string', format: 'uri', nullable: true },
          role: { type: 'string', enum: ['admin', 'analyst'], example: 'analyst' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      AuthSuccess: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          message: { type: 'string', example: 'Login successful' },
          access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
          refresh_token: { type: 'string', example: 'rt_a1b2c3d4...' },
          refresh_expires_at: { type: 'string', format: 'date-time' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      PaginatedProfiles: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 150 },
          total_pages: { type: 'integer', example: 8 },
          links: { $ref: '#/components/schemas/PaginationLinks' },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/Profile' },
          },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Missing or invalid authentication',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorEnvelope' },
            example: {
              status: 'error',
              message: 'Authentication required',
              code: 'UNAUTHORIZED',
              error: { code: 'UNAUTHORIZED', message: 'Authentication required', details: null },
            },
          },
        },
      },
      Forbidden: {
        description: 'Authenticated but lacks required role',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorEnvelope' },
            example: {
              status: 'error',
              message: 'Insufficient role',
              code: 'FORBIDDEN',
              error: { code: 'FORBIDDEN', message: 'Insufficient role', details: null },
            },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorEnvelope' },
          },
        },
      },
      Unprocessable: {
        description: 'Validation failed',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorEnvelope' },
          },
        },
      },
      TooManyRequests: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorEnvelope' },
          },
        },
      },
    },
  },
};

const apisGlob = path.join(__dirname, '..', 'modules', '**', '*.routes.{ts,js}');
const appFile = path.join(__dirname, '..', 'app.{ts,js}');

export const openapiSpec = swaggerJsdoc({
  definition,
  apis: [apisGlob, appFile, path.join(__dirname, 'paths', '*.{ts,js}')],
});
