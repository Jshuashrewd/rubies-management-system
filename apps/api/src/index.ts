import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { authRouter } from './routes/auth.js';
import { meRouter } from './routes/me.js';
import { scheduleRouter } from './routes/schedule.js';
import { curriculumRouter } from './routes/curriculum.js';
import { studentsRouter } from './routes/students.js';
import { reportsRouter } from './routes/reports.js';
import { eventsRouter } from './routes/events.js';
import { strictModeRouter } from './routes/strict-mode.js';
import { adminRouter } from './routes/admin.js';
import { errorHandler } from './middleware/error-handler.js';

const app = express();

app.use(cors());
app.use(express.json());

// Health check — useful for confirming the deploy is alive before wiring
// clients to it.
app.get('/health', (_req, res) => res.json({ ok: true }));

// Mounted to match the endpoint catalog in SYSTEM_DESIGN.md §9.2 exactly.
app.use('/auth', authRouter);
app.use('/me', meRouter);
app.use('/schedule', scheduleRouter); // also serves /classes/:id
app.use('/classes', scheduleRouter); // GET /classes/:id lives on scheduleRouter's '/:id'
app.use('/curriculum', curriculumRouter);
app.use('/', studentsRouter); // defines its own full paths (/trainer/students, /students/:id)
app.use('/reports', reportsRouter);
app.use('/events', eventsRouter);
app.use('/strict-mode', strictModeRouter);

// Admin-only surface (not in the shared contract's catalog — see admin.ts).
app.use('/admin', adminRouter);

// Must be registered LAST — Express only treats a 4-arg function as an
// error handler when it comes after all other app.use()/routes.
app.use(errorHandler);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(PORT, () => {
  console.log(`Rubies API listening on http://localhost:${PORT}`);
});
