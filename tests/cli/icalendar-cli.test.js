import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createApplication } from '../../src/application/create-application.js';
test('CLI writes an iCalendar file', () => {
  const directory=mkdtempSync(join(tmpdir(),'gardengrid-ics-cli-')); const database=join(directory,'g.sqlite'); const file=join(directory,'calendar.ics');
  try { const app=createApplication({databasePath:database}); const plot=app.service.createPlot({name:'Bed A',areaSqm:4}); const crop=app.service.createCrop({name:'Lettuce',family:'Asteraceae',daysToHarvest:45,frostHardy:true}); app.service.plant({plotId:plot.id,cropId:crop.id,plantedOn:'2026-05-01'}); app.close(); const result=spawnSync(process.execPath,['src/cli/index.js','calendar-export','--database',database,'--from','2026-05-01','--to','2026-06-30','--file',file],{cwd:process.cwd(),encoding:'utf8'}); assert.equal(result.status,0,result.stderr); assert.match(readFileSync(file,'utf8'),/BEGIN:VCALENDAR/); }
  finally { rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100}); }
});
