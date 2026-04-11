//#region imports
import { Injectable } from '@angular/core'; // @browser
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Taon } from 'taon/src';

import type { Instances } from './instances';
import { InstancesController } from './instances.controller';
import { TaonBaseAngularService } from 'taon/src';

//#endregion

//#region @browser
@Injectable()
//#endregion

export class InstancesApiService extends TaonBaseAngularService {
  private instancesController = this.injectController(InstancesController); ;

  public get allMyEntities$(): Observable<Instances[]> {
    return this.instancesController
      .getEntities()
      .request().observable.pipe(map(res => res.body.json));
  }
}