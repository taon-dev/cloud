//#region imports
import { apiPrefix } from 'taon/src';
import { chalk, crossPlatformPath, Helpers, UtilsYaml } from 'tnp-core/src';
import { path, _ } from 'tnp-core/src';
import { BaseCliWorker } from 'tnp-helpers/src';

import { TraefikConfig } from './traefik.models';
import { TraefikProvider } from './traefik.provider';
//#endregion

export class TraefikServiceProvider {
  constructor(private traefikProvider: TraefikProvider) {}

  protected get dynamicServicesRelativePathPart(): string {
    return crossPlatformPath(['dynamic', 'services']);
  }

  //#region protected methods

  //#region protected methods / get service prefix
  protected getRuleFromIp(options: {
    publicOrLocalIp: string;
    worker?: BaseCliWorker<any, any>;
  }): string {

    //#region @backendFunc
    options = options || ({} as any);
    if (options.worker) {
      return `Host(\`${options.publicOrLocalIp}\`) && PathPrefix(\`/${apiPrefix}/${
        options.worker.workerContextTemplate().contextName
      }/\`)`;
    }
    return `"Host(\`${options.publicOrLocalIp}\`)"`;
    // can be also rule: "Host(`33.44.55.66`) || HostRegexp(`{subdomain:.+}.33.44.55.66.sslip.io`)"
    //#endregion

  }
  //#endregion

  //#region protected methods / yaml path for service name
  protected yamlPathForServiceName(options: {
    ipAsServiceName: string;
  }): string {

    //#region @backendFunc
    options = options || ({} as any);
    const yamlPath = path.join(
      this.traefikProvider.pathToTraefikComposeDestCwd,
      this.dynamicServicesRelativePathPart,
      `${options.ipAsServiceName}.yml`,
    );
    return yamlPath;
    //#endregion

  }
  //#endregion

  //#region protected methods / get ip from yml
  public getIpFromYml(): string | undefined {

    //#region @backendFunc
    const ymlFileAbsPath = _.first(
      Helpers.getFilesFrom([
        this.traefikProvider.pathToTraefikComposeDestCwd,
        this.dynamicServicesRelativePathPart,
      ]).filter(f => f.endsWith('.yml')),
    );

    if (!ymlFileAbsPath || !Helpers.exists(ymlFileAbsPath)) {
      return undefined;
    }

    const ip = path
      .basename(ymlFileAbsPath)
      .replace('.yml', '')
      .replace(/\_/g, '.');
    return ip;
    //#endregion

  }
  //#endregion

  //#endregion

  //#region public methods

  //#region public methods / init service readme
  initServiceReadme(): void {

    //#region @backendFunc
    Helpers.writeFile(
      [
        this.traefikProvider.pathToTraefikComposeDestCwd,
        this.dynamicServicesRelativePathPart,
        'README.md',
      ],
      `# Dynamic services folder for Traefik.`,
    );
    //#endregion

  }
  //#endregion

  //#region public methods / register workers
  public async registerWorkers(
    publicOrLocalIp: string,
    workers: BaseCliWorker<any, any>[],
    options?: {
      /**
       * If true, Traefik will be restarted after registering the service
       */
      restartTraefikAfterRegister?: boolean;
    },
  ): Promise<void> {

    //#region @backendFunc
    options = options || {};
    const routers: Record<string, any> = {};
    const services: Record<string, any> = {};

    for (const worker of workers) {
      const safeName = `ip-${publicOrLocalIp.replace(/\./g, '-')}-${worker.contextName.toLowerCase()}`;

      // HTTP router
      routers[`${safeName}-http`] = {
        rule: this.getRuleFromIp({ publicOrLocalIp, worker }),
        service: safeName,
        entryPoints: ['web'],
      };

      // HTTPS router
      routers[`${safeName}-https`] = {
        rule: this.getRuleFromIp({ publicOrLocalIp, worker }),
        service: safeName,
        entryPoints: ['websecure'],
        tls: {},
      };

      // Service
      services[safeName] = {
        loadBalancer: {
          servers: [
            {
              url: `http://host.docker.internal:${worker.port}`,
            },
          ],
        },
      };
    }

    const jsonConfig = {
      http: {
        routers,
        services,
      },
    };

    const yamlContent = UtilsYaml.jsonToYaml(jsonConfig);
    const ipAsServiceName = _.snakeCase(publicOrLocalIp);
    const yamlPath = this.yamlPathForServiceName({ ipAsServiceName });

    Helpers.writeFile(yamlPath, yamlContent.trim() + '\n');
    console.log(`✅ Registered service for all workers.`);

    if (options.restartTraefikAfterRegister) {
      await this.traefikProvider.restartTraefik();
    }

    //#endregion

  }
  //#endregion

