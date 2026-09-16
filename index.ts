import { readFile } from 'node:fs/promises';
import { AuthApi } from './api/auth/index.ts';
import { LmsApi } from './api/lms/index.ts';
import { Core } from './core/core.ts';
import { logger } from './core/middleware/logger.ts';
import { rateLimit } from './core/middleware/rate-limit.ts';
import { FilesApi } from './api/files/index.ts';

const core = new Core();

core.router.use([logger, rateLimit(10_000, 100)]);

new AuthApi(core).init();
new LmsApi(core).init();
new FilesApi(core).init();

core.init();

// shutdown

function shutdown(signal: string) {
  console.log(signal);
  core.server.close(() => {
    console.log('HTTP server closed.');
    core.db.close();
    process.exit(0);
  });
  core.server.closeAllConnections();
  setTimeout(() => {
    process.exit(0);
  }, 5_000).unref();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
