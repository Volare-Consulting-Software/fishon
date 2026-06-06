import { inject, injectable } from "tsyringe";
import { TOKENS, HttpClient, Logger, FishRulesClient } from "../interfaces";
import { ForecastServiceConfig } from "../config";
import {
  FishRulesLocationEntry,
  FishRulesLocationResponse,
  FishRulesRegulationDetail,
  FishRulesDetailResponse,
} from "../types/fishRules";

interface Credentials {
  clientId: string;
  apiKey: string;
}

// Talks to the public Fish Rules API. The x-api-key/x-client-id are public
// constants from the site's JS bundle and are not currently enforced, but we
// send them as a courtesy. To survive a key rotation we try to capture the
// current pair at runtime from the live bundle (cached for the process), and
// fall back to the values baked into config. An explicit env override
// (FISHRULES_CLIENT_ID + FISHRULES_API_KEY) short-circuits the scrape.
// Regulations change slowly; keep area/detail responses for a day per process.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry<T> {
  at: number;
  value: Promise<T>;
}

@injectable()
export class FishRulesApiClient implements FishRulesClient {
  private areaCache = new Map<string, CacheEntry<FishRulesLocationEntry[]>>();
  private detailCache = new Map<number, CacheEntry<FishRulesRegulationDetail | null>>();
  private credentialsPromise: Promise<Credentials> | null = null;

  constructor(
    @inject(TOKENS.HttpClient) private readonly httpClient: HttpClient,
    @inject(TOKENS.ForecastServiceConfig)
    private readonly config: ForecastServiceConfig,
    @inject(TOKENS.Logger) private readonly logger: Logger
  ) {}

  imageUrl(fishId: number): string {
    return `${this.config.fishRulesImageUrl}/${fishId}/${fishId}.jpg`;
  }

  getAreaSpecies(lat: number, lng: number): Promise<FishRulesLocationEntry[]> {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    return this.cached(this.areaCache, key, () =>
      this.fetchAreaSpecies(lat, lng)
    );
  }

  getRegulationDetail(
    regulationId: number
  ): Promise<FishRulesRegulationDetail | null> {
    return this.cached(this.detailCache, regulationId, () =>
      this.fetchRegulationDetail(regulationId)
    );
  }

  // Shared TTL cache: reuse an in-flight/recent promise, refetch once stale.
  private cached<K, T>(
    cache: Map<K, CacheEntry<T>>,
    key: K,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
    const value = fetcher();
    cache.set(key, { at: Date.now(), value });
    return value;
  }

  private async fetchAreaSpecies(
    lat: number,
    lng: number
  ): Promise<FishRulesLocationEntry[]> {
    try {
      const headers = await this.headers();
      const data = await this.httpClient.get<FishRulesLocationResponse>(
        `${this.config.fishRulesApiUrl}/location/${lat}/${lng}`,
        headers
      );
      return data.results ?? [];
    } catch (err) {
      this.logger.warn(`Fish Rules area lookup failed: ${message(err)}`);
      return [];
    }
  }

  private async fetchRegulationDetail(
    regulationId: number
  ): Promise<FishRulesRegulationDetail | null> {
    try {
      const headers = await this.headers();
      const data = await this.httpClient.get<FishRulesDetailResponse>(
        `${this.config.fishRulesApiUrl}/${regulationId}`,
        headers
      );
      return data.results ?? null;
    } catch (err) {
      this.logger.warn(
        `Fish Rules detail ${regulationId} lookup failed: ${message(err)}`
      );
      return null;
    }
  }

  private async headers(): Promise<Record<string, string>> {
    const { clientId, apiKey } = await this.credentials();
    return {
      "x-client-id": clientId,
      "x-api-key": apiKey,
      "User-Agent": this.config.userAgent,
    };
  }

  private credentials(): Promise<Credentials> {
    const envClientId = process.env["FISHRULES_CLIENT_ID"];
    const envApiKey = process.env["FISHRULES_API_KEY"];
    if (envClientId && envApiKey) {
      return Promise.resolve({ clientId: envClientId, apiKey: envApiKey });
    }
    this.credentialsPromise ??= this.resolveCredentials();
    return this.credentialsPromise;
  }

  private async resolveCredentials(): Promise<Credentials> {
    const fallback: Credentials = {
      clientId: this.config.fishRulesClientId,
      apiKey: this.config.fishRulesApiKey,
    };
    try {
      const scraped = await this.scrapeCredentials();
      if (scraped) return scraped;
    } catch (err) {
      this.logger.warn(`Fish Rules key capture failed: ${message(err)}`);
    }
    return fallback;
  }

  // The bundle ships the pair as `"x-client-id":...||"<id>","x-api-key":...||"<key>"`.
  // We find the per-deploy _app chunk from the homepage, then regex it out.
  private async scrapeCredentials(): Promise<Credentials | null> {
    const origin = new URL(this.config.fishRulesApiUrl).origin;
    const ua = { "User-Agent": this.config.userAgent };

    const html = await this.httpClient.getText(`${origin}/`, ua);
    const chunkPath = html.match(
      /\/_next\/static\/chunks\/pages\/_app-[A-Za-z0-9]+\.js/
    )?.[0];
    if (!chunkPath) return null;

    const js = await this.httpClient.getText(`${origin}${chunkPath}`, ua);
    const apiKey = js.match(/"x-api-key":[^"]*"([^"]+)"/)?.[1];
    const clientId = js.match(/"x-client-id":[^"]*"([^"]+)"/)?.[1];
    if (!apiKey || !clientId) return null;

    this.logger.info("Fish Rules: captured current API key from live bundle");
    return { clientId, apiKey };
  }
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
