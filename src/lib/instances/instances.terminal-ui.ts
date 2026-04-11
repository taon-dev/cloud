//#region imports
import {
  CoreModels,
  Helpers,
  UtilsNetwork,
  UtilsTerminal,
  _,
} from 'tnp-core/src';
import {
  BaseCliWorkerTerminalUI,
  BaseWorkerTerminalActionReturnType,
} from 'tnp-helpers/src';

import { Instances } from './instances';
import { InstancesWorker } from './instances.worker';
//#endregion

export class InstancesTerminalUI extends BaseCliWorkerTerminalUI<InstancesWorker> {
  async headerText(): Promise<string> {
    return null;
  }

  textHeaderStyle(): CoreModels.CfontStyle {
    return 'slick';
  }

  getWorkerTerminalActions(options?: {
    exitIsOnlyReturn?: boolean;
    chooseAction?: boolean;
  }): BaseWorkerTerminalActionReturnType {

    //#region @backendFunc
    const myActions: BaseWorkerTerminalActionReturnType = {
      getStuffFromBackend: {
        name: 'Get instances list',
        action: async () => {
          Helpers.info(`Fetching list...`);
          const ctrl = await this.worker.getRemoteControllerFor({
            methodOptions: {
              calledFrom: 'Get instances backend terminal action',
            },
          });
          const list = (await ctrl.getEntities().request())?.body.json || [];
          console.log(
            list.map(c => `- ${c.id} ${c.name} ${c.ipAddress}`).join('\n'),
          );
          Helpers.info(`Fetched ${list.length} entities`);
          await UtilsTerminal.pressAnyKeyToContinueAsync({
            message: 'Press any key to go back to main menu',
          });
        },
      },
      deleteInstance: {
        name: 'Delete instance',
        action: async () => {
          Helpers.info(`Fetching list...`);
          const ctrl = await this.worker.getRemoteControllerFor({
            methodOptions: {
              calledFrom: 'Get stuff from backend action',
            },
          });
          const list = (await ctrl.getEntities().request())?.body.json || [];

          const choices = list.map(c => ({
            name: `${c.id} ${c.name} ${c.ipAddress}`,
            value: c.id,
          }));

          const id = await UtilsTerminal.select({
            question: 'Select instance to delete',
            autocomplete: true,
            choices: [{ name: '- back -', value: '' }, ...choices],
          });
          const instance = id && list.find(l => l.id === id);

          if (instance) {
            Helpers.info(`Deleting instance with

              ip:${instance.ipAddress}
              name:${instance.name}

              `);
            if (
              await UtilsTerminal.confirm({
                message: 'Are you sure you want this instance ?',
              })
            ) {
              try {
                Helpers.taskStarted('Deleting instance');
                await ctrl.delete(instance.id).request();
                await UtilsTerminal.pressAnyKeyToContinueAsync({
                  message:
                    'Instance deleted. Press any key to go back to main menu',
                });
              } catch (error) {
                await UtilsTerminal.pressAnyKeyToContinueAsync({
                  message:
                    'Error deleting instance. Press any key to go back to main menu',
                });
              }
            }
          }
        },
      },
      insertDeployment: {
        name: 'Create new instance',
        action: async () => {
          Helpers.info(`Inserting new deployment`);
          const ctrl = await this.worker.getRemoteControllerFor({
            methodOptions: {
              calledFrom: 'Insert new deployment action',
            },
          });

          while (true) {
            try {

              //#region terminal form
              const ipAddress = await UtilsTerminal.input({
                required: true,
                question: 'Enter IP address of the instance',
                validate: val => {
                  if (val?.trim() === CoreModels.localhostIp127) {
                    return false;
                  }
                  if (val?.trim() === 'localhost') {
                    return false;
                  }
                  return UtilsNetwork.isValidIp(val);
                },
              });

              const nameOfInstance = await UtilsTerminal.input({
                required: true,
                question: 'Enter name of instance',
                validate: val => {
                  if (!val || val.trim() === '') {
                    return false;
                  }
                  return val.trim().length > 3;
                },
              });
              //#endregion

              const instance = await ctrl
                .insertEntity(
                  new Instances().clone({
                    ipAddress,
                    name: nameOfInstance,
                  }),
                )
                .request()
                .then(r => r.body.json);

              await UtilsTerminal.pressAnyKeyToContinueAsync({
                message: `Instance (id=${instance.id}) created. Press any key to go back to main menu`,
              });
              break;
            } catch (error) {

              //#region error handling
              if (
                await UtilsTerminal.confirm({
                  message: 'Error creating instance. Try again ?',
                })
              ) {
                continue;
              } else {
                break;
              }
              //#endregion

            }
          }
        },
      },
    };

    return {
      ...this.chooseAction,
      ...myActions,
      ...super.getWorkerTerminalActions({
        ...options,
        chooseAction: false,
      }),
    };
    //#endregion

  }
}