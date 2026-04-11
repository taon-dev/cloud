import { debounceTime, exhaustMap, map, Subscription } from 'rxjs';
import {
  Helpers,
  UtilsTerminal,
  UtilsProcessLogger,
  Utils,
} from 'tnp-core/src';

import { ProcessesController } from './processes.controller';

export namespace ProcessesUtils {
  export const displayRealtimeProgressMonitor = async (
    processId: number | string,
    processesController: ProcessesController,
    options?: {
      resolveWhenTextInOutput?: string;
    },
  ): Promise<void> => {
    //#region @backendFunc
    if (!processId) {
      throw new Error(`processId is required`);
    }
    if (!processesController) {
      throw new Error(`processesController is required`);
    }
    options = options || {};
    UtilsTerminal.clearConsole();
    const wrap = UtilsProcessLogger.createStickyTopBox(
      `PROCESS REALTIME OUTPUT - PRESS ENTER KEY TO STOP`,
    );
    wrap.clear();
    // wrap.update(`Waiting for process id=${processId} to start...`);
    // await processesController.waitUntilProcessExists(processId);

    // await UtilsTerminal.pressAnyKeyToContinueAsync({
    //   message: `Process started. Listening for realtime output...`,
    // });
    wrap.update(`PRESS ANY KEY TO STOP DISPLAYING PROGRESS...`);
    const procData = await processesController
      .getByProcessID(processId)
      .request();

    const proc = procData.body.json;
    if (proc.outputLast40lines) {
      await Utils.waitMilliseconds(500);
      wrap.clear();
      wrap.update(proc.outputLast40lines);
    }
    // Helpers.info(`Listening for process id=${processId}  realtime output...`);
    let displayLogs = true;
    const unSub: Subscription = await new Promise((resolve, reject) => {
      const sub = processesController.ctx.realtimeClient
        .listenChangesEntity(proc, {
          property: 'outputLast40lines',
        })
        .pipe(
          debounceTime(500),
          exhaustMap(() => {
            return processesController
              .getByProcessID(proc.id)
              .request() // @ts-ignore
              .observable.pipe(map(r => r.body.rawJson));
          }),
          map(p => {
            return p;
          }),
        )
        .subscribe(data => {
          if (displayLogs) {
            // UtilsTerminal.clearConsole();
            wrap.clear();
            wrap.update(data.outputLast40lines);
            // process.stdout.write(data.outputLast40lines);
            if (
              options.resolveWhenTextInOutput &&
              data?.outputLast40lines
                ?.toString()
                .includes(options.resolveWhenTextInOutput)
            ) {
              process.stdin.emit('data', Buffer.from('\n'));
            }
          }
        });
      let closing = false;

      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on('data', () => {
        if (closing) {
          return;
        }
        displayLogs = false;
        resolve(sub);
      });
    });

    UtilsTerminal.clearConsole();
    try {
      unSub.unsubscribe();
    } catch (error) {}

    // console.log(`Starting started...`);
    // await UtilsTerminal.pressAnyKeyToContinueAsync();
    //#endregion
  };
  //#endregion
}
