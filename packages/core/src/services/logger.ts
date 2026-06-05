import { injectable } from "tsyringe";
import { Logger } from "../interfaces";

@injectable()
export class ConsoleLogger implements Logger {
  info(message: string): void {
    console.log(message);
  }

  warn(message: string): void {
    console.warn(message);
  }

  error(message: string): void {
    console.error(message);
  }
}
