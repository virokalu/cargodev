// Typed service errors — every service in lib/services/* throws this instead of
// a raw Error or a string. Entry points (Server Actions, Route Handlers) catch
// ServiceError and shape it for their client: form field errors for the web
// app, JSON status codes for the future mobile API. A closed set of codes can
// be mapped consistently; `catch (e) { alert(e.message) }` cannot.

export type ServiceErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "VALIDATION"
  | "CONFLICT"
  | "INTERNAL";

export class ServiceError extends Error {
  constructor(
    public code: ServiceErrorCode,
    message: string,
    public fieldErrors?: Record<string, string>
  ) {
    super(message);
    this.name = "ServiceError";
  }
}
