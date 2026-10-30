import { createServer as createHttpServer } from 'node:http';
import { NotFoundError } from '../domain/validation.js';

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body)
  });
  response.end(body);
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function toEnvelope(error) {
  if (error instanceof NotFoundError) {
    return { status: 404, body: { error: { code: 'not_found', message: error.message } } };
  }
  if (error?.name === 'ValidationError') {
    return { status: 400, body: { error: { code: 'validation_error', message: error.message, details: error.details ?? null } } };
  }
  if (error?.name === 'ConflictError') {
    return { status: 409, body: { error: { code: 'conflict', message: error.message, details: error.details ?? null } } };
  }
  return { status: 500, body: { error: { code: 'internal_error', message: 'Unexpected error' } } };
}

export function createApiServer(service) {
  return createHttpServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const method = request.method;
    try {
      if (method === 'GET' && url.pathname === '/api/v1/health') {
        return sendJson(response, 200, { data: { status: 'ok' } });
      }
      if (method === 'GET' && url.pathname === '/api/v1/plots') {
        return sendJson(response, 200, { data: service.listPlots() });
      }
      if (method === 'POST' && url.pathname === '/api/v1/plots') {
        return sendJson(response, 201, { data: service.createPlot(await readJson(request)) });
      }
      if (method === 'GET' && url.pathname === '/api/v1/crops') {
        return sendJson(response, 200, { data: service.listCrops() });
      }
      if (method === 'POST' && url.pathname === '/api/v1/crops') {
        return sendJson(response, 201, { data: service.createCrop(await readJson(request)) });
      }
      if (method === 'GET' && url.pathname === '/api/v1/frost-profiles') {
        return sendJson(response, 200, { data: service.listFrostProfiles() });
      }
      if (method === 'POST' && url.pathname === '/api/v1/frost-profiles') {
        return sendJson(response, 201, { data: service.createFrostProfile(await readJson(request)) });
      }

      const windowMatch = url.pathname.match(/^\/api\/v1\/frost-profiles\/([^/]+)\/windows\/([^/]+)$/);
      if (windowMatch && method === 'GET') {
        const profileId = decodeURIComponent(windowMatch[1]);
        const cropId = decodeURIComponent(windowMatch[2]);
        return sendJson(response, 200, { data: service.window(cropId, profileId) });
      }
      const successionMatch = url.pathname.match(/^\/api\/v1\/frost-profiles\/([^/]+)\/succession\/([^/]+)$/);
      if (successionMatch && method === 'GET') {
        const profileId = decodeURIComponent(successionMatch[1]);
        const cropId = decodeURIComponent(successionMatch[2]);
        const count = url.searchParams.get('count');
        const intervalDays = url.searchParams.get('intervalDays');
        return sendJson(response, 200, {
          data: service.successionPlan(
            cropId,
            profileId,
            count === null ? undefined : Number(count),
            intervalDays === null ? undefined : Number(intervalDays)
          )
        });
      }

      if (method === 'GET' && url.pathname === '/api/v1/plantings') {
        return sendJson(response, 200, { data: service.listPlantings() });
      }
      if (method === 'POST' && url.pathname === '/api/v1/plantings') {
        return sendJson(response, 201, { data: service.plant(await readJson(request)) });
      }
      if (method === 'GET' && url.pathname === '/api/v1/harvests') {
        return sendJson(response, 200, { data: service.listHarvests() });
      }
      if (method === 'POST' && url.pathname === '/api/v1/harvests') {
        return sendJson(response, 201, { data: service.recordHarvest(await readJson(request)) });
      }
      if (method === 'GET' && url.pathname === '/api/v1/rotation-events') {
        return sendJson(response, 200, { data: service.listRotationEvents() });
      }
      if (method === 'POST' && url.pathname === '/api/v1/rotation-events') {
        return sendJson(response, 201, { data: service.recordRotation(await readJson(request)) });
      }
      if (method === 'GET' && url.pathname === '/api/v1/rotation-report') {
        return sendJson(response, 200, { data: service.rotationReport(url.searchParams.get('asOf')) });
      }
      if (method === 'GET' && url.pathname === '/api/v1/companions') {
        return sendJson(response, 200, { data: service.companionReport() });
      }
      if (method === 'GET' && url.pathname === '/api/v1/yield') {
        return sendJson(response, 200, { data: service.yieldReport() });
      }
      if (method === 'GET' && url.pathname === '/api/v1/calendar') {
        return sendJson(response, 200, {
          data: service.calendar(url.searchParams.get('from'), url.searchParams.get('to'))
        });
      }
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
