// Doctors (remote consult). POST /doctors/register (no login); /doctor/* for doctor accounts
// (account, clinic requests, hours, leave); /shop/doctors* for clinics (add by Visus ID, remove, free slots).
import { AddDoctorRequest, DoctorRegisterRequest, DoctorRequestAnswer, SetHoursRequest, UpdateDoctorRequest } from '@visus/shared';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';

import type { AppEnv } from '../../lib/env';
import { fail } from '../../lib/errors';
import { validate } from '../../lib/validate';
import { requireAuth } from '../auth/auth.middleware';
import { requireShop } from '../shops/shops.routes';
import {
  activeLink,
  addClinicDoctor,
  answerClinic,
  doctorIdOf,
  freeSlots,
  getDoctorAccount,
  leaveClinic,
  listClinicDoctors,
  listDoctorClinics,
  registerDoctor,
  removeClinicDoctor,
  setHours,
  updateDoctor,
} from './doctors.service';

export const doctorRegisterRoutes = new Hono<AppEnv>();

doctorRegisterRoutes.post('/register', validate('json', DoctorRegisterRequest), async (c) =>
  c.json(await registerDoctor(c.var.db, c.env, c.req.valid('json')), 201),
);

/** Doctor accounts only; sets c.var.doctorId (once, when several /doctor routers match). */
export const requireDoctor = createMiddleware<AppEnv>(async (c, next) => {
  if (c.var.doctorId) return next();
  const doctorId = await doctorIdOf(c.var.db, c.var.userId);
  if (!doctorId) fail(403, 'This is for doctors. Sign up as a doctor first.');
  c.set('doctorId', doctorId);
  await next();
});

export const doctorRoutes = new Hono<AppEnv>();
doctorRoutes.use('*', requireAuth, requireDoctor);

doctorRoutes.get('/', async (c) => c.json(await getDoctorAccount(c.var.db, c.var.doctorId)));

doctorRoutes.patch('/', validate('json', UpdateDoctorRequest), async (c) =>
  c.json(await updateDoctor(c.var.db, c.var.doctorId, c.var.userId, c.req.valid('json'))),
);

doctorRoutes.get('/clinics', async (c) => c.json(await listDoctorClinics(c.var.db, c.var.doctorId)));

doctorRoutes.post('/clinics/:linkId', validate('json', DoctorRequestAnswer), async (c) =>
  c.json(await answerClinic(c.var.db, c.var.doctorId, c.req.param('linkId'), c.req.valid('json').approve)),
);

doctorRoutes.put('/clinics/:linkId/hours', validate('json', SetHoursRequest), async (c) =>
  c.json(await setHours(c.var.db, c.var.doctorId, c.req.param('linkId'), c.req.valid('json').hours)),
);

doctorRoutes.delete('/clinics/:linkId', async (c) => c.json(await leaveClinic(c.var.db, c.var.doctorId, c.req.param('linkId'))));

/** Clinic side, mounted at /shop. */
export const clinicDoctorRoutes = new Hono<AppEnv>();
clinicDoctorRoutes.use('/doctors/*', requireAuth, requireShop);
clinicDoctorRoutes.use('/doctors', requireAuth, requireShop);

clinicDoctorRoutes.get('/doctors', async (c) => c.json(await listClinicDoctors(c.var.db, c.var.shopId)));

clinicDoctorRoutes.post('/doctors', validate('json', AddDoctorRequest), async (c) =>
  c.json(await addClinicDoctor(c.var.db, c.var.shopId, c.req.valid('json').visusId), 201),
);

clinicDoctorRoutes.delete('/doctors/:linkId', async (c) => c.json(await removeClinicDoctor(c.var.db, c.var.shopId, c.req.param('linkId'))));

clinicDoctorRoutes.get('/doctors/:doctorId/slots', async (c) => {
  const link = await activeLink(c.var.db, c.var.shopId, c.req.param('doctorId'));
  return c.json(await freeSlots(c.var.db, link, c.req.query('date') ?? ''));
});
