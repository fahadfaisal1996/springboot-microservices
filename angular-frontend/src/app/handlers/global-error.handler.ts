import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    const message = error.message ? error.message : error.toString();
    console.error('[Global ErrorHandler Caught Exception]:', message, error);
  }
}
