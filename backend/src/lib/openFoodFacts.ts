// Servicio de búsqueda de alimentos usando la API pública de Open Food Facts.

export interface FoodSearchResult {
  source: 'openfoodfacts';
  code: string;
  name: string;
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatsPer100: number;
  fiberPer100: number;
  servingGrams: number | null;
  kcalPerServing: number | null;
  proteinPerServing: number | null;
  carbsPerServing: number | null;
  fatsPerServing: number | null;
  imageUrl: string | null;
}

const SEARCH_URL = 'https://world.openfoodfacts.org/api/v2/search';
const KJ_PER_KCAL = 4.184;

function toNum(v: unknown): number {
  if (typeof v === 'number' && isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = parseFloat(v.replace(',', '.'));
    if (isFinite(n)) return n;
  }
  return 0;
}

function kcalFrom(nutriments: Record<string, unknown>): number {
  const direct = toNum(nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal']);
  if (direct > 0) return direct;
  const kj = toNum(nutriments['energy_100g'] ?? nutriments['energy']);
  return kj > 0 ? Math.round((kj / KJ_PER_KCAL) * 10) / 10 : 0;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export async function searchOpenFoodFacts(query: string, limit = 15): Promise<FoodSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = new URL(SEARCH_URL);
  url.searchParams.set('query', trimmed);
  url.searchParams.set('page_size', String(limit));
  url.searchParams.set('lang', 'es');
  url.searchParams.set(
    'fields',
    'code,product_name,brands,nutriments,serving_size,serving_quantity,image_front_small_url'
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    let res: Response | null = null;
    let lastStatus = 0;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
      }
      res = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { 'User-Agent': 'MiFitness180/1.0 (app personal de seguimiento nutricional)' },
      });
      lastStatus = res.status;
      if (res.ok) break;
    }
    if (!res?.ok) {
      throw new Error(`Open Food Facts respondió con estado ${lastStatus}`);
    }
    const data = (await res.json()) as { products?: unknown[] };
    const products = Array.isArray(data.products) ? data.products : [];
    const results: FoodSearchResult[] = [];

    for (const raw of products) {
      const p = (raw ?? {}) as Record<string, unknown>;
      const name = String(p.product_name ?? '').trim();
      if (!name) continue;

      const nutriments = (p.nutriments ?? {}) as Record<string, unknown>;
      const kcal = kcalFrom(nutriments);
      const protein = round1(toNum(nutriments['proteins_100g']));
      const carbs = round1(toNum(nutriments['carbohydrates_100g']));
      const fats = round1(toNum(nutriments['fat_100g']));
      const fiber = round1(toNum(nutriments['fiber_100g']));

      if (kcal <= 0 && protein <= 0 && carbs <= 0 && fats <= 0) continue;

      const servingGrams = toNum(p.serving_quantity);
      const hasServing = servingGrams > 0;

      results.push({
        source: 'openfoodfacts',
        code: String(p.code ?? ''),
        name: hasServing && String(p.brands ?? '').trim() ? `${String(p.brands).trim()} - ${name}` : name,
        kcalPer100: kcal,
        proteinPer100: protein,
        carbsPer100: carbs,
        fatsPer100: fats,
        fiberPer100: fiber,
        servingGrams: hasServing ? Math.round(servingGrams * 10) / 10 : null,
        kcalPerServing: hasServing ? round1(toNum(nutriments['energy-kcal_serving'])) || null : null,
        proteinPerServing: hasServing ? round1(toNum(nutriments['proteins_serving'])) || null : null,
        carbsPerServing: hasServing ? round1(toNum(nutriments['carbohydrates_serving'])) || null : null,
        fatsPerServing: hasServing ? round1(toNum(nutriments['fat_serving'])) || null : null,
        imageUrl: p.image_front_small_url ? String(p.image_front_small_url) : null,
      });
    }

    return results;
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      throw new Error('La búsqueda en Open Food Facts tardó demasiado');
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}