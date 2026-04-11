//#region imports
import { Taon, ClassHelpers, TaonController } from 'taon/src';
import { GET, Query, TaonBaseCrudController } from 'taon/src';
import { _, dateformat, Helpers } from 'tnp-core/src';
import { TaonBaseCliWorkerController } from 'tnp-helpers/src';

import { ERR_MESSAGE_PROCESS_NOT_FOUND } from '../constants';

import { Processes } from './processes';
import {
  ProcessesState,
  ProcessesStatesAllowedStart,
} from './processes.models';
import { ProcessesRepository } from './processes.repository';

//#endregion

@TaonController({
  className: 'ProcessesController',
})
export class ProcessesController extends TaonBaseCrudController<Processes> {
  entityClassResolveFn: () => typeof Processes = () => Processes;

  // @ts-ignore
  private processesRepository = this.injectCustomRepo(ProcessesRepository);

  //#region get by process id
  @GET()
  getByProcessID(
    @Query('processId')
    processId: number | string,
  ): Taon.Response<Processes> {

    //#region @websqlFunc
    return async (req, res) => {
      if (!processId) {
        throw new Error(`No processId query param provided!`);
      }
      const proc = await this.processesRepository.getByProcessID(processId);
      if (!proc) {
        throw Taon.error({
          code: ERR_MESSAGE_PROCESS_NOT_FOUND,
          message: `No process found by given processId: ${processId}`,
          status: 404,
        });
      }
      return proc;
    };
    //#endregion

  }
  //#endregion

  //#region get by unique params
  @GET()
  getByUniqueParams(
    @Query('cwd')
    cwd: string,
    @Query('command')
    command: string,
  ): Taon.Response<Processes> {

    //#region @websqlFunc
    return async (req, res) => {
      if (!cwd) {
        throw new Error(`No cwd query param provided!`);
      }
      if (!command) {
        throw new Error(`No command query param provided!`);
      }
      const proc = await this.processesRepository.getByUniqueParams({
        cwd,
        command,
      });
      if (!proc) {
        throw new Error(`No process found by given unique params!
          cwd: ${cwd}
          command: ${command}
          `);
      }
      return proc;
    };
    //#endregion

  }
  //#endregion

  //#region trigger start process
  @GET()
  triggerStart(
    @Query('processId')
    processId: number | string,
    @Query('processName') processName?: string,
  ): Taon.Response<void> {

    //#region @websqlFunc
    return async (req, res) => {
      if (!processId) {
        throw new Error(`No processId queryParm provided!`);
      }
      await this.processesRepository.triggerStart(processId, {
        processName,
      });
    };
    //#endregion

  }
  //#endregion

  //#region trigger stop process
  @GET()
  triggerStop(
    @Query('processId')
    processId: number | string,
    @Query('deleteAfterKill')
    deleteAfterKill?: boolean,
  ): Taon.Response<void> {

    //#region @websqlFunc
    return async (req, res) => {
      if (!processId) {
        throw new Error(`No processId queryParm provided!`);
      }
      await this.processesRepository.triggerStop(processId, {
        deleteAfterKill,
      });
    };
    //#endregion

  }
  //#endregion

  //#region wait until deployment removed
  async waitUntilProcessDeleted(processId: string | number): Promise<void> {

    //#region @backendFunc
    await this._waitForProperStatusChange<Processes>({
      actionName: `Waiting until process ${processId} is removed`,
      request: () => {
        // console.log(`Checking if process ${processId} deleted...`);
        return this.getByProcessID(processId).request({
          timeout: 1000,
        });
      },
      loopRequestsOnBackendError: opt => {
        //  console.log(opt);
        if (
          opt.taonError &&
          opt.taonError.body.json.code === ERR_MESSAGE_PROCESS_NOT_FOUND
        ) {
          return false;
        }
        return true;
      },
    });
    //#endregion

  }
  //#endregion

  //#region wait until deployment removed
  async waitUntilProcessStopped(processId: string | number): Promise<void> {

    //#region @backendFunc
    await this._waitForProperStatusChange<Processes>({
      actionName: `Waiting until process ${processId} stopped`,
      request: () => {
        return this.getByProcessID(processId).request({
          timeout: 1000,
        });
      },
      poolingInterval: 1000,
      statusCheck: resp => {
        return ProcessesStatesAllowedStart.includes(resp.body.json.state);
      },
      loopRequestsOnBackendError: opt => {
        // console.log(opt);
        return true;
      },
    });
    //#endregion

  }
  //#endregion

}
