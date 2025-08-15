import { Router } from 'express';
import { RiderApplicationController } from '../controllers/riderApplication';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// User routes
router.post('/applications', RiderApplicationController.createApplication);
router.get('/applications', RiderApplicationController.getUserApplications);
router.get('/applications/:id', RiderApplicationController.getApplicationById);
router.get('/applications/check/existing', RiderApplicationController.checkExistingApplication);
router.post('/applications/:applicationId/documents', RiderApplicationController.addDocument);
router.delete('/documents/:documentId', RiderApplicationController.removeDocument);



export default router; 