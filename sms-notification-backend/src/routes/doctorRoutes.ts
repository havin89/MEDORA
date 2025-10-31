import { Router } from 'express';
import DoctorController from '../controllers/doctorController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();
const doctorController = new DoctorController();

export const setDoctorRoutes = (app) => {
    app.use('/api/doctors', router);

    router.post('/register', doctorController.register);
    router.get('/:id/patients', authenticate, doctorController.getPatients);
    router.post('/alerts', authenticate, doctorController.sendAlert);
};