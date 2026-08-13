export abstract class CustomError extends Error {
  abstract statusCode: number;

  constructor(summary: string, detail: string, severity: string) {
    super(summary);
    Object.setPrototypeOf(this, CustomError.prototype);
  }

  abstract serializeErrors(): { summary: string; detail: string; severity: string }[];
}
