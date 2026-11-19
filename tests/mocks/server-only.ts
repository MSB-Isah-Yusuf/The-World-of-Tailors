// Vitest runs in a Node context that lacks Next.js' server-only condition.
// Keep the production package import intact; this alias only makes the guard inert in unit tests.
export {};
