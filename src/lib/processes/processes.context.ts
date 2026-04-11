//#region imports
import { Taon, TaonBaseContext } from 'taon/src';
import { getBaseCliWorkerDatabaseConfig } from 'tnp-helpers/src';

import { Processes } from './processes';
import { ProcessesController } from './processes.controller';
import { ProcessesRepository } from './processes.repository';
import { ProcessesWorkerController } from './processes.worker.controller';
//#endregion

const appId = 'processes-worker-app.project.worker';

export const ProcessesContext = Taon.createContextTemplate(() => ({
  contextName: 'ProcessesContext', // not needed if using HOST_CONFIG object
  appId,
  skipWritingServerRoutes: true,
  contexts: { TaonBaseContext },
  repositories: { ProcessesRepository },
  database: true,
  entities: { Processes },
  controllers: { ProcessesController, ProcessesWorkerController },
  ...getBaseCliWorkerDatabaseConfig(appId, 'DROP_DB+MIGRATIONS'),
}));