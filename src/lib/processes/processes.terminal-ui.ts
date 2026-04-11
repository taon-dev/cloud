//#region imports
import { debounceTime, exhaustMap, map, Subscription } from 'rxjs';
import { config } from 'tnp-core/src';
import {
  CoreModels,
  Helpers,
  UtilsCliClassMethod,
  UtilsTerminal,
  _,
} from 'tnp-core/src';
import { UtilsOs } from 'tnp-core/src';
import {
  BaseCliWorkerTerminalUI,
  BaseWorkerTerminalActionReturnType,
} from 'tnp-helpers/src';

import { Processes } from './processes';
import { ProcessesController } from './processes.controller';
import { ProcessesStatesAllowedStart } from './processes.models';
import { ProcessesUtils } from './processes.utils';
import { ProcessesWorker } from './processes.worker';
//#endregion

let dummyProcessCreate = false;
export class ProcessesTerminalUI extends BaseCliWorkerTerminalUI<ProcessesWorker> {
  //#region header text
  protected async headerText(): Promise<string> {
    return 'Processes';
  }
  //#endregion

  //#region text header style
  protected textHeaderStyle(): CoreModels.CfontStyle {
    return 'simpleBlock';
  }
  //#endregion

  //#region dummy process params
  async getDummyProcessParams(): Promise<{ command: string; cwd: string }> {
    //#region @backendFunc
    // @ts-ignore
    const { $Global } = await import('tnp/src');
    const dummyDummyCommand = `${config.frameworkName} ${UtilsCliClassMethod.getFrom(
      $Global.prototype.showRandomHamstersTypes,
      { globalMethod: true },
    )}`;
    const dummyProcessCwd = UtilsOs.getRealHomeDir();
    return { command: dummyDummyCommand, cwd: dummyProcessCwd };
    //#endregion
  }
  //#endregion

  //#region refetch process
  protected async refetchProcess(
    process: Processes,
    processesController: ProcessesController,
  ): Promise<Processes> {
    //#region @backendFunc
    while (true) {
      try {
        process = (
          await processesController.getByProcessID(process.id).request()
        ).body.json;
        return process;
      } catch (error) {
        const fetchAgain = await UtilsTerminal.confirm({
          message: `Not able to fetch process (id=${process.id}). Try again?`,
          defaultValue: true,
        });
        if (!fetchAgain) {
          return;
        }
      }
    }
    //#endregion
  }
  //#endregion

  //#region crud menu for single deployment
  protected async crudMenuForSingleProcess(
    processFromDb: Processes,
    processesController: ProcessesController,
  ): Promise<void> {
    //#region @backendFunc
    while (true) {
      Helpers.info(`Fetching processes data...`);
      processFromDb = (
        await processesController.getByProcessID(processFromDb.id).request()
      ).body.json;

      UtilsTerminal.clearConsole();
      //       Helpers.info(`You selected process:
      //  id: ${processFromDb.id}
      //  command: ${processFromDb.command}
      //  cwd: ${processFromDb.cwd}
      //  state: ${processFromDb.state}`);

      const choices = {
        back: {
          name: ' - back - ',
        },
        startProcess: {
          name: 'Start Process',
        },
        processInfo: {
          name: 'Process Info',
        },
        realtimeProcessMonitor: {
          name: 'Realtime Monitor',
        },
        displayProcessLog: {
          name: 'Display Log File',
        },
        stopProcess: {
          name: 'Stop Process',
        },
        removeProcess: {
          name: 'Remove Process',
        },
      };

      if (ProcessesStatesAllowedStart.includes(processFromDb.state)) {
        delete choices.stopProcess;
        delete choices.realtimeProcessMonitor;
      } else {
        delete choices.startProcess;
      }

      const selected = await UtilsTerminal.select<keyof typeof choices>({
        choices,
        question: `[Process id=${processFromDb.id},status=${processFromDb.state}] What do you want to do?`,
      });

      switch (selected) {
        case 'back':
          return;
        case 'processInfo':
          processFromDb = await this.refetchProcess(
            processFromDb,
            processesController,
          );
          if (!processFromDb) {
            return;
          }
          UtilsTerminal.clearConsole();
          console.log(processFromDb.fullPreviewString({ boldValues: true }));
          await UtilsTerminal.pressAnyKeyToContinueAsync();
          break;
        case 'startProcess':
          await processesController.triggerStart(processFromDb.id).request();
          Helpers.info(`Triggered start for process`);
          await UtilsTerminal.pressAnyKeyToContinueAsync({
            message: 'Press any key to go back to main menu',
          });
          break;
        case 'realtimeProcessMonitor':
          await ProcessesUtils.displayRealtimeProgressMonitor(
            processFromDb.id,
            processesController,
          );
          break;
        case 'displayProcessLog':
          await UtilsTerminal.previewLongListGitLogLike(
            Helpers.readFile(processFromDb.fileLogAbsPath) ||
              '< empty log file >',
          );
          break;
        case 'stopProcess':
          await processesController.triggerStop(processFromDb.id).request();
          Helpers.info(`Triggered stop for process..please wait`);
          await processesController.waitUntilProcessStopped(processFromDb.id);
          await UtilsTerminal.pressAnyKeyToContinueAsync({
            message: 'Press any key to go back to main menu',
          });
          break;
        case 'removeProcess':
          await processesController
            .triggerStop(processFromDb.id, true)
            .request();

          Helpers.info(`Triggered remove of process... please wait... `);
          await processesController.waitUntilProcessDeleted(processFromDb.id);
          Helpers.info(`Process removed successfully.`);
          await UtilsTerminal.pressAnyKeyToContinueAsync({
            message: 'Press any key to go back to main menu',
          });
          return;
      }
    }
    //#endregion
  }
  //#endregion

