import https from "https";
import { injectable } from "tsyringe";
import { HttpClient } from "../interfaces";

@injectable()
export class NodeHttpsClient implements HttpClient {
  get<T>(url: string, headers?: Record<string, string>): Promise<T> {
    return this.fetch(url, { Accept: "application/json", ...headers }).then(
      (data) => {
        try {
          return JSON.parse(data) as T;
        } catch {
          throw new Error(`Invalid JSON from ${url}`);
        }
      }
    );
  }

  getText(url: string, headers?: Record<string, string>): Promise<string> {
    return this.fetch(url, headers);
  }

  private fetch(
    url: string,
    headers?: Record<string, string>
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      https
        .get(url, { headers }, (res) => {
          let data = "";
          res.on("data", (chunk: Buffer) => (data += chunk.toString()));
          res.on("end", () => resolve(data));
        })
        .on("error", reject);
    });
  }
}
