/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a self-contained server bundle in .next/standalone: server.js plus only
  // the traced node_modules it actually needs. The deployment ZIP then carries no
  // dev dependencies and requires no `pnpm install` or `next build` on Hostinger,
  // which removes the build-time process/CPU spike from the server entirely.
  output: "standalone",

  // The previous experimental { workerThreads: false, cpus: 1 } block was removed:
  // those options only limited build-time workers and had no effect on runtime
  // process count. Runtime processes are governed by the Prisma query engine and
  // the Node threadpool instead (see lib/prisma.ts). The build now runs on a dev
  // machine rather than the constrained shared host, so build workers are free.

  // `tsc --noEmit` passes clean, so typescript.ignoreBuildErrors was removed:
  // the build now surfaces type regressions instead of shipping them to
  // production as runtime 500s. Lint runs separately via `pnpm lint`.
}

export default nextConfig
