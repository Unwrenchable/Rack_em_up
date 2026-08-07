// Ambient stubs only for packages without usable type packages.
// Do NOT declare 'express' here — it overrides @types/express and
// makes Request/Response resolve to undici Fetch types (build break).
declare module 'bcrypt';
declare module 'passport-jwt';
