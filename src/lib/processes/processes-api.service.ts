import { Injectable } from '@angular/core'; // @browser
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Taon } from 'taon/src';
import { TaonBaseAngularService } from 'taon/src';

import type { Processes } from './processes';
import { ProcessesController } from './processes.controller';

//#region @browser
@Injectable()
//#endregion

export class ProcessesApiService extends TaonBaseAngularService {
  protected processesController = this.injectController(ProcessesController);

  // public get allProcesses$(): Observable<Processes[]> {
  //   return this.processesController
  //     .getAll()
  //     .request().observable.pipe(map(res => res.body.json));
  // }
}