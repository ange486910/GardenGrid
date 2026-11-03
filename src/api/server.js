import { createServer as createHttpServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { NotFoundError } from '../domain/validation.js';
import { readGardenAsset } from '../web/asset-store.js';

const WEB_ROOT = fileURLToPath(new URL('../web/public/', import.meta.url));

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body)
  });
  response.end(body);
}

function sendDownload(response, contentType, filename, body) {
  response.writeHead(200, {
    'content-type': contentType,
    'content-length': Buffer.byteLength(body),
    'content-disposition': `attachment; filename="${filename}"`
  });
  response.end(body);
}

function sendGardenAsset(request, response, asset) {
  if (request.headers['if-none-match'] === asset.etag) {
    response.writeHead(304, { etag: asset.etag });
    response.end();
    return;
  }
  response.writeHead(200, {
    'content-type': asset.contentType,
    'content-length': asset.size,
    etag: asset.etag,
    'cache-control': 'no-cache'
  });
  response.end(asset.body);
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

export function createApiServer(service, options = {}) {
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
      if (method === 'PATCH' && url.pathname === '/api/v1/plots/order') {
        const body = await readJson(request);
        return sendJson(response, 200, { data: service.reorderPlots(body.plotIds) });
      }
      if (method === 'GET' && url.pathname === '/api/v1/rest-periods') {
        return sendJson(response, 200, { data: service.listRestPeriods(url.searchParams.get('plotId') ?? undefined) });
      }
      if (method === 'POST' && url.pathname === '/api/v1/rest-periods') {
        return sendJson(response, 201, { data: service.recordRestPeriod(await readJson(request)) });
      }
      if (method === 'GET' && url.pathname === '/api/v1/crops') {
        return sendJson(response, 200, { data: service.listCrops() });
      }
      if (method === 'POST' && url.pathname === '/api/v1/crops') {
        return sendJson(response, 201, { data: service.createCrop(await readJson(request)) });
      }
      const cropArchiveMatch = url.pathname.match(/^\/api\/v1\/crops\/([^/]+)\/(archive|restore)$/);
      if (cropArchiveMatch && method === 'POST') {
        const cropId = decodeURIComponent(cropArchiveMatch[1]);
        const action = cropArchiveMatch[2];
        return sendJson(response, 200, {
          data: action === 'archive' ? service.archiveCrop(cropId) : service.restoreCrop(cropId)
        });
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

      if (method === 'POST' && url.pathname === '/api/v1/plantings/succession') {
        return sendJson(response, 201, { data: service.createSuccession(await readJson(request)) });
      }
      if (method === 'GET' && url.pathname === '/api/v1/succession-batches') {
        return sendJson(response, 200, { data: service.listSuccessionBatches() });
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
      if (method === 'GET' && url.pathname === '/api/v1/harvest-targets') {
        return sendJson(response, 200, { data: service.listHarvestTargets(url.searchParams.get('season') ?? undefined) });
      }
      if (method === 'POST' && url.pathname === '/api/v1/harvest-targets') {
        return sendJson(response, 201, { data: service.setHarvestTarget(await readJson(request)) });
      }
      if (method === 'GET' && url.pathname === '/api/v1/harvest-targets/report') {
        return sendJson(response, 200, { data: service.harvestTargetReport(url.searchParams.get('season')) });
      }
      if (method === 'POST' && url.pathname === '/api/v1/harvests') {
        return sendJson(response, 201, { data: service.recordHarvest(await readJson(request)) });
      }
      const harvestMatch = url.pathname.match(/^\/api\/v1\/harvests\/([^/]+)$/);
      if (harvestMatch && method === 'PATCH') {
        return sendJson(response, 200, { data: service.correctHarvest(decodeURIComponent(harvestMatch[1]), await readJson(request)) });
      }
      if (harvestMatch && method === 'DELETE') {
        return sendJson(response, 200, { data: service.deleteHarvest(decodeURIComponent(harvestMatch[1])) });
      }
      if (method === 'GET' && url.pathname === '/api/v1/harvest-revisions') {
        return sendJson(response, 200, { data: service.listHarvestRevisions() });
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
      if (method === 'GET' && url.pathname === '/api/v1/companion-rules') {
        return sendJson(response, 200, { data: service.listCompanionRules() });
      }
      if (method === 'POST' && url.pathname === '/api/v1/companion-rules') {
        return sendJson(response, 201, { data: service.createCompanionRule(await readJson(request)) });
      }
      const companionRuleMatch = url.pathname.match(/^\/api\/v1\/companion-rules\/([^/]+)$/);
      if (companionRuleMatch && method === 'PATCH') {
        return sendJson(response, 200, { data: service.updateCompanionRule(decodeURIComponent(companionRuleMatch[1]), await readJson(request)) });
      }
      if (companionRuleMatch && method === 'DELETE') {
        return sendJson(response, 200, { data: service.deleteCompanionRule(decodeURIComponent(companionRuleMatch[1])) });
      }
      if (method === 'GET' && url.pathname === '/api/v1/yield') {
        const plotId = url.searchParams.get('plotId');
        return sendJson(response, 200, { data: plotId ? service.yieldByPlot(plotId) : service.yieldReport() });
      }
      if (method === 'GET' && url.pathname === '/api/v1/exports/season') {
        const result = service.exportSeason(url.searchParams.get('format') ?? 'json');
        if (result.format === 'csv') {
          return sendDownload(response, result.contentType, result.filename, result.body);
        }
        return sendJson(response, 200, result.body);
      }
      if (method === 'POST' && url.pathname === '/api/v1/imports/season') {
        const body = await readJson(request);
        return sendJson(response, 200, {
          data: service.importSeason(body.snapshot, {
            dryRun: body.dryRun === true,
            resolutions: body.resolutions,
            previewToken: body.previewToken
          })
        });
      }
      if (method === 'GET' && url.pathname === '/api/v1/backup') {
        return sendJson(response, 200, { data: service.exportBackup() });
      }
      if (method === 'POST' && url.pathname === '/api/v1/restore') {
        const body = await readJson(request);
        return sendJson(response, 200, { data: service.restoreBackup(body.backup ?? body) });
      }
      if (method === 'GET' && url.pathname === '/api/v1/calendar') {
        return sendJson(response, 200, {
          data: service.calendar(url.searchParams.get('from'), url.searchParams.get('to'), url.searchParams.get('plotId') ?? null)
        });
      }
      if (method === 'GET' && !url.pathname.startsWith('/api/')) {
        const asset = await readGardenAsset(options.webRoot ?? WEB_ROOT, url.pathname);
        if (asset) return sendGardenAsset(request, response, asset);
      }
      throw new NotFoundError('route', url.pathname);
    } catch (error) {
      const envelope = toEnvelope(error);
      sendJson(response, envelope.status, envelope.body);
    }
  });
}

export function startServer(service, options = {}) {
  const server = createApiServer(service, options);
  return new Promise((resolve) => server.listen(options.port ?? 0, options.host ?? '127.0.0.1', () => resolve(server)));
}
