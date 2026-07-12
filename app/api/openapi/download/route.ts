import { NextResponse } from 'next/server';

const PB_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

const FIELD_TYPE_MAP: Record<string, { type: string; format?: string; writeOnly?: boolean }> = {
  text:          { type: 'string' },
  email:         { type: 'string', format: 'email' },
  url:           { type: 'string', format: 'uri' },
  password:      { type: 'string', writeOnly: true },
  editor:        { type: 'string' },
  json:          { type: 'object' },
  number:        { type: 'number' },
  bool:          { type: 'boolean' },
  date:          { type: 'string', format: 'date-time' },
  file:          { type: 'string', format: 'binary' },
  select:        { type: 'string' },
  relation:      { type: 'string' },
  'autocomplete': { type: 'string' },
};

function isSystem(name: string) {
  return name.startsWith('_');
}

// ── JSON field schema overrides for AI consumption ──
// PocketBase JSON fields have no internal schema, so we define known
// structures here so AI tools can understand `items` and other JSON fields.

const JSON_FIELD_OVERRIDES: Record<string, any> = {
  'quotations.items': {
    type: 'array',
    description: 'Quotation line items',
    items: { $ref: '#/components/schemas/QuotationItem' },
  },
  'po.items': {
    type: 'array',
    description: 'Purchase order line items',
    items: { $ref: '#/components/schemas/PoItem' },
  },
  'shipments.items': {
    type: 'array',
    description: 'Shipment line items',
    items: { $ref: '#/components/schemas/ShipmentItem' },
  },
  'so.items': {
    type: 'array',
    description: 'Sales order line items (same structure as quotation items)',
    items: { $ref: '#/components/schemas/QuotationItem' },
  },
  'remittance.items': {
    type: 'array',
    description: 'Remittance bank details',
    items: { $ref: '#/components/schemas/RemittanceItem' },
  },
  'suppliers.capabilities': {
    type: 'array',
    description: 'Manufacturing capabilities (e.g. injection molding, CNC)',
    items: { type: 'string' },
  },
  'suppliers.certifications': {
    type: 'array',
    description: 'Quality certifications (e.g. ISO9001, ISO14001)',
    items: { type: 'string' },
  },
  'products.carton_dimensions': {
    type: 'object',
    description: 'Carton packaging dimensions',
    properties: {
      length: { type: 'number' },
      width: { type: 'number' },
      height: { type: 'number' },
    },
  },
};

// Reusable sub-schemas registered under components/schemas
const JSON_ITEM_SCHEMAS: Record<string, any> = {
  QuotationItem: {
    type: 'object',
    description: 'A single line item in a quotation',
    properties: {
      product_id:  { type: 'string', description: 'Relation to products collection' },
      product_name: { type: 'string' },
      part_number: { type: 'string' },
      quantity:    { type: 'number' },
      unit_price:  { type: 'number' },
      cost_price:  { type: 'number', description: 'Nullable — only set when supplier cost is known' },
      profit_margin: { type: 'number' },
      amount:      { type: 'number', description: 'Computed: quantity × unit_price' },
      remarks:     { type: 'string' },
    },
    required: ['product_id', 'product_name', 'quantity', 'unit_price', 'profit_margin', 'amount'],
  },
  PoItem: {
    type: 'object',
    description: 'A single line item in a purchase order',
    properties: {
      product_id:   { type: 'string' },
      product_name: { type: 'string' },
      part_number:  { type: 'string' },
      quantity:     { type: 'number' },
      unit_price:   { type: 'number' },
      amount:       { type: 'number', description: 'Computed: quantity × unit_price' },
      remarks:      { type: 'string' },
    },
    required: ['product_id', 'product_name', 'quantity', 'unit_price', 'amount'],
  },
  ShipmentItem: {
    type: 'object',
    description: 'A single line item in a shipment',
    properties: {
      product_id:   { type: 'string' },
      product_name: { type: 'string' },
      part_number:  { type: 'string' },
      quantity:     { type: 'number' },
      packages:    { type: 'number' },
      weight:      { type: 'number' },
      volume:      { type: 'number' },
    },
    required: ['product_id', 'product_name', 'quantity', 'packages'],
  },
  RemittanceItem: {
    type: 'object',
    description: 'Bank account details for remittance',
    properties: {
      bank_name:      { type: 'string' },
      account_name:   { type: 'string' },
      account_number: { type: 'string' },
      swift_code:     { type: 'string' },
      currency:       { type: 'string' },
    },
    required: ['bank_name', 'account_name', 'account_number'],
  },
};

function openapiType(field: any) {
  const base = FIELD_TYPE_MAP[field.type] || { type: 'string' };
  if (field.required) return base;
  return { oneOf: [base, { type: 'null' }] };
}

function buildProps(fields: any[], collectionName: string) {
  const props: Record<string, any> = {};
  const required: string[] = [];
  for (const f of fields) {
    const key = `${collectionName}.${f.name}`;
    if (f.type === 'json' && JSON_FIELD_OVERRIDES[key]) {
      props[f.name] = JSON_FIELD_OVERRIDES[key];
    } else {
      props[f.name] = openapiType(f);
    }
    if (f.required) required.push(f.name);
  }
  for (const sf of ['id', 'created', 'updated', 'collectionId', 'collectionName']) {
    if (!props[sf]) props[sf] = { type: 'string' };
  }
  return { props, required };
}

