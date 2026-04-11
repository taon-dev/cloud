//#region imports
import { CustomColumn, Taon, TaonEntity } from 'taon/src';
import {
  TaonBaseAbstractEntity,
  Column,
  String500Column,
  SimpleJsonColumn,
} from 'taon/src';
import { _, chalk, dateformat } from 'tnp-core/src';

import { ProcessesDefaultsValues } from './processes.defaults-values';
import { ProcessesState } from './processes.models';

//#endregion

@TaonEntity({
  className: 'Processes',
  createTable: true,
})
export class Processes extends TaonBaseAbstractEntity<Processes> {
  //#region @websql
  @CustomColumn({
    type: 'varchar',
    length: 1500,
    nullable: false,
  })
  //#endregion
  command: string;

  //#region @websql
  @CustomColumn({
    type: 'varchar',
    length: 500,
    default: process.cwd(),
  })
  //#endregion
  cwd: string;

  //#region @websql
  @CustomColumn({
    type: 'varchar',
    length: 20,
    default: ProcessesState.NOT_STARTED,
    nullable: false,
  })
  //#endregion
  state: ProcessesState;

  //#region @websql
  @CustomColumn({
    type: 'int',
    default: null,
    nullable: true,
  })
  //#endregion
  pid: number;

  //#region @websql
  @CustomColumn({
    type: 'int',
    default: null,
    nullable: true,
  })
  //#endregion
  ppid: number;

  //#region @websql
  @SimpleJsonColumn()
  //#endregion
  conditionProcessActiveStdout: string[];

  //#region @websql
  @SimpleJsonColumn()
  //#endregion
  conditionProcessActiveStderr: string[];

  //#region @websql
  @CustomColumn({
    type: 'text',
    default: '',
  })
  //#endregion

  /**
   * last 40 lines of output
   * (combined stdout + stderr)
   */
  outputLast40lines: string;

  //#region @websql
  @String500Column()
  //#endregion

  /**
   * absolute path to file where stdout + stderr is logged
   */
  fileLogAbsPath: string;

  //#region getters / preview string
  get previewString(): string {
    return `${this.id} ${this.command} in ${this.cwd} `;
  }
  //#endregion

  fullPreviewString(options?: { boldValues?: boolean }): string {
    //#region @websqlFunc
    options = options || {};
    const boldValues = !!options.boldValues;

    const boldFn = (str: string | number) =>
      boldValues ? chalk.bold(str?.toString()) : str;

    const processFromDB = this;

    return `
  > id: ${boldFn(processFromDB.id)}
  > cwd: ${boldFn(processFromDB.cwd)}
  > command: ${boldFn(processFromDB.command)}
  > state: ${boldFn(processFromDB.state)}
  > pid: ${boldFn(processFromDB.pid)}
  > ppid: ${boldFn(processFromDB.ppid)}
  > log path: ${boldFn(processFromDB.fileLogAbsPath)}
  > conditionProcessActiveStdout: ${boldFn((processFromDB.conditionProcessActiveStdout || []).join(', ') || '<empty>')}
  > conditionProcessActiveStderr: ${boldFn((processFromDB.conditionProcessActiveStderr || []).join(', ') || '<empty>')}
    `;
    //#endregion
  }
}