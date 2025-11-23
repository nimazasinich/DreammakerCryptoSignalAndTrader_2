import { Router } from 'express';
import { DataSourceController } from '../controllers/DataSourceController.js';

const controller = new DataSourceController();
const router = Router();

router.get('/data-source', (req, res) => controller.getConfig(req, res));
router.post('/data-source', (req, res) => controller.setPrimarySource(req, res));

export const dataSourceRouter = router;

