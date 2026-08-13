import { CustomError } from './custom-error';

export class NotFoundError extends CustomError {
  statusCode = 404;

  constructor() {
    super('Not Found Error', 'The requested endpoint could not be found.', 'error');
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }

  serializeErrors() {
    return [{ summary: 'Not Found Error', detail: 'The requested endpoint could not be found.', severity: 'error' }];
  }
}
