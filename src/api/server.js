import { createServer as createHttpServer } from 'node:http';
import { NotFoundError } from '../domain/validation.js';

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body) });
  response.end(body);
}
async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function toEnvelope(error) {
  if (error instanceof NotFoundError) return { status: 404, body: { error: { code: 'not_found', message: error.message } } };
  if (error?.name === 'ValidationError') return { status: 400, body: { error: { code: 'validation_error', message: error.message, details: error.details ?? null } } };
  if (error?.name === 'ConflictError') return { status: 409, body: { error: { code: 'conflict', message: error.message, details: error.details ?? null } } };
  return { status: 500, body: { error: { code: 'internal_error', message: 'Unexpected error' } } };
}

export function createApiServer(service) {
  return createHttpServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    try {
      if (request.method === 'GET' && url.pathname === '/api/v1/health') return sendJson(response, 200, { data: { status: 'ok' } });
      if (url.pathname === '/api/v1/plots' && request.method === 'GET') return sendJson(response, 200, { data: service.listPlots() });
      if (url.pathname === '/api/v1/plots' && request.method === 'POST') return sendJson(response, 201, { data: service.createPlot(await readJson(request)) });
      if (url.pathname === '/api/v1/frost-profiles' && request.method === 'GET') return sendJson(response, 200, { data: service.listFrostProfiles() });
      if (url.pathname === '/api/v1/frost-profiles' && request.method === 'POST') return sendJson(response, 201, { data: service.createFrostProfile(await readJson(request)) });
      const windowMatch = url.pathname.match(/^\/api\/v1\/frost-profiles\/([^/]+)\/windows\/([^/]+)$/);
      if (windowMatch && request.method === 'GET') return sendJson(response, 200, { data: service.window(decodeURIComponent(windowMatch[2]), decodeURIComponent(windowMatch[1])) });
      if (url.pathname === '/api/v1/crops' && request.method === 'GET') return sendJson(response, 200, { data: service.listCrops() });
      if (url.pathname === '/api/v1/crops' && request.method === 'POST') return sendJson(response, 201, { data: service.createCrop(await readJson(request)) });
      if (url.pathname === '/api/v1/plantings' && request.method === 'GET') return sendJson(response, 200, { data: service.listPlantings() });
      if (url.pathname === '/api/v1/plantings' && request.method === 'POST') return sendJson(response, 201, { data: service.plant(await readJson(request)) });
      if (url.pathname === '/api/v1/calendar' && request.method === 'GET') return sendJson(response, 200, { data: service.calendar(url.searchParams.get('from'), url.searchParams.get('to')) });
      throw new NotFoundError('route', url.pathname);
    } catch (error) {
      const envelope = toEnvelope(error);
      sendJson(response, envelope.status, envelope.body);
    }
  });
}

export function startServer(service, options = {}) {
  const server = createApiServer(service);
  return new Promise((resolve) => server.listen(options.port ?? 0, options.host ?? '127.0.0.1', () => resolve(server)));
}
