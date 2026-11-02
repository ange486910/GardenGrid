import { calendarEvents, createCrop, createFrostProfile, createHarvest, createPlanting, createPlot, sowingWindow, successionSchedule, validateHarvestInput, yieldSummary } from '../domain/garden.js';
import { findCompanionIssues } from '../domain/companion-matcher.js';
import { COMPANION_RULES, validateCompanionRule } from '../domain/companions.js';
import { createRotationEvent, hasRecentFamilyConflict, rotationReport } from '../domain/rotation-history.js';
import { findPlotOverlap, successionPlantingDrafts } from '../domain/succession-planting.js';
import { createRestPeriod, findRestConflict } from '../domain/rest-period.js';
import { yieldByPlot as projectYieldByPlot } from '../domain/season-analytics.js';
import { buildSeasonExport, seasonPlantingsCsv } from '../domain/season-export.js';
import { analyzeSeasonImport, validateSeasonImport } from '../domain/season-import.js';
import { buildGardenBackup, validateGardenBackup } from '../domain/backup.js';
import { ConflictError, NotFoundError, ValidationError, requireDate } from '../domain/validation.js';

export function createGardenService(repository, dependencies = {}) {
  const run = dependencies.transaction ?? ((work) => work());
  const clock = dependencies.clock ?? { now: () => new Date() };
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
    archiveCrop(id) {
      const crop = requireCrop(id);
      if (crop.archivedAt) throw new ConflictError('crop is already archived', { cropId: id });
      repository.setCropArchived(id, clock.now().toISOString());
      return repository.findCrop(id);
    },
    restoreCrop(id) {
      const crop = requireCrop(id);
      if (!crop.archivedAt) throw new ConflictError('crop is not archived', { cropId: id });
      repository.setCropArchived(id, null);
      return repository.findCrop(id);
    },
    listPlantings() { return repository.listPlantings(); },
    listHarvests() { return repository.listHarvests(); },
    listRotationEvents() { return repository.listRotationEvents(); },
    listRestPeriods(plotId) { return plotId ? repository.listRestPeriodsByPlot(plotId) : repository.listRestPeriods(); },
    listSuccessionBatches() { return repository.listSuccessionBatches(); },

    recordHarvest(input) {
      const harvest = createHarvest(input, dependencies);
      const planting = repository.listPlantings().find((entry) => entry.id === harvest.plantingId);
      if (!planting) throw new NotFoundError('planting', harvest.plantingId);
      return repository.createHarvest(harvest);
    },

    listHarvestRevisions() { return repository.listHarvestRevisions(); },

    correctHarvest(id, patch) {
      const current = repository.findHarvest(id);
      if (!current) throw new NotFoundError('harvest', id);
      const next = validateHarvestInput({
        plantingId: patch?.plantingId ?? current.plantingId,
        harvestedOn: patch?.harvestedOn ?? current.harvestedOn,
        quantity: patch?.quantity ?? current.quantity,
        unit: patch?.unit ?? current.unit
      });
      const planting = repository.listPlantings().find((entry) => entry.id === next.plantingId);
      if (!planting) throw new NotFoundError('planting', next.plantingId);
      return run(() => {
        const updated = repository.updateHarvest({ ...current, ...next });
        repository.createHarvestRevision({
          id: dependencies.createId?.('harvest_revision') ?? `harvest_revision_${Date.now()}`,
          harvestId: id,
          action: 'updated',
          before: current,
          after: updated,
          createdAt: clock.now().toISOString()
        });
        return updated;
      });
    },

    deleteHarvest(id) {
      const current = repository.findHarvest(id);
      if (!current) throw new NotFoundError('harvest', id);
      return run(() => {
        repository.deleteHarvest(id);
        repository.createHarvestRevision({
          id: dependencies.createId?.('harvest_revision') ?? `harvest_revision_${Date.now()}`,
          harvestId: id,
          action: 'deleted',
          before: current,
          after: null,
          createdAt: clock.now().toISOString()
        });
        return { id, deleted: true };
      });
    },

    companionReport() {
      const rules = repository.listCompanionRules();
      return { findings: findCompanionIssues({ plantings: repository.listPlantings(), crops: repository.listCrops(), plots: repository.listPlots(), rules: rules.length ? rules : COMPANION_RULES }) };
    },

    listCompanionRules() { return repository.listCompanionRules(); },

    createCompanionRule(input) {
      const id = input?.id ?? dependencies.createId?.('companion_rule') ?? `companion_rule_${Date.now()}`;
      const rule = validateCompanionRule({ ...input, id });
      const duplicate = repository.listCompanionRules().some((entry) => entry.pair.join(':') === rule.pair.join(':'));
      if (duplicate) throw new ConflictError('companion rule already exists for this crop pair', { pair: rule.pair });
      return repository.createCompanionRule({ ...rule, createdAt: clock.now().toISOString() });
    },

    updateCompanionRule(id, patch) {
      const current = repository.findCompanionRule(id);
      if (!current) throw new NotFoundError('companion rule', id);
      const next = validateCompanionRule({ ...current, ...patch, id, pair: current.pair });
      repository.updateCompanionRule(id, next);
      return { ...current, ...next };
    },

    deleteCompanionRule(id) {
      if (!repository.deleteCompanionRule(id)) throw new NotFoundError('companion rule', id);
      return { id, deleted: true };
    },

    yieldReport() {
      return yieldSummary({ harvests: repository.listHarvests(), plantings: repository.listPlantings(), crops: repository.listCrops() });
    },

    yieldByPlot(plotId) {
      if (plotId) requirePlot(plotId);
      return projectYieldByPlot({
        harvests: repository.listHarvests(),
        plantings: repository.listPlantings(),
        crops: repository.listCrops(),
        plots: repository.listPlots(),
        plotId: plotId ?? null
      });
    },

    exportSeason(format = 'json') {
      if (!['json', 'csv'].includes(format)) {
        throw new ValidationError('export format must be json or csv', { field: 'format' });
      }
      const exportData = buildSeasonExport({
        plots: repository.listPlots(),
        crops: repository.listCrops(),
        plantings: repository.listPlantings(),
        harvests: repository.listHarvests(),
        rotationEvents: repository.listRotationEvents(),
        generatedAt: clock.now().toISOString()
      });
      if (format === 'csv') {
        return {
          format,
          contentType: 'text/csv; charset=utf-8',
          filename: 'gardengrid-season.csv',
          checksum: exportData.checksum,
          body: seasonPlantingsCsv(exportData.data.plantings)
        };
      }
      return {
        format,
        contentType: 'application/json; charset=utf-8',
        filename: 'gardengrid-season.json',
        checksum: exportData.checksum,
        body: { ...exportData.manifest, checksum: exportData.checksum, ...exportData.data }
      };
    },

    importSeason(input, options = {}) {
      const snapshot = validateSeasonImport(input);
      const analysis = analyzeSeasonImport({
        snapshot,
        plots: repository.listPlots(),
        crops: repository.listCrops(),
        plantings: repository.listPlantings()
      });
      if (options.dryRun === true) {
        return {
          dryRun: true,
          ready: analysis.ready.length,
          skipped: analysis.skipped.length,
          errors: analysis.errors,
          harvestsEligible: snapshot.harvests.filter((harvest) => (
            analysis.ready.some((planting) => planting.id === harvest.plantingId)
          )).length
        };
      }
      const imported = run(() => {
        const plantingMap = new Map();
        for (const row of analysis.ready) {
          const crop = requireCrop(row.cropId);
          const planting = createPlanting({
            plotId: row.plotId,
            cropId: row.cropId,
            plantedOn: row.plantedOn,
            status: row.status
          }, crop, dependencies);
          planting.expectedHarvestOn = row.expectedHarvestOn;
          repository.createPlanting(planting);
          repository.createRotationEvent(createRotationEvent({
            plotId: row.plotId,
            cropId: row.cropId,
            plantedOn: row.plantedOn
          }, crop, dependencies));
          plantingMap.set(row.id, planting);
        }
        let harvests = 0;
        for (const row of snapshot.harvests) {
          const planting = plantingMap.get(row.plantingId);
          if (!planting) continue;
          repository.createHarvest(createHarvest({
            plantingId: planting.id,
            harvestedOn: row.harvestedOn,
            quantity: row.quantity,
            unit: row.unit
          }, dependencies));
          harvests += 1;
        }
        return { plantings: plantingMap.size, harvests };
      });
      return {
        dryRun: false,
        imported,
        skipped: analysis.skipped.length,
        errors: analysis.errors
      };
    },

    exportBackup() {
      return buildGardenBackup({
        generatedAt: clock.now().toISOString(),
        data: {
          plots: repository.listPlots(),
          crops: repository.listCrops(),
          frostProfiles: repository.listFrostProfiles(),
          plantings: repository.listPlantings(),
          harvests: repository.listHarvests(),
          rotationEvents: repository.listRotationEvents()
        }
      });
    },

    restoreBackup(input) {
      const backup = validateGardenBackup(input);
      const occupied = repository.listPlots().length > 0
        || repository.listCrops().length > 0
        || repository.listPlantings().length > 0
        || repository.listHarvests().length > 0
        || repository.listFrostProfiles().length > 0
        || repository.listRotationEvents().length > 0;
      if (occupied) throw new ConflictError('restore requires an empty garden database');
      return run(() => {
        for (const plot of backup.data.plots) repository.createPlot(plot);
        for (const crop of backup.data.crops) repository.createCrop(crop);
        for (const profile of backup.data.frostProfiles) repository.createFrostProfile(profile);
        for (const planting of backup.data.plantings) repository.createPlanting(planting);
        for (const harvest of backup.data.harvests) repository.createHarvest(harvest);
        for (const event of backup.data.rotationEvents) repository.createRotationEvent(event);
        const foreignKeyErrors = repository.db.prepare('PRAGMA foreign_key_check').all();
        if (foreignKeyErrors.length > 0) throw new ConflictError('restored garden violates foreign keys', { foreignKeyErrors });
        const actual = {
          plots: repository.listPlots().length,
          crops: repository.listCrops().length,
          frostProfiles: repository.listFrostProfiles().length,
          plantings: repository.listPlantings().length,
          harvests: repository.listHarvests().length,
          rotationEvents: repository.listRotationEvents().length
        };
        if (JSON.stringify(actual) !== JSON.stringify(backup.counts)) throw new ConflictError('restored row counts do not match', { expected: backup.counts, actual });
        return { restored: backup.counts, checksum: backup.checksum };
      });
    },

    window(cropId, profileId) {
      const crop = requireCrop(cropId);
      const profile = requireFrostProfile(profileId);
      return sowingWindow(crop, profile);
    },

    successionPlan(cropId, profileId, count, intervalDays) {
      const crop = requireCrop(cropId);
      const profile = requireFrostProfile(profileId);
      return successionSchedule({ crop, profile, count: count ?? 4, intervalDays: intervalDays ?? 14 });
    },

    createSuccession(input = {}) {
      const plot = requirePlot(input.plotId);
      const crop = requireCrop(input.cropId);
      const profile = requireFrostProfile(input.profileId);
      if (crop.archivedAt) throw new ConflictError('archived crops cannot be planted', { cropId: crop.id, archivedAt: crop.archivedAt });
      const plan = successionSchedule({
        crop,
        profile,
        count: input.count ?? 4,
        intervalDays: input.intervalDays ?? 14
      });
      const drafts = successionPlantingDrafts({
        plan,
        plotId: plot.id,
        cropId: crop.id,
        selectedRounds: input.selectedRounds
      });
      const existingPlantings = repository.listPlantings();
      const overlap = findPlotOverlap(drafts, existingPlantings);
      if (overlap) {
        throw new ConflictError('succession round overlaps an existing planting', {
          round: overlap.draft.round,
          plantingId: overlap.conflict.id
        });
      }
      const existingEvents = repository.listRotationEvents();
      for (const draft of drafts) {
        if (hasRecentFamilyConflict({ crop, plotId: plot.id, events: existingEvents, plantedOn: draft.plantedOn })) {
          throw new ConflictError(`rotation conflict: ${crop.family} was planted in ${plot.name} within three years`, {
            plotId: plot.id,
            cropId: crop.id,
            family: crop.family
          });
        }
      }
      return run(() => {
        const plantings = drafts.map((draft) => repository.createPlanting(createPlanting(draft, crop, dependencies)));
        const rotationEvents = plantings.map((planting) => {
          const event = createRotationEvent({ plotId: plot.id, cropId: crop.id, plantedOn: planting.plantedOn }, crop, dependencies);
          repository.createRotationEvent(event);
          return event;
        });
        const batch = repository.createSuccessionBatch({
          id: dependencies.createId?.('succession_batch') ?? `succession_batch_${Date.now()}`,
          plotId: plot.id,
          cropId: crop.id,
          profileId: profile.id,
          intervalDays: plan.intervalDays,
          selectedRounds: drafts.map((draft) => draft.round),
          plantingIds: plantings.map((planting) => planting.id),
          rotationEventIds: rotationEvents.map((event) => event.id),
          createdAt: clock.now().toISOString()
        });
        return { plot, crop, profile, plan, batch, plantings, rotationEvents };
      });
    },

    plant(input) {
      const plot = requirePlot(input?.plotId);
      const crop = requireCrop(input?.cropId);
      if (crop.archivedAt) throw new ConflictError('archived crops cannot be planted', { cropId: crop.id, archivedAt: crop.archivedAt });
      const plantedOn = requireDate(input?.plantedOn, 'plantedOn');
      const conflict = hasRecentFamilyConflict({
        crop,
        plotId: plot.id,
        events: repository.listRotationEvents(),
        plantedOn
      });
      if (conflict) throw new ConflictError(`rotation conflict: ${crop.family} was planted in ${plot.name} within three years`, { plotId: plot.id, cropId: crop.id, family: crop.family });
      const plantingDraft = createPlanting({ ...input, plotId: plot.id }, crop, dependencies);
      const restConflict = findRestConflict({
        candidate: { plotId: plot.id, startedOn: plantingDraft.plantedOn, endedOn: plantingDraft.expectedHarvestOn },
        restPeriods: repository.listRestPeriods(),
        plantings: []
      });
      if (restConflict) throw new ConflictError('planting overlaps a bed rest period', { ...restConflict, plotId: plot.id });
      return run(() => {
        const planting = repository.createPlanting(plantingDraft);
        const event = createRotationEvent({ plotId: plot.id, cropId: crop.id, plantedOn: planting.plantedOn }, crop, dependencies);
        repository.createRotationEvent(event);
        return planting;
      });
    },

    recordRestPeriod(input = {}) {
      const plot = requirePlot(input.plotId);
      let crop = null;
      if (input.cropId) {
        crop = requireCrop(input.cropId);
        if (crop.archivedAt) throw new ConflictError('archived crops cannot start a cover-crop period', { cropId: crop.id });
      }
      const period = createRestPeriod({ ...input, plotId: plot.id, cropId: crop?.id ?? null }, dependencies);
      const conflict = findRestConflict({
        candidate: period,
        restPeriods: repository.listRestPeriods(),
        plantings: repository.listPlantings()
      });
      if (conflict) throw new ConflictError('rest period overlaps an existing bed commitment', { ...conflict, plotId: plot.id });
      return run(() => repository.createRestPeriod(period));
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

    calendar(from, to, plotId = null) {
      const start = requireDate(from, 'from');
      const end = requireDate(to, 'to');
      if (plotId) requirePlot(plotId);
      if (end < start) throw new ConflictError('to must not precede from', { from: start, to: end });
      return calendarEvents({ plantings: repository.listPlantings(), crops: repository.listCrops(), plots: repository.listPlots(), from: start, to: end, plotId });
    }
  };
}