export async function GET() {
  try {
    if (!PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD must be set' },
        { status: 500 }
      );
    }

    // 1. Authenticate as superuser
    const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: PB_ADMIN_EMAIL, password: PB_ADMIN_PASSWORD }),
    });
    if (!authRes.ok) {
      return NextResponse.json(
        { error: 'Superuser authentication failed' },
        { status: 500 }
      );
    }
    const { token } = await authRes.json();

    const headers = { Authorization: `Bearer ${token}` };

    // 2. List collections
    const listRes = await fetch(`${PB_URL}/api/collections?perPage=200`, { headers });
    if (!listRes.ok) {
      return NextResponse.json(
        { error: 'Failed to list collections' },
        { status: 500 }
      );
    }
    const listData: any = await listRes.json();
    const collections = (listData.items || []).filter((c: any) => !isSystem(c.name));

    // 3. Fetch field details per collection
    const fullCollections = [];
    for (const col of collections) {
      const detailRes = await fetch(`${PB_URL}/api/collections/${col.id}`, { headers });
      if (detailRes.ok) {
        fullCollections.push(await detailRes.json());
      } else {
        fullCollections.push(col);
      }
    }

    // 4. Build OpenAPI spec
    const spec: any = {
      openapi: '3.1.0',
      info: {
        title: 'ExportCRM API',
        version: '1.0.0',
        description: `Auto-generated from PocketBase at ${PB_URL}`,
      },
      servers: [{ url: PB_URL }],
      paths: {},
      components: {
        securitySchemes: {
          SuperuserToken: {
            type: 'http',
            scheme: 'bearer',
            description: 'Superuser token from /api/collections/_superusers/auth-with-password',
          },
          UserToken: {
            type: 'http',
            scheme: 'bearer',
            description: 'User token from /api/collections/users/auth-with-password',
          },
        },
        schemas: {},
      },
    };

    for (const col of fullCollections) {
      const name = col.name;
      const schemaName = `pb_${name}`;
      const fields: any[] = col.fields || [];
      const { props, required } = buildProps(fields, name);

      spec.components.schemas[schemaName] = { type: 'object', properties: props };
      if (required.length) spec.components.schemas[schemaName].required = required;

      const base = `/api/collections/${name}/records`;
      const itemBase = `/api/collections/${name}/records/{id}`;
      const security = [{ SuperuserToken: [] }, { UserToken: [] }];

      const listSchema = {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          perPage: { type: 'integer' },
          totalItems: { type: 'integer' },
          totalPages: { type: 'integer' },
          items: { type: 'array', items: { $ref: `#/components/schemas/${schemaName}` } },
        },
      };

      spec.paths[base] = {
        get: {
          summary: `List ${name}`,
          operationId: `list_${name}`,
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'perPage', in: 'query', schema: { type: 'integer', default: 30 } },
            { name: 'sort', in: 'query', schema: { type: 'string' } },
            { name: 'filter', in: 'query', schema: { type: 'string' } },
            { name: 'expand', in: 'query', schema: { type: 'string' } },
            { name: 'fields', in: 'query', schema: { type: 'string' } },
          ],
          security,
          responses: { '200': { description: 'OK', content: { 'application/json': { schema: listSchema } } } },
        },
        post: {
          summary: `Create ${name}`,
          operationId: `create_${name}`,
          security,
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaName}` } } } },
          responses: { '201': { description: 'Created', content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaName}` } } } } },
        },
      };

      spec.paths[itemBase] = {
        get: {
          summary: `Get ${name} by ID`,
          operationId: `get_${name}`,
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'expand', in: 'query', schema: { type: 'string' } },
            { name: 'fields', in: 'query', schema: { type: 'string' } },
          ],
          security,
          responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaName}` } } } } },
        },
        patch: {
          summary: `Update ${name}`,
          operationId: `update_${name}`,
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          security,
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaName}` } } } },
          responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaName}` } } } } },
        },
        delete: {
          summary: `Delete ${name}`,
          operationId: `delete_${name}`,
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          security,
          responses: { '204': { description: 'No Content' } },
        },
      };
    }

    // Register JSON sub-item schemas referenced by field overrides
    for (const [key, schema] of Object.entries(JSON_ITEM_SCHEMAS)) {
      spec.components.schemas[key] = schema;
    }

    // Auth & health endpoints
    spec.paths['/api/collections/_superusers/auth-with-password'] = {
      post: {
        summary: 'Superuser auth',
        operationId: 'superuser_auth',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { identity: { type: 'string' }, password: { type: 'string' } }, required: ['identity', 'password'] } } },
        },
        responses: { '200': { description: 'OK' } },
      },
    };
    spec.paths['/api/collections/users/auth-with-password'] = {
      post: {
        summary: 'User auth',
        operationId: 'user_auth',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { identity: { type: 'string' }, password: { type: 'string' } }, required: ['identity', 'password'] } } },
        },
        responses: { '200': { description: 'OK' } },
      },
    };
    spec.paths['/api/health'] = {
      get: { summary: 'Health check', operationId: 'health', responses: { '200': { description: 'OK' } } },
    };

    const json = JSON.stringify(spec, null, 2);

    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="openapi_${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating OpenAPI spec:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate OpenAPI spec' },
      { status: 500 }
    );
  }
}
