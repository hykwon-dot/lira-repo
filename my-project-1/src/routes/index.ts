// This file sets up the routing for the application. It defines the endpoints and associates them with the appropriate controller methods.

import { Router } from 'express';
import { YourController } from '../controllers/index';

const router = Router();

// Define your routes here
router.get('/your-endpoint', YourController.yourMethod);
router.post('/your-endpoint', YourController.yourMethod);

export default router;