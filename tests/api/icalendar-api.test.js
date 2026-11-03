import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';
import { startServer } from '../../src/api/server.js';
test('calendar API downloads a valid iCalendar feed', async () => {
  const app=createApplication({databasePath:':memory:'}); const plot=app.service.createPlot({name:'Bed A',areaSqm:4}); const crop=app.service.createCrop({name:'Lettuce',family:'Asteraceae',daysToHarvest:45,frostHardy:true}); app.service.plant({plotId:plot.id,cropId:crop.id,plantedOn:'2026-05-01'}); const server=await startServer(app.service); const base=`http://127.0.0.1:${server.address().port}`;
  try { const response=await fetch(`${base}/api/v1/calendar.ics?from=2026-05-01&to=2026-06-30`); assert.equal(response.status,200); assert.match(response.headers.get('content-type'),/text\/calendar/); assert.match(response.headers.get('content-disposition'),/gardengrid-calendar\.ics/); const text=await response.text(); assert.match(text,/BEGIN:VCALENDAR/); assert.match(text,/UID:plant-/); }
  finally { await new Promise((resolve)=>server.close(resolve)); app.close(); }
});
