import { calendarEvents, createCrop, createFrostProfile, createHarvest, createPlanting, createPlot, sowingWindow, yieldSummary } from '../domain/garden.js';
import { findCompanionIssues } from '../domain/companion-matcher.js';
import { createRotationEvent, hasRecentFamilyConflict, rotationReport } from '../domain/rotation-history.js';
import { ConflictError, NotFoundError, requireDate } from '../domain/validation.js';

export function createGardenService(repository, dependencies = {}) {
  const run = dependencies.transaction ?? ((work) => work());
  function requirePlot(id) {
    const plot = repository.findPlot(id);
    if (!plot) throw new NotFoundError('plot', id);
    return plot;
  }
  function requireFrostProfile(id) {
    const profile = repository.findFrostProfile(id);
    if (!profile) throw new NotFoundError('frost profile', id);
    return profile;
  }
  function requireCrop(id) {
    const crop = repository.findCrop(id);
    if (!crop) throw new NotFoundError('crop', id);
    return crop;
  }

  return {
    listPlots() { return repository.listPlots(); },
    createPlot(input) { return repository.createPlot(createPlot(input, dependencies)); },
    listFrostProfiles() { return repository.listFrostProfiles(); },
    createFrostProfile(input) { return repository.createFrostProfile(createFrostProfile(input, dependencies)); },
    listCrops() { return repository.listCrops(); },
    createCrop(input) { return repository.createCrop(createCrop(input, dependencies)); },
    listPlantings() { return repository.listPlantings(); },
    listHarvests() { return repository.listHarvests(); },
    listRotationEvents() { return repository.listRotationEvents(); },

    recordHarvest(input) {
      const harvest = createHarvest(input, dependencies);
      const planting = repository.listPlantings().find((entry) => entry.id === harvest.plantingId);
      if (!planting) throw new NotFoundError('planting', harvest.plantingId);
      return repository.createHarvest(harvest);
    },

    companionReport() {
      return { findings: findCompanionIssues({ plantings: repository.listPlantings(), crops: repository.listCrops(), plots: repository.listPlots() }) };
    },

    yieldReport() {
      return yieldSummary({ harvests: repository.listHarvests(), plantings: repository.listPlantings(), crops: repository.listCrops() });
    },

    window(cropId, profileId) {
      const crop = requireCrop(cropId);
      const profile = requireFrostProfile(profileId);
      return sowingWindow(crop, profile);
    },

    plant(input) {
      const plot = requirePlot(input?.plotId);
      const crop = requireCrop(input?.cropId);
      const plantedOn = requireDate(input?.plantedOn, 'plantedOn');
      const conflict = hasRecentFamilyConflict({
        crop,
        plotId: plot.id,
        events: repository.listRotationEvents(),
        plantedOn
      });
      if (conflict) throw new ConflictError(`rotation conflict: ${crop.family} was planted in ${plot.name} within three years`, { plotId: plot.id, cropId: crop.id, family: crop.family });
      return run(() => {
        const planting = repository.createPlanting(createPlanting({ ...input, plotId: plot.id }, crop, dependencies));
        const event = createRotationEvent({ plotId: plot.id, cropId: crop.id, plantedOn: planting.plantedOn }, crop, dependencies);
        repository.createRotationEvent(event);
        return planting;
      });
    },

    recordRotation(input) {
      const plot = requirePlot(input?.plotId);
      const crop = requireCrop(input?.cropId);
      const event = createRotationEvent({ ...input, plotId: plot.id, cropId: crop.id }, crop, dependencies);
      const duplicate = repository.listRotationEvents().some((entry) => (
        entry.plotId === event.plotId && entry.cropId === event.cropId && entry.plantedOn === event.plantedOn
      ));
      if (duplicate) {
        throw new ConflictError('rotation event already exists for this plot, crop and planting date', {
          plotId: event.plotId,
          cropId: event.cropId,
          plantedOn: event.plantedOn
        });
      }
      return repository.createRotationEvent(event);
    },

    rotationReport(asOf) {
      return rotationReport({
        plots: repository.listPlots(),
        crops: repository.listCrops(),
        events: repository.listRotationEvents(),
        asOf: requireDate(asOf, 'asOf')
      });
    },

    calendar(from, to) {
      const start = requireDate(from, 'from');
      const end = requireDate(to, 'to');
      if (end < start) throw new ConflictError('to must not precede from', { from: start, to: end });
      return calendarEvents({ plantings: repository.listPlantings(), crops: repository.listCrops(), plots: repository.listPlots(), from: start, to: end });
    }
  };
}
