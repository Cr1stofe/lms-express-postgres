import type { Core } from '../core.ts';
import type { Handler } from '../router.ts';

export abstract class CoreProvider {
  core: Core;
  router: Core['router'];
  db: Core['db'];
  mail: Core['mail'];
  constructor(core: Core) {
    this.core = core;
    this.router = core.router;
    this.db = core.db;
    this.mail = core.mail;
  }
}

export abstract class Api extends CoreProvider {
  handlers: Record<string, Handler> = {};
  tables() {}
  routes() {}
  init() {
    this.tables();
    this.routes();
  }
}

export abstract class Query {
  db: Core['db'];
  constructor(db: Core['db']) {
    this.db = db;
  }
}
