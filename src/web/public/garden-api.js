export class GardenApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'GardenApiError';
    this.status = status;
    this.code = code;
  }
}

export function createGardenApi(fetchImpl = globalThis.fetch) {
  async function request(path, options = {}) {
    const response = await fetchImpl(path, {
      ...options,
      headers: {
        accept: 'application/json',
        ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(options.headers ?? {})
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
      throw new GardenApiError(payload?.error?.message ?? 'Request failed', response.status, payload?.error?.code ?? 'request_failed');
    }
    return payload?.data ?? payload;
  }

  return {
    plots: () => request('/api/v1/plots'),
    reorderPlots: (plotIds) => request('/api/v1/plots/order', { method: 'PATCH', body: { plotIds } }),
    crops: () => request('/api/v1/crops'),
    plantings: () => request('/api/v1/plantings'),
    harvests: () => request('/api/v1/harvests'),
    frostProfiles: () => request('/api/v1/frost-profiles'),
    companions: () => request('/api/v1/companions'),
    yields: (plotId) => request(`/api/v1/yield${plotId ? `?plotId=${encodeURIComponent(plotId)}` : ''}`),
    plant: (body) => request('/api/v1/plantings', { method: 'POST', body }),
    recordHarvest: (body) => request('/api/v1/harvests', { method: 'POST', body }),
    succession: (profileId, cropId, count, intervalDays) => request(
      `/api/v1/frost-profiles/${encodeURIComponent(profileId)}/succession/${encodeURIComponent(cropId)}?count=${count}&intervalDays=${intervalDays}`
    )
  };
}
