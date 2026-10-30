function mapPlot(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, areaSqm: Number(row.area_sqm), sunExposure: row.sun_exposure, createdAt: row.created_at };
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

export class GardenRepository {
  constructor(db) {
    this.db = db;
    this.statements = {
      listPlots: db.prepare('SELECT * FROM plots ORDER BY name ASC, id ASC'),
      findPlot: db.prepare('SELECT * FROM plots WHERE id = ?'),
      insertPlot: db.prepare('INSERT INTO plots (id, name, area_sqm, sun_exposure, created_at) VALUES (?, ?, ?, ?, ?)'),
      listCrops: db.prepare('SELECT * FROM crops ORDER BY name ASC, id ASC'),
      findCrop: db.prepare('SELECT * FROM crops WHERE id = ?'),
      insertCrop: db.prepare(
        'INSERT INTO crops (id, name, family, days_to_harvest, frost_hardy, earliest_sow_weeks, latest_sow_weeks, created_at) '
        + 'VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ),
      listFrostProfiles: db.prepare('SELECT * FROM frost_profiles ORDER BY name ASC, id ASC'),
      findFrostProfile: db.prepare('SELECT * FROM frost_profiles WHERE id = ?'),
      insertFrostProfile: db.prepare('INSERT INTO frost_profiles (id, name, zone, last_frost_date, first_frost_date, created_at) VALUES (?, ?, ?, ?, ?, ?)'),
      listHarvests: db.prepare('SELECT * FROM harvests ORDER BY harvested_on ASC, id ASC'),
      listHarvestsByPlanting: db.prepare('SELECT * FROM harvests WHERE planting_id = ? ORDER BY harvested_on ASC, id ASC'),
      insertHarvest: db.prepare('INSERT INTO harvests (id, planting_id, harvested_on, quantity, unit, created_at) VALUES (?, ?, ?, ?, ?, ?)'),
      listPlantings: db.prepare('SELECT * FROM plantings ORDER BY planted_on ASC, id ASC'),
      insertPlanting: db.prepare('INSERT INTO plantings (id, plot_id, crop_id, planted_on, expected_harvest_on, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
      listRotationEvents: db.prepare('SELECT * FROM rotation_events ORDER BY planted_on DESC, id DESC'),
      listRotationEventsByPlot: db.prepare('SELECT * FROM rotation_events WHERE plot_id = ? ORDER BY planted_on DESC, id DESC'),
      insertRotationEvent: db.prepare(
        'INSERT INTO rotation_events (id, plot_id, crop_id, family, crop_name, planted_on, ended_on, created_at) '
        + 'VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
    };
  }

  listPlots() { return this.statements.listPlots.all().map(mapPlot); }
  findPlot(id) { return mapPlot(this.statements.findPlot.get(id)); }
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
      crop.createdAt
    );
    return crop;
  }
  listFrostProfiles() { return this.statements.listFrostProfiles.all().map(mapFrostProfile); }
  findFrostProfile(id) { return mapFrostProfile(this.statements.findFrostProfile.get(id)); }
  createFrostProfile(profile) { this.statements.insertFrostProfile.run(profile.id, profile.name, profile.zone, profile.lastFrostDate, profile.firstFrostDate, profile.createdAt); return profile; }
  listHarvests() { return this.statements.listHarvests.all().map(mapHarvest); }
  listHarvestsByPlanting(plantingId) { return this.statements.listHarvestsByPlanting.all(plantingId).map(mapHarvest); }
  createHarvest(harvest) { this.statements.insertHarvest.run(harvest.id, harvest.plantingId, harvest.harvestedOn, harvest.quantity, harvest.unit, harvest.createdAt); return harvest; }
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
}

export { mapPlot, mapCrop, mapPlanting, mapFrostProfile, mapHarvest, mapRotationEvent };
