import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Village Data API',
      version: '1.0.0',
      description: `
## India's most comprehensive village-level geographical data API

Provides hierarchical access to **564,159 villages** across 35+ Indian states.
Built for B2B use cases: address enrichment, logistics, government services, fintech KYC.

### Authentication
All geo endpoints require one of:
- **Bearer Token** (Dashboard): \`Authorization: Bearer <jwt>\`
- **API Key** (B2B Clients): \`X-API-Key: ak_xxx\` + \`X-API-Secret: as_xxx\`

### Rate Limits
| Plan | Daily | Burst (per minute) |
|------|-------|-------------------|
| Free | 5,000 | 100 |
| Premium | 50,000 | 500 |
| Pro | 300,000 | 2,000 |
| Unlimited | 1,000,000 | 5,000 |

Rate limit status is returned in every response via \`X-RateLimit-*\` headers.

### Response Caching
Responses are cached in Redis. Check the \`X-Cache\` header:
- \`X-Cache: HIT\` — served from cache (~200ms)
- \`X-Cache: MISS\` — fetched from database (~1200ms)
      `.trim(),
      contact: { name: 'Village API Support', email: 'support@villageapi.in' },
      license: { name: 'Proprietary', url: 'https://villageapi.in/terms' },
    },
    servers: [
      { url: 'http://localhost:3000/v1', description: 'Local Development' },
      { url: 'https://api.villageplatform.in/v1', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT obtained from POST /auth/login',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API public key (ak_xxx)',
        },
        ApiSecretAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Secret',
          description: 'API secret key (as_xxx)',
        },
      },
      schemas: {
        State: {
          type: 'object',
          properties: {
            id:   { type: 'string', format: 'uuid', example: 'cuid_...' },
            name: { type: 'string', example: 'Maharashtra' },
            code: { type: 'string', example: '27' },
          },
        },
        District: {
          type: 'object',
          properties: {
            id:      { type: 'string', format: 'uuid' },
            name:    { type: 'string', example: 'Pune' },
            code:    { type: 'string', example: '230' },
            stateId: { type: 'string', format: 'uuid' },
          },
        },
        SubDistrict: {
          type: 'object',
          properties: {
            id:         { type: 'string', format: 'uuid' },
            name:       { type: 'string', example: 'Haveli' },
            code:       { type: 'string', example: '0002' },
            districtId: { type: 'string', format: 'uuid' },
          },
        },
        Village: {
          type: 'object',
          properties: {
            id:            { type: 'string', format: 'uuid' },
            name:          { type: 'string', example: 'Khed Shivapur' },
            code:          { type: 'string', example: '00123' },
            fullAddress:   { type: 'string', example: 'Khed Shivapur, Haveli, Pune, Maharashtra' },
            subDistrictId: { type: 'string', format: 'uuid' },
            hierarchy: {
              type: 'object',
              properties: {
                state:       { $ref: '#/components/schemas/State' },
                district:    { $ref: '#/components/schemas/District' },
                subDistrict: { $ref: '#/components/schemas/SubDistrict' },
              },
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            count:   { type: 'integer', example: 5 },
            data:    { },
            meta:    { type: 'object', properties: { requestId: { type: 'string' } } },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error:   { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string' } } },
            meta:    { type: 'object', properties: { requestId: { type: 'string' } } },
          },
        },
        PaginatedMeta: {
          type: 'object',
          properties: {
            requestId:  { type: 'string' },
            page:       { type: 'integer', example: 1 },
            limit:      { type: 'integer', example: 100 },
            total:      { type: 'integer', example: 12345 },
            totalPages: { type: 'integer', example: 124 },
          },
        },
      },
    },
    tags: [
      { name: 'Auth',      description: 'Register and login to get a JWT' },
      { name: 'Geo',       description: 'Geographical hierarchy: States → Districts → Sub-Districts → Villages' },
      { name: 'Dashboard', description: 'Your account metrics (JWT required)' },
      { name: 'API Keys',  description: 'Create and manage API keys (JWT required)' },
    ],
    paths: {
      // ─── Auth ────────────────────────────────────────────────────────────
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new business account',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'businessName'],
                  properties: {
                    email:        { type: 'string', format: 'email', example: 'admin@acme.com' },
                    password:     { type: 'string', minLength: 8, example: 'SecurePass123!' },
                    businessName: { type: 'string', example: 'Acme Corp' },
                    phone:        { type: 'string', example: '+91 98765 43210' },
                    gstNumber:    { type: 'string', example: '22AAAAA0000A1Z5' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Account created', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            '409': { description: 'Email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login and get a JWT',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email:    { type: 'string', format: 'email', example: 'admin@acme.com' },
                    password: { type: 'string', example: 'SecurePass123!' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Login successful',
              content: {
                'application/json': {
                  example: { success: true, data: { token: 'eyJhbGci...', user: { id: 'uuid', email: 'admin@acme.com', planType: 'Free', role: 'USER' } } },
                },
              },
            },
            '401': { description: 'Invalid credentials' },
          },
        },
      },
      // ─── Geo ─────────────────────────────────────────────────────────────
      '/geo/states': {
        get: {
          tags: ['Geo'],
          summary: 'List all states',
          description: 'Returns all 35+ Indian states. Cached for 1 hour.',
          security: [{ BearerAuth: [] }, { ApiKeyAuth: [], ApiSecretAuth: [] }],
          responses: {
            '200': {
              description: 'List of states',
              headers: { 'X-Cache': { schema: { type: 'string', enum: ['HIT', 'MISS'] } } },
              content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { data: { type: 'array', items: { $ref: '#/components/schemas/State' } } } }] } } },
            },
          },
        },
      },
      '/geo/states/{stateId}/districts': {
        get: {
          tags: ['Geo'],
          summary: 'List districts in a state',
          description: 'Cached for 1 hour.',
          security: [{ BearerAuth: [] }, { ApiKeyAuth: [], ApiSecretAuth: [] }],
          parameters: [{ name: 'stateId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Districts list' }, '404': { description: 'State not found' } },
        },
      },
      '/geo/districts/{districtId}/sub-districts': {
        get: {
          tags: ['Geo'],
          summary: 'List sub-districts in a district',
          security: [{ BearerAuth: [] }, { ApiKeyAuth: [], ApiSecretAuth: [] }],
          parameters: [{ name: 'districtId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Sub-districts list' } },
        },
      },
      '/geo/sub-districts/{subDistrictId}/villages': {
        get: {
          tags: ['Geo'],
          summary: 'List villages in a sub-district (paginated)',
          security: [{ BearerAuth: [] }, { ApiKeyAuth: [], ApiSecretAuth: [] }],
          parameters: [
            { name: 'subDistrictId', in: 'path',  required: true,  schema: { type: 'string', format: 'uuid' } },
            { name: 'page',          in: 'query', required: false, schema: { type: 'integer', default: 1 } },
            { name: 'limit',         in: 'query', required: false, schema: { type: 'integer', default: 100, maximum: 500 }, description: 'Max 500 per page' },
          ],
          responses: {
            '200': {
              description: 'Paginated village list',
              content: {
                'application/json': {
                  schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { meta: { $ref: '#/components/schemas/PaginatedMeta' }, data: { type: 'array', items: { $ref: '#/components/schemas/Village' } } } }] },
                },
              },
            },
          },
        },
      },
      '/geo/villages/search': {
        get: {
          tags: ['Geo'],
          summary: 'Search villages by name',
          description: 'GIN trigram full-text search across 564,159 villages. Cached 5 min.',
          security: [{ BearerAuth: [] }, { ApiKeyAuth: [], ApiSecretAuth: [] }],
          parameters: [
            { name: 'q',           in: 'query', required: true,  schema: { type: 'string', minLength: 2 }, description: 'Village name (min 2 chars)', example: 'Khed' },
            { name: 'state',       in: 'query', required: false, schema: { type: 'string', format: 'uuid' }, description: 'Filter by state ID' },
            { name: 'district',    in: 'query', required: false, schema: { type: 'string', format: 'uuid' }, description: 'Filter by district ID' },
            { name: 'subdistrict', in: 'query', required: false, schema: { type: 'string', format: 'uuid' }, description: 'Filter by sub-district ID' },
            { name: 'limit',       in: 'query', required: false, schema: { type: 'integer', default: 20, maximum: 100 } },
          ],
          responses: {
            '200': { description: 'Matching villages with full hierarchy' },
            '400': { description: 'Query too short (min 2 chars)' },
          },
        },
      },
      '/geo/villages/autocomplete': {
        get: {
          tags: ['Geo'],
          summary: 'Autocomplete village names',
          description: 'Optimised for low-latency typeahead. Returns up to 20 name suggestions. Cached 5 min.',
          security: [{ BearerAuth: [] }, { ApiKeyAuth: [], ApiSecretAuth: [] }],
          parameters: [
            { name: 'q',     in: 'query', required: true,  schema: { type: 'string', minLength: 2 }, example: 'Mum' },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 10, maximum: 20 } },
          ],
          responses: { '200': { description: 'Village name suggestions' } },
        },
      },
      '/geo/villages/{id}': {
        get: {
          tags: ['Geo'],
          summary: 'Get a village by ID',
          description: 'Returns full village detail with state → district → sub-district hierarchy. Cached 30 min.',
          security: [{ BearerAuth: [] }, { ApiKeyAuth: [], ApiSecretAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': { description: 'Village detail', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { data: { $ref: '#/components/schemas/Village' } } }] } } } },
            '404': { description: 'Village not found' },
          },
        },
      },
      // ─── Dashboard ───────────────────────────────────────────────────────
      '/dashboard/metrics': {
        get: {
          tags: ['Dashboard'],
          summary: 'Get your usage metrics',
          security: [{ BearerAuth: [] }],
          responses: {
            '200': { description: 'Your API key count, total requests, monthly limit' },
            '401': { description: 'Unauthorized' },
          },
        },
      },
      // ─── API Keys ────────────────────────────────────────────────────────
      '/keys': {
        get: {
          tags: ['API Keys'],
          summary: 'List your API keys',
          security: [{ BearerAuth: [] }],
          responses: { '200': { description: 'Your active and revoked keys' } },
        },
        post: {
          tags: ['API Keys'],
          summary: 'Create a new API key',
          description: '⚠️ The secret (`as_xxx`) is only returned **once** at creation time. Store it securely.',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string', example: 'Production Key' } } } } },
          },
          responses: { '200': { description: 'Key and one-time secret returned' } },
        },
      },
      '/keys/{id}/revoke': {
        patch: {
          tags: ['API Keys'],
          summary: 'Revoke an API key',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Key revoked' }, '404': { description: 'Key not found' } },
        },
      },
    },
  },
  apis: [],   // all definitions are inline above
};

export const swaggerSpec = swaggerJsdoc(options);
