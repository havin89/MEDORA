import { Router } from 'express';
import { PatientController } from '../controllers/patientController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const patientController = new PatientController();

export function setPatientRoutes(app) {
    app.use('/api/patients', router);

    router.post('/register', patientController.register);
    router.get('/:id', authMiddleware.verifyPatient, patientController.getPatientInfo);
    router.post('/:id/send-sms', authMiddleware.verifyPatient, patientController.sendSmsNotification);
}