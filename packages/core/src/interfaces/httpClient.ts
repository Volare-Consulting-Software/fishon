export interface HttpClient {
  get<T>(url: string, headers?: Record<string, string>): Promise<T>;
  /** Fetch a resource as raw text (e.g. HTML/JS), without JSON parsing. */
  getText(url: string, headers?: Record<string, string>): Promise<string>;
}
