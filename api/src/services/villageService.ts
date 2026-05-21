import { prisma } from '../config/database';

export const villageService = {
  // ─── States ───────────────────────────────────────────────────────────────
  getStates: async () => {
    return prisma.state.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true },
    });
  },

  // ─── Districts by State ───────────────────────────────────────────────────
  getDistrictsByState: async (stateId: string) => {
    return prisma.district.findMany({
      where: { stateId },
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true },
    });
  },

  // ─── Sub-Districts by District ────────────────────────────────────────────
  getSubDistrictsByDistrict: async (districtId: string) => {
    return prisma.subDistrict.findMany({
      where: { districtId },
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true },
    });
  },

  // ─── Villages by Sub-District (paginated) ─────────────────────────────────
  getVillagesBySubDistrict: async (
    subDistrictId: string,
    page = 1,
    limit = 100
  ) => {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.village.findMany({
        where: { subDistrictId },
        orderBy: { name: 'asc' },
        select: { id: true, code: true, name: true },
        skip,
        take: limit,
      }),
      prisma.village.count({ where: { subDistrictId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  // ─── Single Village with full hierarchy ───────────────────────────────────
  getVillageById: async (id: string) => {
    const village = await prisma.village.findUnique({
      where: { id },
      include: {
        subDistrict: {
          include: {
            district: {
              include: {
                state: {
                  include: { country: true },
                },
              },
            },
          },
        },
      },
    });
    if (!village) return null;
    return formatVillageResponse(village);
  },

  // ─── Full-text search (filters optional) ──────────────────────────────────
  searchVillages: async (
    query: string,
    filters: { stateId?: string; districtId?: string; subDistrictId?: string } = {},
    limit = 20
  ) => {
    // PostgreSQL: uses trigram GIN index for fast ILIKE via mode: 'insensitive'
    // (setup_indexes.sql must be run first to create the GIN index)
    const villages = await prisma.village.findMany({
      where: {
        name: { contains: query, mode: 'insensitive' },
        ...(filters.subDistrictId && { subDistrictId: filters.subDistrictId }),
        ...(filters.districtId && {
          subDistrict: { districtId: filters.districtId },
        }),
        ...(filters.stateId && {
          subDistrict: { district: { stateId: filters.stateId } },
        }),
      },
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        subDistrict: {
          include: {
            district: {
              include: { state: { include: { country: true } } },
            },
          },
        },
      },
    });
    return villages.map(formatVillageResponse);
  },

  // ─── Autocomplete (typeahead) ──────────────────────────────────────────────
  autocomplete: async (query: string, limit = 10) => {
    const villages = await prisma.village.findMany({
      where: { name: { contains: query, mode: 'insensitive' } },
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        subDistrict: {
          include: {
            district: {
              include: { state: true },
            },
          },
        },
      },
    });
    return villages.map(formatVillageResponse);
  },
};

// ─── Shared formatter (PRD drop-down format) ────────────────────────────────
function formatVillageResponse(v: any) {
  const sd = v.subDistrict;
  const dist = sd?.district;
  const state = dist?.state;
  const country = state?.country;
  return {
    value: v.id,
    label: v.name,
    fullAddress: `${v.name}, ${sd?.name ?? ''}, ${dist?.name ?? ''}, ${state?.name ?? ''}, ${country?.name ?? 'India'}`,
    hierarchy: {
      village: v.name,
      villageCode: v.code,
      subDistrict: sd?.name ?? '',
      district: dist?.name ?? '',
      state: state?.name ?? '',
      country: country?.name ?? 'India',
    },
  };
}
