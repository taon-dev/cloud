//#region imports
import { Taon, ClassHelpers, TaonController } from 'taon/src';
import { _, dateformat, Helpers } from 'tnp-core/src';
import { TaonBaseCliWorkerController } from 'tnp-helpers/src';

import { Processes } from './processes';
import { ProcessesRepository } from './processes.repository';
//#endregion

@TaonController({
  className: 'ProcessesWorkerController',
})
export class ProcessesWorkerController extends TaonBaseCliWorkerController {}