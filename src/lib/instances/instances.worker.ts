//#region imports
import { _ } from 'tnp-core/src';
import { BaseCliWorker } from 'tnp-helpers/src';

import { CURRENT_PACKAGE_VERSION } from '../build-info._auto-generated_';

import { InstancesContext } from './instances.context';
import { InstancesController } from './instances.controller';
import { InstancesTerminalUI } from './instances.terminal-ui';
//#endregion

export class InstancesWorker extends BaseCliWorker<
  InstancesController,
  InstancesTerminalUI
> {
  //#region properties
  // TODO 'as any' for some reason is necessary
  // TypeScript d.ts generation bug
  workerContextTemplate = InstancesContext as any;

  // TODO ts ignore needed for some reason
  // @ts-ignore
  terminalUI = new InstancesTerminalUI(this);

  controllerClass = InstancesController;
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
    await super.startNormallyInCurrentProcess();
    const ctrl = await this.getRemoteControllerFor({
      methodOptions: {
        calledFrom: 'instances startNormallyInCurrentProcess',
      },
    });
    //#endregion
  }
}
