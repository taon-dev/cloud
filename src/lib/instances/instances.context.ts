//#region imports
import { Taon, TaonBaseContext, ClassHelpers } from 'taon/src';
import { TaonBaseMigration,TaonMigration } from 'taon/src';
import { QueryRunner } from 'taon-typeorm/src';
import { CoreModels } from 'tnp-core/src';
import { getBaseCliWorkerDatabaseConfig } from 'tnp-helpers/src';

import { Instances } from './instances';
import { InstancesController } from './instances.controller';
import { InstancesRepository } from './instances.repository';

//#endregion

const appId = 'instances-worker-app.project.worker';
const localhostInstanceName = 'Localhost';
@TaonMigration({
  className: 'MigrationLocalhost',
})
class MigrationLocalhost extends TaonBaseMigration {
  instanceRepository = this.injectCustomRepository(InstancesRepository);

  async up(queryRunner: QueryRunner): Promise<any> {
    console.log(
      `[TaonBaseMigration] Running migration UP "${ClassHelpers.getName(this)}"`,
    );

    try {
      await queryRunner.startTransaction();
      await this.instanceRepository.delete({
        ipAddress: CoreModels.localhostIp127,
      });

      await this.instanceRepository.save(
        new Instances().clone({
          name: localhostInstanceName,
          ipAddress: CoreModels.localhostIp127,
        }),
      );

      await queryRunner.commitTransaction();
      this.ctx.logMigrations &&
        console.log('All migrations marked as applied.');
    } catch (error) {
      this.ctx.logMigrations &&
        console.error(
          'Failed to mark all migrations as applied, rolling back:',
          error,
        );
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  async down(queryRunner: QueryRunner): Promise<any> {
    console.log(
      `[TaonBaseMigration] Running migration DOWN "${ClassHelpers.getName(this)}"`,
    );
    await this.instanceRepository.delete({
      name: localhostInstanceName,
    });
  }
}

export const InstancesContext = Taon.createContextTemplate(() => ({
  contextName: 'InstancesContext',
  appId,
  skipWritingServerRoutes: true,
  contexts: { TaonBaseContext },
  repositories: { InstancesRepository },
  entities: { Instances },
  migrations: { MigrationLocalhost },
  logs: {
    migrations: true,
  },
  controllers: { InstancesController },
  ...getBaseCliWorkerDatabaseConfig(appId, 'DROP_DB+MIGRATIONS'),
}));