//#region imports
import { _, Helpers } from 'tnp-core/src';
import { BaseCliWorker } from 'tnp-helpers/src';

import { CURRENT_PACKAGE_VERSION } from '../build-info._auto-generated_';

import { ProcessesContext } from './processes.context';
import { ProcessesController } from './processes.controller';
import { ProcessesTerminalUI } from './processes.terminal-ui';
import { ProcessesWorkerController } from './processes.worker.controller';
//#endregion

export class ProcessesWorker extends BaseCliWorker<
  ProcessesWorkerController,
  ProcessesTerminalUI
> {
  //#region properties
  // TODO 'as any' for some reason is necessary
  // TypeScript d.ts generation bug
  workerContextTemplate = ProcessesContext as any;

  // TODO ts ignore needed for some reason
  // @ts-ignore
  terminalUI = new ProcessesTerminalUI(this);

  controllerClass = ProcessesWorkerController;
  //#endregion

  //#region constructor
  constructor(
    /**
     * unique id for service
     */
    serviceID: string,
    /**
     * external command that will start service
     */
    startCommandFn: () => string,
  ) {
    // replace '0.0.0' with CURRENT_PACKAGE_VERSION for versioning
    super(serviceID, startCommandFn, CURRENT_PACKAGE_VERSION);
  }
  //#endregion

  public async startNormallyInCurrentProcess(): Promise<void> {
    //#region @backendFunc
    await super.startNormallyInCurrentProcess({
      actionBeforeTerminalUI: async () => {
        const ctx = await this.getRemoteContextFor({
          methodOptions: {
            calledFrom: 'processes startNormallyInCurrentProcess',
          },
        });
        const processController = ctx.getInstanceBy(ProcessesController);
        Helpers.info(`Clearing processes table before starting terminal UI`);
        await processController.clearTable(); // clear processes from previous runs
      },
    });

    // await UtilsTerminal.pressAnyKeyToContinueAsync();
    //#endregion
  }
}
