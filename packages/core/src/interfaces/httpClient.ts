export interface HttpClient {
  get<T>(url: string, headers?: Record<string, string>): Promise<T>;
}
