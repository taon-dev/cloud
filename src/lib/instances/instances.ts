//#region imports
import { Taon, TaonEntity } from 'taon/src';
import { TaonBaseAbstractEntity, Column, String200Column } from 'taon/src';
import { _ } from 'tnp-core/src';

import { InstancesDefaultsValues } from './instances.defaults-values';

//#endregion

@TaonEntity({
  className: 'Instances',
})
export class Instances extends TaonBaseAbstractEntity<Instances> {
  /**
   * zip file with docker-compose and other files
   * needed to deploy this deployment
   */

  //#region @websql
  @Column({
    type: 'varchar',
    length: 45,
    nullable: false,
    unique: true,
  })
  //#endregion
  ipAddress: string;

  //#region @websql
  @String200Column()
  //#endregion
  name: string;
}