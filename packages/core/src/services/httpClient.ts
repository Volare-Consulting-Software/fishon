import https from "https";
import { injectable } from "tsyringe";
import { IHttpClient } from "../interfaces";

@injectable()
export class HttpClient implements IHttpClient {
  get<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      https
        .get(url, (res) => {
          let data = "";
          res.on("data", (chunk: Buffer) => (data += chunk.toString()));
          res.on("end", () => {
            try {
              resolve(JSON.parse(data) as T);
            } catch {
              reject(new Error(`Invalid JSON from ${url}`));
            }
          });
        })
        .on("error", reject);
    });
  }
}
