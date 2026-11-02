function mapPlot(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, areaSqm: Number(row.area_sqm), sunExposure: row.sun_exposure, displayOrder: Number(row.display_order ?? 0), createdAt: row.created_at };
}
function mapCrop(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    family: row.family,
    daysToHarvest: Number(row.days_to_harvest),
    frostHardy: Number(row.frost_hardy) === 1,
    earliestSowWeeks: row.earliest_sow_weeks == null ? null : Number(row.earliest_sow_weeks),
    latestSowWeeks: row.latest_sow_weeks == null ? null : Number(row.latest_sow_weeks),
    archivedAt: row.archived_at ?? null,
    createdAt: row.created_at
  };
}
function mapHarvest(row) {
  if (!row) return null;
  return { id: row.id, plantingId: row.planting_id, harvestedOn: row.harvested_on, quantity: Number(row.quantity), unit: row.unit, createdAt: row.created_at };
}
function mapFrostProfile(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, zone: row.zone, lastFrostDate: row.last_frost_date, firstFrostDate: row.first_frost_date, createdAt: row.created_at };
}
function mapPlanting(row) {
  if (!row) return null;
  return { id: row.id, plotId: row.plot_id, cropId: row.crop_id, plantedOn: row.planted_on, expectedHarvestOn: row.expected_harvest_on, status: row.status, createdAt: row.created_at };
}

function mapRotationEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    plotId: row.plot_id,
    cropId: row.crop_id,
    family: row.family,
    cropName: row.crop_name,
    plantedOn: row.planted_on,
    endedOn: row.ended_on,
    createdAt: row.created_at
  };
}

function mapCompanionRule(row) {
  if (!row) return null;
  return { id: row.id, pair: [row.crop_a, row.crop_b], type: row.type, note: row.note, createdAt: row.created_at };
}
function mapRestPeriod(row) {
  if (!row) return null;
  return {
    id: row.id,
    plotId: row.plot_id,
    kind: row.kind,
    cropId: row.crop_id,
    startedOn: row.started_on,
    endedOn: row.ended_on,
    note: row.note,
    createdAt: row.created_at
  };
}
function mapSuccessionBatch(row) {
  if (!row) return null;
  return {
    id: row.id,
    plotId: row.plot_id,
    cropId: row.crop_id,
    profileId: row.profile_id,
    intervalDays: Number(row.interval_days),
    selectedRounds: JSON.parse(row.selected_rounds_json),
    plantingIds: JSON.parse(row.planting_ids_json),
    rotationEventIds: JSON.parse(row.rotation_event_ids_json),
    createdAt: row.created_at
  };
}

