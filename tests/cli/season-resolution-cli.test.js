import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createApplication } from '../../src/application/create-application.js';

test('CLI applies a reviewed season resolution with a preview token', () => {
  const directory = mkdtempSync(join(tmpdir(), 'gardengrid-resolution-cli-'));
  const sourceDatabase = join(directory, 'source.sqlite');
  const targetDatabase = join(directory, 'target.sqlite');
  const snapshotPath = join(directory, 'season.json');
  const resolutionPath = join(directory, 'resolutions.json');
  try {
    const source = createApplication({ databasePath: sourceDatabase });
    const sourcePlot = source.service.createPlot({ name: 'Bed A', areaSqm: 6 });
    const sourceTomato = source.service.createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false });
    const sourcePlanting = source.service.plant({ plotId: sourcePlot.id, cropId: sourceTomato.id, plantedOn: '2026-05-01' });
    source.service.recordHarvest({ plantingId: sourcePlanting.id, harvestedOn: '2026-07-10', quantity: 2, unit: 'kg' });
    const snapshot = source.service.exportSeason('json').body;
    source.close();
    writeFileSync(snapshotPath, JSON.stringify(snapshot), 'utf8');

    const target = createApplication({ databasePath: targetDatabase });
    const targetPlot = target.service.createPlot({ name: 'Bed A', areaSqm: 6 });
    const targetTomato = target.service.createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false });
    const targetKale = target.service.createCrop({ name: 'Kale', family: 'Brassicaceae', daysToHarvest: 1, frostHardy: true });
    target.service.plant({ plotId: targetPlot.id, cropId: targetKale.id, plantedOn: '2026-06-01' });
    target.close();

    const resolutions = {
      format: 'gardengrid-season-resolutions', version: 1, snapshotChecksum: snapshot.checksum,
      resolutions: [{
        plantingId: snapshot.plantings[0].id, action: 'replace', plotId: targetPlot.id, cropId: targetTomato.id,
        plantedOn: '2026-06-03', expectedHarvestOn: '2026-07-10'
      }]
    };
    writeFileSync(resolutionPath, JSON.stringify(resolutions), 'utf8');

    const preview = spawnSync(process.execPath, [
      'src/cli/index.js', 'season-import', '--database', targetDatabase, '--file', snapshotPath,
      '--dry-run', '--resolution-file', resolutionPath
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(preview.status, 0, preview.stderr);
    const token = JSON.parse(preview.stdout).previewToken;
    assert.match(token, /^[a-f0-9]{64}$/);

    const applied = spawnSync(process.execPath, [
      'src/cli/index.js', 'season-import', '--database', targetDatabase, '--file', snapshotPath,
      '--resolution-file', resolutionPath, '--preview-token', token
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(applied.status, 0, applied.stderr);
    assert.equal(JSON.parse(applied.stdout).imported.plantings, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
