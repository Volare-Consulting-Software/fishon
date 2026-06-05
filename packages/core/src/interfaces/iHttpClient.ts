export interface IHttpClient {
  get<T>(url: string, headers?: Record<string, string>): Promise<T>;
}