  //#region public methods / register service
  /**
   * @deprecated
   */
  public async register(
    publicOrLocalIp: string,
    localhostPort: number,
    options?: {
      /**
       * If true, Traefik will be restarted after registering the service
       */
      restartTraefikAfterRegister?: boolean;
    },
  ): Promise<boolean> {

    //#region @backendFunc
    options = options || {};
    const ipAsServiceName = _.snakeCase(publicOrLocalIp);
    const yamlPath = this.yamlPathForServiceName({ ipAsServiceName });
    Helpers.mkdirp(path.dirname(yamlPath));

    Helpers.info(`Registering service ${chalk.bold(ipAsServiceName)} ...`);
    try {
      const yamlContent = `
http:
  routers:
    ip-${ipAsServiceName}-http:
      rule: ${this.getRuleFromIp({ publicOrLocalIp })}
      service: ip-${ipAsServiceName}
      entryPoints:
        - web

    ip-${ipAsServiceName}-https:
      rule: ${this.getRuleFromIp({ publicOrLocalIp })}
      service: ip-${ipAsServiceName}
      entryPoints:
        - websecure
      tls: {}
  services:
    ip-${ipAsServiceName}:
      loadBalancer:
        servers:
          - url: "http://host.docker.internal:${localhostPort}"
`;

      Helpers.writeFile(yamlPath, yamlContent.trim() + '\n');
      console.log(
        `✅ Registered service: ${ipAsServiceName} → port ${localhostPort}`,
      );

      if (options.restartTraefikAfterRegister) {
        await this.traefikProvider.restartTraefik();
      }

      // Trigger Traefik dynamic reload (it should detect automatically)
      return true;
    } catch (err) {
      Helpers.error(err, true, true);
      return false;
    }
    //#endregion

  }
  //#endregion

  //#region public methods / unregister service
  /**
   * Remove traefik routes for service
   * @param serviceId service name to unregister (kebab-case)
   */
  public async unregister(publicOrLocalIp: string): Promise<void> {

    //#region @backendFunc
    const ipAsServiceName = _.snakeCase(publicOrLocalIp);
    try {
      const yamlPath = this.yamlPathForServiceName({ ipAsServiceName });

      if (Helpers.exists(yamlPath)) {
        Helpers.removeFileIfExists(yamlPath);
        console.log(`🗑️  Unregistered service: ${ipAsServiceName}`);
      } else {
        console.log(`ℹ️ Service not found: ${ipAsServiceName}`);
      }
      await this.traefikProvider.restartTraefik();
    } catch (err) {
      Helpers.error(err, true, true);
    }
    //#endregion

  }
  //#endregion

  //#region public methods / check if service is registered
  /**
   * Check if a service is already registered in Traefik
   * (by verifying if dynamic YAML config exists)
   */
  public async isRegistered(publicOrLocalIp: string): Promise<boolean> {

    //#region @backendFunc
    try {
      const ipAsServiceName = _.snakeCase(publicOrLocalIp);
      const yamlPath = this.yamlPathForServiceName({
        ipAsServiceName,
      });
      const exists = Helpers.exists(yamlPath);
      return exists;
    } catch (err) {
      Helpers.error(err, true, true);
      return false;
    }
    //#endregion

  }
  //#endregion

  //#endregion

}