export class GardenRepository {
  constructor(db) {
    this.db = db;
    this.statements = {
      listPlots: db.prepare('SELECT * FROM plots ORDER BY display_order ASC, name ASC, id ASC'),
      updatePlotOrder: db.prepare('UPDATE plots SET display_order = ? WHERE id = ?'),
      findPlot: db.prepare('SELECT * FROM plots WHERE id = ?'),
      insertPlot: db.prepare('INSERT INTO plots (id, name, area_sqm, sun_exposure, created_at) VALUES (?, ?, ?, ?, ?)'),
      listCrops: db.prepare('SELECT * FROM crops ORDER BY name ASC, id ASC'),
      findCrop: db.prepare('SELECT * FROM crops WHERE id = ?'),
      insertCrop: db.prepare(
        'INSERT INTO crops (id, name, family, days_to_harvest, frost_hardy, earliest_sow_weeks, latest_sow_weeks, archived_at, created_at) '
        + 'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ),
      setCropArchived: db.prepare('UPDATE crops SET archived_at = ? WHERE id = ?'),
      listFrostProfiles: db.prepare('SELECT * FROM frost_profiles ORDER BY name ASC, id ASC'),
      findFrostProfile: db.prepare('SELECT * FROM frost_profiles WHERE id = ?'),
      insertFrostProfile: db.prepare('INSERT INTO frost_profiles (id, name, zone, last_frost_date, first_frost_date, created_at) VALUES (?, ?, ?, ?, ?, ?)'),
      listHarvests: db.prepare('SELECT * FROM harvests ORDER BY harvested_on ASC, id ASC'),
      listHarvestsByPlanting: db.prepare('SELECT * FROM harvests WHERE planting_id = ? ORDER BY harvested_on ASC, id ASC'),
      findHarvest: db.prepare('SELECT * FROM harvests WHERE id = ?'),
      insertHarvest: db.prepare('INSERT INTO harvests (id, planting_id, harvested_on, quantity, unit, created_at) VALUES (?, ?, ?, ?, ?, ?)'),
      updateHarvest: db.prepare('UPDATE harvests SET planting_id = ?, harvested_on = ?, quantity = ?, unit = ? WHERE id = ?'),
      deleteHarvest: db.prepare('DELETE FROM harvests WHERE id = ?'),
      insertHarvestRevision: db.prepare('INSERT INTO harvest_revisions (id, harvest_id, action, before_json, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'),
      listHarvestRevisions: db.prepare('SELECT * FROM harvest_revisions ORDER BY created_at ASC, id ASC'),
      listPlantings: db.prepare('SELECT * FROM plantings ORDER BY planted_on ASC, id ASC'),
      insertPlanting: db.prepare('INSERT INTO plantings (id, plot_id, crop_id, planted_on, expected_harvest_on, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
      listRotationEvents: db.prepare('SELECT * FROM rotation_events ORDER BY planted_on DESC, id DESC'),
      listRotationEventsByPlot: db.prepare('SELECT * FROM rotation_events WHERE plot_id = ? ORDER BY planted_on DESC, id DESC'),
      insertRotationEvent: db.prepare(
        'INSERT INTO rotation_events (id, plot_id, crop_id, family, crop_name, planted_on, ended_on, created_at) '
        + 'VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ),
      listCompanionRules: db.prepare('SELECT * FROM companion_rules ORDER BY crop_a ASC, crop_b ASC'),
      listRestPeriods: db.prepare('SELECT * FROM rest_periods ORDER BY started_on ASC, id ASC'),
      listRestPeriodsByPlot: db.prepare('SELECT * FROM rest_periods WHERE plot_id = ? ORDER BY started_on ASC, id ASC'),
      findRestPeriod: db.prepare('SELECT * FROM rest_periods WHERE id = ?'),
      insertRestPeriod: db.prepare(
        'INSERT INTO rest_periods (id, plot_id, kind, crop_id, started_on, ended_on, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ),
      findCompanionRule: db.prepare('SELECT * FROM companion_rules WHERE id = ?'),
      insertCompanionRule: db.prepare('INSERT INTO companion_rules (id, crop_a, crop_b, type, note, created_at) VALUES (?, ?, ?, ?, ?, ?)'),
      updateCompanionRule: db.prepare('UPDATE companion_rules SET type = ?, note = ? WHERE id = ?'),
      deleteCompanionRule: db.prepare('DELETE FROM companion_rules WHERE id = ?'),
      listSuccessionBatches: db.prepare('SELECT * FROM succession_batches ORDER BY created_at ASC, id ASC'),
      insertSuccessionBatch: db.prepare(
        'INSERT INTO succession_batches (id, plot_id, crop_id, profile_id, interval_days, selected_rounds_json, planting_ids_json, rotation_event_ids_json, created_at) '
        + 'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
    };
  }

  listPlots() { return this.statements.listPlots.all().map(mapPlot); }
  findPlot(id) { return mapPlot(this.statements.findPlot.get(id)); }
  updatePlotOrder(plotId, displayOrder) { return this.statements.updatePlotOrder.run(displayOrder, plotId).changes > 0; }
  createPlot(plot) { this.statements.insertPlot.run(plot.id, plot.name, plot.areaSqm, plot.sunExposure, plot.createdAt); return plot; }
  listCrops() { return this.statements.listCrops.all().map(mapCrop); }
  findCrop(id) { return mapCrop(this.statements.findCrop.get(id)); }
  createCrop(crop) {
    this.statements.insertCrop.run(
      crop.id,
      crop.name,
      crop.family,
      crop.daysToHarvest,
      crop.frostHardy ? 1 : 0,
      crop.earliestSowWeeks ?? null,
      crop.latestSowWeeks ?? null,
      crop.archivedAt ?? null,
      crop.createdAt
    );
    return crop;
  }
  setCropArchived(id, archivedAt) { return this.statements.setCropArchived.run(archivedAt, id).changes > 0; }
  listFrostProfiles() { return this.statements.listFrostProfiles.all().map(mapFrostProfile); }
  findFrostProfile(id) { return mapFrostProfile(this.statements.findFrostProfile.get(id)); }
  createFrostProfile(profile) { this.statements.insertFrostProfile.run(profile.id, profile.name, profile.zone, profile.lastFrostDate, profile.firstFrostDate, profile.createdAt); return profile; }
  listHarvests() { return this.statements.listHarvests.all().map(mapHarvest); }
  listHarvestsByPlanting(plantingId) { return this.statements.listHarvestsByPlanting.all(plantingId).map(mapHarvest); }
  findHarvest(id) { return mapHarvest(this.statements.findHarvest.get(id)); }
  createHarvest(harvest) { this.statements.insertHarvest.run(harvest.id, harvest.plantingId, harvest.harvestedOn, harvest.quantity, harvest.unit, harvest.createdAt); return harvest; }
  updateHarvest(harvest) {
    return this.statements.updateHarvest.run(harvest.plantingId, harvest.harvestedOn, harvest.quantity, harvest.unit, harvest.id).changes > 0 ? harvest : null;
  }
  deleteHarvest(id) { return this.statements.deleteHarvest.run(id).changes > 0; }
  createHarvestRevision(revision) {
    this.statements.insertHarvestRevision.run(
      revision.id,
      revision.harvestId,
      revision.action,
      JSON.stringify(revision.before),
      revision.after == null ? null : JSON.stringify(revision.after),
      revision.createdAt
    );
    return revision;
  }
  listHarvestRevisions() {
    return this.statements.listHarvestRevisions.all().map((row) => ({
      id: row.id,
      harvestId: row.harvest_id,
      action: row.action,
      before: JSON.parse(row.before_json),
      after: row.after_json == null ? null : JSON.parse(row.after_json),
      createdAt: row.created_at
    }));
  }
  listPlantings() { return this.statements.listPlantings.all().map(mapPlanting); }
  createPlanting(planting) {
    this.statements.insertPlanting.run(
      planting.id,
      planting.plotId,
      planting.cropId,
      planting.plantedOn,
      planting.expectedHarvestOn,
      planting.status,
      planting.createdAt
    );
    return planting;
  }
  listRotationEvents() { return this.statements.listRotationEvents.all().map(mapRotationEvent); }
  listRotationEventsByPlot(plotId) { return this.statements.listRotationEventsByPlot.all(plotId).map(mapRotationEvent); }
  createRotationEvent(event) {
    this.statements.insertRotationEvent.run(
      event.id,
      event.plotId,
      event.cropId,
      event.family,
      event.cropName,
      event.plantedOn,
      event.endedOn,
      event.createdAt
    );
    return event;
  }
  listCompanionRules() { return this.statements.listCompanionRules.all().map(mapCompanionRule); }
  listRestPeriods() { return this.statements.listRestPeriods.all().map(mapRestPeriod); }
  listRestPeriodsByPlot(plotId) { return this.statements.listRestPeriodsByPlot.all(plotId).map(mapRestPeriod); }
  findRestPeriod(id) { return mapRestPeriod(this.statements.findRestPeriod.get(id)); }
  createRestPeriod(period) {
    this.statements.insertRestPeriod.run(
      period.id,
      period.plotId,
      period.kind,
      period.cropId,
      period.startedOn,
      period.endedOn,
      period.note,
      period.createdAt
    );
    return period;
  }
  findCompanionRule(id) { return mapCompanionRule(this.statements.findCompanionRule.get(id)); }
  createCompanionRule(rule) {
    this.statements.insertCompanionRule.run(rule.id, rule.pair[0], rule.pair[1], rule.type, rule.note, rule.createdAt);
    return rule;
  }
  updateCompanionRule(id, patch) {
    return this.statements.updateCompanionRule.run(patch.type, patch.note, id).changes > 0;
  }
  deleteCompanionRule(id) { return this.statements.deleteCompanionRule.run(id).changes > 0; }
  listSuccessionBatches() { return this.statements.listSuccessionBatches.all().map(mapSuccessionBatch); }
  createSuccessionBatch(batch) {
    this.statements.insertSuccessionBatch.run(
      batch.id,
      batch.plotId,
      batch.cropId,
      batch.profileId,
      batch.intervalDays,
      JSON.stringify(batch.selectedRounds),
      JSON.stringify(batch.plantingIds),
      JSON.stringify(batch.rotationEventIds),
      batch.createdAt
    );
    return batch;
  }
}

export { mapPlot, mapCrop, mapPlanting, mapFrostProfile, mapHarvest, mapRotationEvent, mapCompanionRule, mapSuccessionBatch, mapRestPeriod };
