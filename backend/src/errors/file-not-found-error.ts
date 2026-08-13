import { CustomError } from './custom-error';

export class FileNotFoundError extends CustomError {
  statusCode = 400;

  constructor() {
    super('Multipart Error', 'Could not process multipart data!', 'error');
    Object.setPrototypeOf(this, FileNotFoundError.prototype);
  }

  serializeErrors() {
    return [{ summary: 'Multipart Error', detail: 'Could not process multipart data!', severity: 'error' }];
  }
}
