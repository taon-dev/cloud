//#region imports
import { Taon, ClassHelpers, TaonController } from 'taon/src';
import { _ } from 'tnp-core/src';
import { TaonBaseCliWorkerController } from 'tnp-helpers/src';

import { Instances } from './instances';
import { InstancesRepository } from './instances.repository';
import { GET, PUT, DELETE, Query, Body } from 'taon/src';

//#endregion

@TaonController({
  className: 'InstancesController',
})
export class InstancesController extends TaonBaseCliWorkerController {
  // @ts-ignore
  instancesRepository: InstancesRepository = // @ts-ignore
    this.injectCustomRepo(InstancesRepository);

  @GET()
  getEntities(): Taon.Response<Instances[]> {

    //#region @backendFunc
    return async (req, res) => {
      // @ts-ignore
      return this.instancesRepository.find();
    };
    //#endregion

  }

  @DELETE()
  delete(@Query('id') id: string): Taon.Response<Instances> {

    //#region @backendFunc
    return async (req, res) => {
      return this.instancesRepository.deleteById(id);
    };
    //#endregion

  }

  @PUT()
  insertEntity(
    @Body() entity: Instances,
  ): Taon.Response<Instances> {
    return async (req, res) => {

      //#region @backendFunc

      const instance = await this.instancesRepository.save(
        new Instances().clone(entity || {}),
      );
      return instance;
      //#endregion

    };
  }
}