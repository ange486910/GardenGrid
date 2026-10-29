import { calendarEvents, createCrop, createFrostProfile, createPlanting, createPlot, rotationConflict, sowingWindow } from '../domain/garden.js';
import { ConflictError, NotFoundError, requireDate } from '../domain/validation.js';

export function createGardenService(repository, dependencies = {}) {
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

    window(cropId, profileId) {
      const crop = requireCrop(cropId);
      const profile = requireFrostProfile(profileId);
      return sowingWindow(crop, profile);
    },

    plant(input) {
      const plot = requirePlot(input?.plotId);
      const crop = requireCrop(input?.cropId);
      const plantedOn = requireDate(input?.plantedOn, 'plantedOn');
      const conflict = rotationConflict({
        crop,
        plotId: plot.id,
        plantings: repository.listPlantings(),
        crops: repository.listCrops(),
        plantedOn
      });
      if (conflict) throw new ConflictError(`rotation conflict: ${crop.family} was planted in ${plot.name} within three years`, { plotId: plot.id, cropId: crop.id, family: crop.family });
      return repository.createPlanting(createPlanting({ ...input, plotId: plot.id }, crop, dependencies));
    },

    calendar(from, to) {
      const start = requireDate(from, 'from');
      const end = requireDate(to, 'to');
      if (end < start) throw new ConflictError('to must not precede from', { from: start, to: end });
      return calendarEvents({ plantings: repository.listPlantings(), crops: repository.listCrops(), plots: repository.listPlots(), from: start, to: end });
    }
  };
}
