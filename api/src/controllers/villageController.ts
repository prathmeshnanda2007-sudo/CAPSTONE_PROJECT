import { Request, Response } from 'express';
import { villageService } from '../services/villageService';
import { sendSuccess, sendError } from '../utils/responseFormatter';
import { getCached, setCached, cacheKey, TTL } from '../utils/cache';

export const villageController = {
  // ─── GET /v1/geo/states ───────────────────────────────────────────────────
  getStates: async (req: Request, res: Response) => {
    try {
      const key = 'states:all';
      const cached = await getCached<any[]>(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return sendSuccess(res, cached);
      }

      const states = await villageService.getStates();
      await setCached(key, states, TTL.STATES);
      res.setHeader('X-Cache', 'MISS');
      return sendSuccess(res, states);
    } catch (error: any) {
      return sendError(res, 'Failed to fetch states');
    }
  },

  // ─── GET /v1/geo/states/:stateId/districts ────────────────────────────────
  getDistricts: async (req: Request, res: Response) => {
    try {
      const { stateId } = req.params;
      const key = cacheKey('districts', stateId);
      const cached = await getCached<any[]>(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return sendSuccess(res, cached);
      }

      const districts = await villageService.getDistrictsByState(stateId);
      await setCached(key, districts, TTL.DISTRICTS);
      res.setHeader('X-Cache', 'MISS');
      return sendSuccess(res, districts);
    } catch (error: any) {
      return sendError(res, 'Failed to fetch districts');
    }
  },

  // ─── GET /v1/geo/districts/:districtId/sub-districts ─────────────────────
  getSubDistricts: async (req: Request, res: Response) => {
    try {
      const { districtId } = req.params;
      const key = cacheKey('subdistricts', districtId);
      const cached = await getCached<any[]>(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return sendSuccess(res, cached);
      }

      const subDistricts = await villageService.getSubDistrictsByDistrict(districtId);
      await setCached(key, subDistricts, TTL.SUBDISTRICTS);
      res.setHeader('X-Cache', 'MISS');
      return sendSuccess(res, subDistricts);
    } catch (error: any) {
      return sendError(res, 'Failed to fetch sub-districts');
    }
  },

  // ─── GET /v1/geo/sub-districts/:subDistrictId/villages?page=1&limit=100 ──
  // Villages are paginated — cache each page separately
  getVillages: async (req: Request, res: Response) => {
    try {
      const { subDistrictId } = req.params;
      const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
      const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 100));

      const key = cacheKey('villages', subDistrictId, page, limit);
      const cached = await getCached<any>(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return sendSuccess(res, cached.data, {
          page: cached.page, limit: cached.limit,
          total: cached.total, totalPages: cached.totalPages,
        });
      }

      const result = await villageService.getVillagesBySubDistrict(subDistrictId, page, limit);
      await setCached(key, result, TTL.SUBDISTRICTS);
      res.setHeader('X-Cache', 'MISS');
      return sendSuccess(res, result.data, {
        page: result.page, limit: result.limit,
        total: result.total, totalPages: result.totalPages,
      });
    } catch (error: any) {
      return sendError(res, 'Failed to fetch villages');
    }
  },

  // ─── GET /v1/geo/villages/:id ─────────────────────────────────────────────
  getVillageById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const key = cacheKey('village', id);
      const cached = await getCached<any>(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return sendSuccess(res, cached);
      }

      const village = await villageService.getVillageById(id);
      if (!village) {
        return sendError(res, 'Village not found', 404, 'NOT_FOUND');
      }
      await setCached(key, village, TTL.VILLAGE);
      res.setHeader('X-Cache', 'MISS');
      return sendSuccess(res, village);
    } catch (error: any) {
      return sendError(res, 'Failed to fetch village');
    }
  },

  // ─── GET /v1/geo/villages/search?q=&state=&district=&limit= ──────────────
  // Search results are short-lived (5 min) — data changes less often than user expectations
  searchVillages: async (req: Request, res: Response) => {
    try {
      const q           = (req.query.q as string)?.trim();
      const stateId     = req.query.state       as string | undefined;
      const districtId  = req.query.district    as string | undefined;
      const subDistId   = req.query.subdistrict as string | undefined;
      const limit       = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

      if (!q || q.length < 2) {
        return sendError(res, 'Query parameter "q" must be at least 2 characters', 400, 'INVALID_QUERY');
      }

      const key = cacheKey('search', q.toLowerCase(), stateId, districtId, subDistId, limit);
      const cached = await getCached<any[]>(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return sendSuccess(res, cached);
      }

      const results = await villageService.searchVillages(q, { stateId, districtId, subDistrictId: subDistId }, limit);
      await setCached(key, results, TTL.SEARCH);
      res.setHeader('X-Cache', 'MISS');
      return sendSuccess(res, results);
    } catch (error: any) {
      return sendError(res, 'Failed to search villages');
    }
  },

  // ─── GET /v1/geo/villages/autocomplete?q=&limit= ─────────────────────────
  autocomplete: async (req: Request, res: Response) => {
    try {
      const q     = (req.query.q as string)?.trim();
      const limit = Math.min(20, Math.max(1, parseInt(req.query.limit as string) || 10));

      if (!q || q.length < 2) {
        return sendError(res, 'Query parameter "q" must be at least 2 characters', 400, 'INVALID_QUERY');
      }

      const key = cacheKey('autocomplete', q.toLowerCase(), limit);
      const cached = await getCached<any[]>(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return sendSuccess(res, cached);
      }

      const results = await villageService.autocomplete(q, limit);
      await setCached(key, results, TTL.AUTOCOMPLETE);
      res.setHeader('X-Cache', 'MISS');
      return sendSuccess(res, results);
    } catch (error: any) {
      return sendError(res, 'Failed to get autocomplete suggestions');
    }
  },
};
