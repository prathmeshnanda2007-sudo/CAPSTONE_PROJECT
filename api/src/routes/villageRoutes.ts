import express from 'express';
import { villageController } from '../controllers/villageController';

const router = express.Router();

// ─── Hierarchy endpoints ───────────────────────────────────────────────────
router.get('/states',                                  villageController.getStates);
router.get('/states/:stateId/districts',               villageController.getDistricts);
router.get('/districts/:districtId/sub-districts',     villageController.getSubDistricts);
router.get('/sub-districts/:subDistrictId/villages',   villageController.getVillages);

// ─── Search & Autocomplete (MUST be before /:id routes) ───────────────────
router.get('/villages/search',                         villageController.searchVillages);
router.get('/villages/autocomplete',                   villageController.autocomplete);

// ─── Single resource ──────────────────────────────────────────────────────
router.get('/villages/:id',                            villageController.getVillageById);

export default router;
