import { connectDatabase } from '../config/database.js';
import { Incident } from '../modules/incidents/incident.model.js';

async function check() {
  await connectDatabase();
  const inc = await Incident.findOne({ incidentNumber: 'CP-2026-R6709255' });
  console.log('Incident CP-2026-R6709255:', inc ? { id: inc._id.toString(), number: inc.incidentNumber } : 'NOT FOUND');
  const all = await Incident.find().sort({ createdAt: -1 }).limit(5).select('incidentNumber createdAt title');
  console.log('Latest 5 incidents in DB:');
  all.forEach((i) => console.log(' -', i.incidentNumber, i.title, i.createdAt));
  process.exit(0);
}

check();
