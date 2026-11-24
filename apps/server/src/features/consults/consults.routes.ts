// Remote consult routes (docs/API.md → Remote consult).
// /shop/consults* (clinic books, moves, cancels) · /doctor/consults · /me/consults · /consults/:id/* (any side of the call).
import { CaptionRequest, CreateConsultRequest, PushTestRequest, SavePrescriptionRequest, SubmitResult, UpdateConsultRequest } from '@visus/shared';
import { Hono, type Context } from 'hono';

import type { AppEnv } from '../../lib/env';
import { validate } from '../../lib/validate';
import { requireAuth } from '../auth/auth.middleware';
import { requireDoctor } from '../doctors/doctors.routes';
import { requireShop } from '../shops/shops.routes';
import { addCaption, cancelTest, endConsult, joinConsult, liveState, pushTest, submitTestResult } from './call.service';
import {
  calendarFile,
  createConsult,
  getConsult,
  listClinicConsults,
  listDoctorConsults,
  listMyConsults,
  parseWhen,
  updateConsult,
  type Urls,
} from './consults.service';
import { patientFile } from './file.service';
import { doctorPrescriptions, getPrescription, myPrescriptions, patientConsults, savePrescription } from './prescription.service';

/** The API's own origin (for .ics links) and the web app (join links). */
const urls = (c: Context<AppEnv>): Urls => ({ api: new URL(c.req.url).origin, web: (c.env.WEB_URL ?? 'https://visus.app').replace(/\/$/, '') });

/** Clinic side, mounted at /shop. */
export const clinicConsultRoutes = new Hono<AppEnv>();
clinicConsultRoutes.use('/consults', requireAuth, requireShop);
clinicConsultRoutes.use('/consults/*', requireAuth, requireShop);

clinicConsultRoutes.get('/consults', async (c) => c.json(await listClinicConsults(c.var.db, c.var.shopId, parseWhen(c.req.query('when')), urls(c))));

clinicConsultRoutes.post('/consults', validate('json', CreateConsultRequest), async (c) =>
  c.json(await createConsult(c.var.db, c.var.shopId, c.req.valid('json'), urls(c)), 201),
);

clinicConsultRoutes.use('/patients/:id/consults', requireAuth, requireShop);
clinicConsultRoutes.get('/patients/:id/consults', async (c) => c.json(await patientConsults(c.var.db, c.var.shopId, c.req.param('id'), urls(c))));

clinicConsultRoutes.patch('/consults/:id', validate('json', UpdateConsultRequest), async (c) =>
  c.json(await updateConsult(c.var.db, c.var.shopId, c.req.param('id'), c.req.valid('json'), urls(c))),
);

/** Doctor side, mounted at /doctor. */
export const doctorConsultRoutes = new Hono<AppEnv>();
doctorConsultRoutes.use('/consults', requireAuth, requireDoctor);
doctorConsultRoutes.use('/prescriptions', requireAuth, requireDoctor);

doctorConsultRoutes.get('/prescriptions', async (c) => c.json(await doctorPrescriptions(c.var.db, c.var.doctorId)));

doctorConsultRoutes.get('/consults', async (c) => c.json(await listDoctorConsults(c.var.db, c.var.doctorId, parseWhen(c.req.query('when')), urls(c))));

/** Patient side, mounted at /me. */
export const myConsultRoutes = new Hono<AppEnv>();
myConsultRoutes.use('/consults', requireAuth);
myConsultRoutes.use('/prescriptions', requireAuth);

myConsultRoutes.get('/prescriptions', async (c) => c.json(await myPrescriptions(c.var.db, c.var.userId)));

myConsultRoutes.get('/consults', async (c) => c.json(await listMyConsults(c.var.db, c.var.userId, urls(c))));

/** One consult and its call: the doctor, the patient or the clinic. */
export const consultRoutes = new Hono<AppEnv>();

// The calendar file is opened by a calendar app, without a login: the token in the link is the key.
consultRoutes.get('/:id/calendar.ics', async (c) => {
  const body = await calendarFile(c.var.db, c.req.param('id'), c.req.query('t') ?? '', c.req.query('r'), urls(c));
  return c.body(body, 200, { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="visus-consult.ics"' });
});

consultRoutes.use('/:id', requireAuth);
consultRoutes.use('/:id/*', requireAuth);

consultRoutes.get('/:id', async (c) => c.json(await getConsult(c.var.db, c.var.userId, c.req.param('id'), urls(c))));

consultRoutes.post('/:id/join', async (c) => c.json(await joinConsult(c.var.db, c.env, c.var.userId, c.req.param('id'))));

consultRoutes.post('/:id/end', async (c) => c.json(await endConsult(c.var.db, c.var.userId, c.req.param('id'), urls(c))));

consultRoutes.get('/:id/live', async (c) => c.json(await liveState(c.var.db, c.var.userId, c.req.param('id'), c.req.query('after'))));

consultRoutes.post('/:id/captions', validate('json', CaptionRequest), async (c) =>
  c.json(await addCaption(c.var.db, c.env, c.var.userId, c.req.param('id'), c.req.valid('json')), 201),
);

consultRoutes.post('/:id/tests', validate('json', PushTestRequest), async (c) => c.json(await pushTest(c.var.db, c.var.userId, c.req.param('id'), c.req.valid('json')), 201));

consultRoutes.delete('/:id/tests/:rowId', async (c) => c.json(await cancelTest(c.var.db, c.var.userId, c.req.param('id'), c.req.param('rowId'))));

consultRoutes.post('/:id/tests/:rowId/result', validate('json', SubmitResult), async (c) =>
  c.json(await submitTestResult(c.var.db, c.env, c.var.userId, c.req.param('id'), c.req.param('rowId'), c.req.valid('json'))),
);

consultRoutes.put('/:id/prescription', validate('json', SavePrescriptionRequest), async (c) =>
  c.json(await savePrescription(c.var.db, c.env, c.var.userId, c.req.param('id'), c.req.valid('json'))),
);

consultRoutes.get('/:id/prescription', async (c) => c.json(await getPrescription(c.var.db, c.var.userId, c.req.param('id'))));

consultRoutes.get('/:id/file', async (c) => c.json(await patientFile(c.var.db, c.env, c.var.userId, c.req.param('id'), urls(c))));
