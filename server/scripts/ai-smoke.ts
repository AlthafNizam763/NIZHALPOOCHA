import { z } from 'zod';
import { generateTyped } from '../src/services/ai';

const Holiday = z.object({
  name: z.string(),
  date: z.string().describe('When it is celebrated, e.g. "first full moon of Chingam"'),
  traditions: z.array(z.string()).min(3).max(5),
});

const holiday = await generateTyped({
  schema: Holiday,
  name: 'holiday',
  prompt: 'Invent a new holiday set in monsoon Kerala and describe its traditions.',
});

// `holiday` is typed as { name: string; date: string; traditions: string[] }
console.log(`${holiday.name} (${holiday.date})`);
for (const t of holiday.traditions) console.log(` - ${t}`);
