// Re-exports the default-location generated Prisma client. Deliberately NOT using a custom
// `output` path in schema.prisma — Vercel's serverless bundler traces files under node_modules
// reliably, but a custom output path outside node_modules was getting dropped from the deployed
// function, causing PrismaClientInitializationError at runtime.
export * from "@prisma/client";
