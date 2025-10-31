import express from 'express';
import { json } from 'body-parser';
import { setAuthRoutes } from './routes/authRoutes';
import { setPatientRoutes } from './routes/patientRoutes';
import { setDoctorRoutes } from './routes/doctorRoutes';
import { authMiddleware } from './middleware/authMiddleware';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(json());
app.use(authMiddleware);

setAuthRoutes(app);
setPatientRoutes(app);
setDoctorRoutes(app);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});