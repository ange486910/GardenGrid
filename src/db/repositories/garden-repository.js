function mapPlot(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, areaSqm: Number(row.area_sqm), sunExposure: row.sun_exposure, createdAt: row.created_at };
}
function mapCrop(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, family: row.family, daysToHarvest: Number(row.days_to_harvest), frostHardy: Number(row.frost_hardy) === 1, createdAt: row.created_at };
}
function mapPlanting(row) {
  if (!row) return null;
  return { id: row.id, plotId: row.plot_id, cropId: row.crop_id, plantedOn: row.planted_on, expectedHarvestOn: row.expected_harvest_on, status: row.status, createdAt: row.created_at };
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
      insertCrop: db.prepare('INSERT INTO crops (id, name, family, days_to_harvest, frost_hardy, created_at) VALUES (?, ?, ?, ?, ?, ?)'),
      listPlantings: db.prepare('SELECT * FROM plantings ORDER BY planted_on ASC, id ASC'),
      insertPlanting: db.prepare('INSERT INTO plantings (id, plot_id, crop_id, planted_on, expected_harvest_on, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    };
  }

  listPlots() { return this.statements.listPlots.all().map(mapPlot); }
  findPlot(id) { return mapPlot(this.statements.findPlot.get(id)); }
  createPlot(plot) { this.statements.insertPlot.run(plot.id, plot.name, plot.areaSqm, plot.sunExposure, plot.createdAt); return plot; }
  listCrops() { return this.statements.listCrops.all().map(mapCrop); }
  findCrop(id) { return mapCrop(this.statements.findCrop.get(id)); }
  createCrop(crop) { this.statements.insertCrop.run(crop.id, crop.name, crop.family, crop.daysToHarvest, crop.frostHardy ? 1 : 0, crop.createdAt); return crop; }
  listPlantings() { return this.statements.listPlantings.all().map(mapPlanting); }
  createPlanting(planting) { this.statements.insertPlanting.run(planting.id, planting.plotId, planting.cropId, planting.plantedOn, planting.expectedHarvestOn, planting.status, planting.createdAt); return planting; }
}

export { mapPlot, mapCrop, mapPlanting };
