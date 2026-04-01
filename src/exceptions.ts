export class Animate3DError extends Error {
  constructor(message: string, public rid?: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class AuthenticationError extends Animate3DError {
  constructor(message: string) {
    super(message);
  }
}

export class APIError extends Animate3DError {
  constructor(message: string, public status_code?: number, rid?: string) {
    super(message, rid);
  }
}

export class ValidationError extends Animate3DError {
  constructor(message: string) {
    super(message);
  }
}

export class TimeoutError extends Animate3DError {
  constructor(message: string, rid?: string) {
    super(message, rid);
  }
}