  getWorkerTerminalActions(options?: {
    exitIsOnlyReturn?: boolean;
    chooseAction?: boolean;
  }): BaseWorkerTerminalActionReturnType {
    //#region @backendFunc

    const myActions: BaseWorkerTerminalActionReturnType = {
      //#region get all processes from backend
      getStuffFromBackend: {
        name: 'Get all processes from backend',
        action: async () => {
          // Helpers.info(`Stuff from backend will be fetched`);
          const processesController = await this.worker.getRemoteControllerFor({
            methodOptions: {
              calledFrom:
                'ProcessesTerminalUI.getWorkerTerminalActions/getStuffFromBackend',
            },
            controllerClass: ProcessesController,
          });

          while (true) {
            const list =
              (await processesController.getAll().request())?.body.json || [];
            Helpers.info(`Fetched ${list.length} processes from backend.`);

            const options = [
              { name: ' - back - ', value: 'back' },
              ...list.map(c => ({
                name: c.previewString,
                value: c.id?.toString(),
              })),
            ];

            const selected = await UtilsTerminal.select<string>({
              choices: options,
              question: 'Select process',
            });

            if (selected !== 'back') {
              await this.crudMenuForSingleProcess(
                list.find(l => l.id?.toString() === selected),
                processesController,
              );
            }

            if (selected === 'back') {
              return;
            }
          }
        },
      },
      //#endregion

      //#region create custom process
      startCustomProcess: {
        name: 'Start custom process',
        action: async () => {
          // Helpers.info(`Stuff from backend will be fetched`);
          const processesController = await this.worker.getRemoteControllerFor({
            methodOptions: {
              calledFrom:
                'ProcessesTerminalUI.getWorkerTerminalActions/startCustomProcess',
            },
            controllerClass: ProcessesController,
          });

          const command = await UtilsTerminal.input({
            required: true,
            question: 'Enter command to run:',
          });

          const processFromDBReq = await processesController
            .save(
              new Processes().clone({
                command,
                cwd: process.cwd(),
              }),
            )
            .request();
          const processFromDB = processFromDBReq.body.json;
          await processesController.triggerStart(processFromDB.id).request();

          Helpers.info(
            `Triggered start for process -

      > command: "${command}"

      `,
          );
          await UtilsTerminal.pressAnyKeyToContinueAsync({
            message: 'Press any key to go back to main menu',
          });
        },
      },
      //#endregion

      //#region create dummy process
      createDummyProcess: {
        name: 'DUMMY PROCESS - create and start',
        action: async () => {
          // Helpers.info(`Stuff from backend will be fetched`);

          try {
            const processesController =
              await this.worker.getRemoteControllerFor({
                methodOptions: {
                  calledFrom:
                    'ProcessesTerminalUI.getWorkerTerminalActions/createDummyProcess',
                },
                controllerClass: ProcessesController,
              });

            const { command, cwd } = await this.getDummyProcessParams();

            const processFromDBReq = await processesController
              .save(
                new Processes().clone({
                  command,
                  cwd,
                }),
              )
              .request();
            const processFromDB = processFromDBReq.body.json;
            await processesController.triggerStart(processFromDB.id).request();
            dummyProcessCreate = true;
            Helpers.info(
              `Triggered start for dummy process -

            > command: "${command}"

            `,
            );
          } catch (error) {
            console.log(error);
            await UtilsTerminal.pressAnyKeyToContinueAsync({
              message: 'Press any key to go back to main menu',
            });
          }
        },
      },
      //#endregion

      //#region stop dummy process
      stopDummyProcess: {
        name: 'DUMMY PROCESS - stop process',
        action: async () => {
          // Helpers.info(`Stuff from backend will be fetched`);
          const processesController = await this.worker.getRemoteControllerFor({
            methodOptions: {
              calledFrom:
                'ProcessesTerminalUI.getWorkerTerminalActions/stopDummyProcess',
            },
            controllerClass: ProcessesController,
          });
          const { command, cwd } = await this.getDummyProcessParams();
          const processFromDBReq = await processesController
            .save(
              new Processes().clone({
                command,
                cwd,
              }),
            )
            .request();
          const processFromDB = processFromDBReq.body.json;

          await processesController.triggerStop(processFromDB.id).request();

          Helpers.info(`Triggered stop for dummy process `);
          await UtilsTerminal.pressAnyKeyToContinueAsync({
            message: 'Press any key to go back to main menu',
          });
        },
      },
      //#endregion

      //#region get dummy process info
      getDummyProcessInfo: {
        name: 'DUMMY PROCESS - get info',
        action: async () => {
          // Helpers.info(`Stuff from backend will be fetched`);
          const processesController = await this.worker.getRemoteControllerFor({
            methodOptions: {
              calledFrom:
                'ProcessesTerminalUI.getWorkerTerminalActions/getDummyProcessInfo',
            },
            controllerClass: ProcessesController,
          });
          const { command, cwd } = await this.getDummyProcessParams();
          const processFromDBReq = await processesController
            .getByUniqueParams(cwd, command)
            .request();
          const processFromDB = processFromDBReq.body.json;

          Helpers.info(
            `
            Dummy process info:

  > id: ${processFromDB.id}
  > cwd: ${processFromDB.cwd}
  > command: ${processFromDB.command}
  > state: ${processFromDB.state}
  > pid: ${processFromDB.pid}
  > ppid: ${processFromDB.ppid}
  > log path: ${processFromDB.fileLogAbsPath}
  > conditionProcessActiveStdout: ${(processFromDB.conditionProcessActiveStdout || []).join(', ') || '<empty>'}
  > conditionProcessActiveStderr: ${(processFromDB.conditionProcessActiveStderr || []).join(', ') || '<empty>'}

            `,
          );
          await UtilsTerminal.pressAnyKeyToContinueAsync({
            message: 'Press any key to go back to main menu',
          });
        },
      },
      //#endregion

      //#region preview log file of dummy process
      getPreviewLogFile: {
        name: 'DUMMY PROCESS - preview log file',
        action: async () => {
          // Helpers.info(`Stuff from backend will be fetched`);
          const processesController = await this.worker.getRemoteControllerFor({
            methodOptions: {
              calledFrom:
                'ProcessesTerminalUI.getWorkerTerminalActions/getPreviewLogFile',
            },
            controllerClass: ProcessesController,
          });
          const { command, cwd } = await this.getDummyProcessParams();
          const processFromDBReq = await processesController
            .getByUniqueParams(cwd, command)
            .request();
          const processFromDB = processFromDBReq.body.json;

          await UtilsTerminal.previewLongListGitLogLike(
            Helpers.readFile(processFromDB.fileLogAbsPath) ||
              '< empty log file >',
          );
        },
      },
      //#endregion

      //#region get realtime preview of dummy process output
      realtimePreviewDummyProcess: {
        name: 'DUMMY PROCESS - get realtime preview',
        action: async () => {
          // Helpers.info(`Stuff from backend will be fetched`);
          const processesController = await this.worker.getRemoteControllerFor({
            methodOptions: {
              calledFrom: 'realtimePreviewDummyProcess',
            },
            controllerClass: ProcessesController,
          });
          const { command, cwd } = await this.getDummyProcessParams();
          const processFromDBReq = await processesController
            .getByUniqueParams(cwd, command)
            .request();
          const processFromDB = processFromDBReq.body.json;

          await ProcessesUtils.displayRealtimeProgressMonitor(
            processFromDB.id,
            processesController,
          );
        },
      },
      //#endregion
    };

    if (!dummyProcessCreate) {
      delete myActions.stopDummyProcess;
      delete myActions.getDummyProcessInfo;
      delete myActions.getPreviewLogFile;
      delete myActions.realtimePreviewDummyProcess;
    }

    return {
      ...this.chooseAction,
      ...myActions,
      ...super.getWorkerTerminalActions({ ...options, chooseAction: false }),
    };
    //#endregion
  }
}
