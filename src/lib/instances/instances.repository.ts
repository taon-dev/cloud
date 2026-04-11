//#region imports
import { Taon, TaonRepository } from 'taon/src';
import { Raw } from 'taon-typeorm/src';
import { _ } from 'tnp-core/src';

import { Instances } from './instances';
import { TaonBaseRepository } from 'taon/src';

//#endregion

@TaonRepository({
  className: 'InstancesRepository',
})
export class InstancesRepository extends TaonBaseRepository<Instances> {
  entityClassResolveFn: () => typeof Instances = () => Instances;

  testMethod() {

  }

}