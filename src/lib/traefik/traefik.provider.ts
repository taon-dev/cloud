//#region imports
import { promisify } from 'util';

import { config, LibTypeEnum } from 'tnp-core/src';
import {
  _,
  chalk,
  child_process,
  crossPlatformPath,
  path,
  UtilsEtcHosts,
  UtilsOs,
  UtilsTerminal,
} from 'tnp-core/src';
import { CoreModels, UtilsNetwork } from 'tnp-core/src';
import {
  globalSpinner,
  taonBasePathToGlobalDockerTemplates,
} from 'tnp-core/src';
import {
  BaseCliWorker,
  Helpers,
  HelpersTaon,
  UtilsDocker,
} from 'tnp-helpers/src';

import { TaonCloudStatus } from '../models';
// import type { TaonProjectsWorker } from '../taon.worker';

import { TraefikServiceProvider } from './treafik-service.provider';
//#endregion

export class TraefikProvider {
  //#region fields & getters
  public service = new TraefikServiceProvider(this);

  public readonly cloudIps: string[] = [];

  protected taonCloudStatus: TaonCloudStatus = TaonCloudStatus.NOT_STARED;

  protected reverseProxyNetworkName = 'traefik-net';

  //#region fields & getters / cloud is enabled
  public get cloudIsEnabled(): boolean {
    //#region @backendFunc
    return (
      this.taonCloudStatus === TaonCloudStatus.ENABLED_NOT_SECURE ||
      this.taonCloudStatus === TaonCloudStatus.ENABLED_SECURED
    );
    //#endregion
  }
  //#endregion

  //#region fields & getters / is dev mode
  public get isDevMode(): boolean {
    //#region @backendFunc
    return (
      this.taonCloudStatus === TaonCloudStatus.ENABLED_NOT_SECURE ||
      this.taonCloudStatus === TaonCloudStatus.STARTING_NOT_SECURE_MODE ||
      Helpers.exists([
        this.pathToTraefikComposeDestCwd,
        `traefik-compose.local-dev.yml`,
      ])
    );
    //#endregion
  }
  //#endregion

  //#region fields & getters / get path to compose dest
  /**
   * Path to traefik docker compose cwd where
   * compose will be started
   */
  public get pathToTraefikComposeDestCwd(): string {
    //#region @backendFunc
    const pathToComposeDest = crossPlatformPath([
      taonBasePathToGlobalDockerTemplates,
      path.basename(this.pathToTraefikComposeSourceTemplateFilesCwd()),
    ]);
    return pathToComposeDest;
    //#endregion
  }
  //#endregion

  //#endregion

  constructor(
    /**
     * Path to traefik docker compose template files
     */
    private readonly pathToTraefikComposeSourceTemplateFilesCwd: ()=> string,
  ) {}

  //#region protected methods

  //#region protected methods / set enabled mode
  protected setEnabledMode(): void {
    if (this.isDevMode) {
      this.taonCloudStatus = TaonCloudStatus.ENABLED_NOT_SECURE;
    } else {
      this.taonCloudStatus = TaonCloudStatus.ENABLED_SECURED;
    }
    BaseCliWorker.cloudIp.next(_.first(this.cloudIps));
    BaseCliWorker.isCloudEnable.next(true);
  }
  //#endregion

  //#region protected methods / check if docker enabled
  protected async checkIfDockerEnabled(): Promise<boolean> {
    //#region @backendFunc
    Helpers.taskStarted(`Checking if docker is enabled...`);
    const isEnableDocker = await UtilsOs.isDockerAvailable();
    if (!isEnableDocker) {
      Helpers.error(
        `

        Docker is not enabled, please enable docker to use cloud features

        `,
        true,
        true,
      );
      await UtilsTerminal.pressAnyKeyToContinueAsync();
      return false;
    }
    Helpers.taskDone(`Docker is enabled!`);
    return true;
    //#endregion
  }
  //#endregion

  //#region protected methods / delete traefik network
  protected async deleteTraefikNetwork(): Promise<void> {
    //#region @backendFunc

    try {
      child_process.execSync(
        `docker network rm ${this.reverseProxyNetworkName}`,
        { stdio: 'inherit' },
      );
      console.log(`🗑️  Network deleted: ${this.reverseProxyNetworkName}`);
    } catch (error: any) {
      console.log(
        `ℹ️ Network '${this.reverseProxyNetworkName}' probably does not exist, skipping.`,
      );
    }
    //#endregion
  }
  //#endregion

  //#region protected methods / make sure traefik network created
  protected async makeSureTraefikNetworkCreated(): Promise<void> {
    //#region @backendFunc
    try {
      child_process.execSync(
        `docker network create ${this.reverseProxyNetworkName}`,
        {
          stdio: 'ignore',
        },
      );
      console.log(`✅ Network created: ${this.reverseProxyNetworkName}`);
    } catch (error: any) {
      console.log(
        `ℹ️ Network '${this.reverseProxyNetworkName}' probably already exists, skipping.`,
      );
    }
    //#endregion
  }
  //#endregion

  //#region protected methods / select mode explain
  protected async selectModeExplain(): Promise<void> {
    //#region @backendFunc
    UtilsTerminal.clearConsole();

    Helpers.info(
      `Taon Cloud Modes Explanation:
=> ${chalk.bold.yellow('DEV MODE (ENABLED_NOT_SECURE)')}:
  In this mode, Taon Cloud is enabled without SSL/TLS encryption.
  This mode is suitable for development and testing purposes.
=> ${chalk.bold.green('PRODUCTION MODE (ENABLED_SECURED)')}:
  In this mode, Taon Cloud is enabled with SSL/TLS encryption.
  This mode is intended for production environments where security is crucial.
    `,
    );
    await UtilsTerminal.pressAnyKeyToContinueAsync();

    //#endregion
  }
  //#endregion

  //#region protected methods / select mode
  protected async selectMode(options?: {
    // skipDisabled?: boolean;
  }): Promise<TaonCloudStatus> {
    //#region @backendFunc
    options = options || {};
    // options.skipDisabled = options.skipDisabled || false;
    while (true) {
      try {
        let status: TaonCloudStatus;
        const isOsWithoutGui =
          !UtilsOs.isRunningInOsWithGraphicsCapableEnvironment();

        const optSecure = {
          [TaonCloudStatus.STARTING_SECURE_MODE]:
            'Enable Taon Cloud (PRODUCTION MODE)',
        };
        const optNotSecure = {
          [TaonCloudStatus.STARTING_NOT_SECURE_MODE]:
            'Enable Taon Cloud (DEV MODE)',
        };
        const optExplain = {
          explain: {
            name: '< Explain Taon Cloud modes >',
          },
        };

        const choices = isOsWithoutGui
          ? {
              ...optSecure,
              ...optNotSecure,
              ...optExplain,
            }
          : {
              ...optExplain,
              ...optNotSecure,
              ...optSecure,
            };

        const answer = await UtilsTerminal.select<keyof typeof choices>({
          choices: choices as any,
          question: `Select Taon Cloud mode:`,
        });

        if (answer === 'explain') {
          await this.selectModeExplain();
          continue;
        }

        status = answer as TaonCloudStatus;

        return status;
      } catch (error) {
        if (!(await UtilsTerminal.pressAnyKeyToTryAgainErrorOccurred(error))) {
          break;
        }
      }
    }
    //#endregion
  }
  //#endregion

  //#region protected methods / get worker terminal actions
  protected async checkIfTraefikIsRunning(options?: {
    waitUntilHealthy?: boolean;
    maxTries?: number;
  }): Promise<boolean> {
    //#region @backendFunc
    let tries = 0;
    options = options || {};
    if (options.waitUntilHealthy) {
      options.maxTries = options.maxTries || 50;
    }
    const execAsync = promisify(child_process.exec);

    globalSpinner.instance.start(`Traefik health: checking...`);

    while (true) {
      tries++;
      if (options.maxTries && tries > options.maxTries) {
        globalSpinner.instance.fail(
          `Traefik is not running or not healthy after ${tries} tries`,
        );
        return false;
      }
      try {
        const { stdout } = await execAsync(
          process.platform === 'win32'
            ? `docker inspect --format="{{json .State.Health.Status}}" traefik`
            : `docker inspect --format='{{json .State.Health.Status}}' traefik`,
        );

        const status = stdout.trim().replace(/"/g, '');
        globalSpinner.instance.text = `Traefik health: ${status}`;

        if (status === 'healthy') {
          globalSpinner.instance.succeed(`Traefik is ready`);
          await UtilsTerminal.wait(1);
          return true;
        }
        if (status === 'unhealthy') {
          if (options.waitUntilHealthy) {
            globalSpinner.instance.text =
              'Traefik state is not healthy yet, waiting...';
          } else {
            globalSpinner.instance.fail(
              `Traefik state is not running or not healthy`,
            );
            return false;
          }
        }
      } catch (error) {
        if (options.waitUntilHealthy) {
          globalSpinner.instance.text =
            'Traefik is not healthy yet, waiting...';
        } else {
          globalSpinner.instance.fail('Traefik is not running or not healthy');
          return false;
        }
      }

      await UtilsTerminal.wait(1);
    }
    //#endregion
  }
  //#endregion

  //#region protected methods / select cloud ips
  protected async selectCloudIps(): Promise<boolean> {
    //#region @backendFunc

    //#region select ip type
    const localIps = await UtilsNetwork.getLocalIpAddresses();
    const optPublic = {
      usePublic: {
        name: 'Use Public IP Address (recommended on server)',
      },
    };
    const optLocal = {
      useLocal: {
        name: 'Use Local IP Address',
      },
    };
    const isOsWithoutGui =
      !UtilsOs.isRunningInOsWithGraphicsCapableEnvironment();
    const choicesIpType = isOsWithoutGui
      ? {
          ...optPublic,
          ...optLocal,
        }
      : {
          ...optLocal,
          ...optPublic,
        };

    const useIp = await UtilsTerminal.select<keyof typeof choicesIpType>({
      choices: choicesIpType,
    });
    //#endregion

    if (useIp === 'usePublic') {
      //#region use public ip
      while (true) {
        try {
          Helpers.info(`Detecting public IP address...`);
          let publicIp = await UtilsNetwork.getCurrentPublicIpAddress();

          const choicesPublicIp = {
            confirm: {
              name: `Use detected public IP: ${chalk.bold(publicIp)}`,
            },
            manual: {
              name: 'Enter public IP manually',
            },
            abort: {
              name: '< abort and go back >',
            },
          };

          const selectedChoice = await UtilsTerminal.select<
            keyof typeof choicesPublicIp
          >({
            choices: choicesPublicIp,
            question: `Select option for public IP address:`,
          });

          if (selectedChoice === 'abort') {
            return false;
          }

          if (selectedChoice === 'manual') {
            publicIp = await UtilsTerminal.input({
              question: `Enter public IP address to be used by Taon Cloud:`,
              required: true,
              validate: ip => {
                return UtilsNetwork.isValidIp(ip);
              },
            });
          }

          this.cloudIps.length = 0;
          this.cloudIps.push(publicIp);

          if (!(await this.areCloudIpsValid())) {
            continue;
          }

          return true;
        } catch (error) {
          if (
            !(await UtilsTerminal.pressAnyKeyToTryAgainErrorOccurred(error))
          ) {
            return false;
          } else {
            continue;
          }
        }
      }
      //#endregion
    } else {
      //#region use local ip
      let i = 0;
      while (true) {
        i++;
        try {
          if (i > 1) {
            const shouldContinue = await UtilsTerminal.confirm({
              message: `Selecting again IP addresses. Do you want to continue?`,
              defaultValue: true,
            });
            if (!shouldContinue) {
              return false;
            }
          }
          const choices = [
            ...localIps
              .filter(f => f.family === 'IPv4')
              .map(ip => ({
                name: `Local IP: ${ip.address} (${ip.type})`,
                value: ip.address,
              })),
          ];
          const selected = await UtilsTerminal.select<string>({
            choices: choices,
            question: `Select IP addresses to be used by Taon Cloud:`,
          });

          this.cloudIps.length = 0;
          this.cloudIps.push(selected);
          if (!(await this.areCloudIpsValid())) {
            continue;
          }
          return true;
        } catch (error) {
          if (
            !(await UtilsTerminal.pressAnyKeyToTryAgainErrorOccurred(error))
          ) {
            break;
          }
          continue;
        }
      }
      //#endregion
    }
    //#endregion
  }
  //#endregion

  //#endregion

  //#region public methods

  //#region protected methods / validate ips
  protected async areCloudIpsValid(): Promise<boolean> {
    //#region @backendFunc
    for (const localIp of this.cloudIps) {
      Helpers.info(`Validating IP address (ping): ${localIp}...`);
      if (!(await UtilsNetwork.checkIfServerPings(localIp))) {
        Helpers.error(
          `Server with IP ${localIp} is not reachable! Please select only reachable IPs.`,
          true,
          true,
        );
        return false;
      }
    }
    return true;
    //#endregion
  }
  //#endregion

  //#region public methods / initial cloud status check
  public async initialCloudStatusCheck(): Promise<void> {
    //#region @backendFunc
    const isDockerRunning = await UtilsOs.isDockerAvailable();
    if (isDockerRunning) {
      Helpers.logInfo(`Docker is running.. checking if Traefik is enabled...`);
    } else {
      return;
    }

    const ipFromYml = this.service.getIpFromYml();

    if (!ipFromYml) {
      console.warn(
        `Can find ip from traefik dynamic config yml, assuming Traefik is not configured.`,
      );
      Helpers.info(`Shutting down Traefik if running...`);
      await this.stopTraefik();
      return;
    }
    this.cloudIps.push(ipFromYml);

    const isTraefikRunning = await this.checkIfTraefikIsRunning();
    if (isTraefikRunning) {
      Helpers.info(`Traefik is running with IP: ${ipFromYml}`);
      Helpers.info(`Restarting Traefik to refresh new settings...`);
      await this.restartTraefik();
      this.setEnabledMode();
    } else {
      console.warn(
        `Traefik is not running even if configured with IP: ${ipFromYml}`,
      );
      Helpers.info(`Shutting down Traefik if running...`);
      await this.stopTraefik();
      return;
    }
    //#endregion
  }
  //#endregion

  //#region public methods / restart traefik
  public async restartTraefik(options?: {
    hardRestart?: boolean;
  }): Promise<void> {
    //#region @backendFunc
    options = options || {};
    if (options.hardRestart) {
      await this.stopTraefik();
      await this.startTraefik();
      return;
    }
    console.log(`🚀 Restarting Traefik ${this.isDevMode ? 'DEV' : 'PROD'}...`);
    const execAsync = promisify(child_process.exec);
    try {
      await execAsync(
        `docker compose -f ` +
          ` traefik-compose${this.isDevMode ? '.local-dev' : ''}.yml down`,
        {
          cwd: this.pathToTraefikComposeDestCwd,
        },
      );
      await execAsync(
        `docker compose -f ` +
          ` traefik-compose${this.isDevMode ? '.local-dev' : ''}.yml up -d traefik`,
        {
          cwd: this.pathToTraefikComposeDestCwd,
        },
      );
    } catch (error) {
      config.frameworkName === 'tnp' && console.error(error);
      Helpers.warn('Error restarting Traefik:');
    }
    //#endregion
  }
  //#endregion

  //#region public methods / start traefik
  public async startTraefik(): Promise<boolean> {
    //#region @backendFunc

    if (!(await this.checkIfDockerEnabled())) {
      return false;
    }

    this.taonCloudStatus = await this.selectMode({
      skipDisabled: true,
    });

    if (!(await this.selectCloudIps())) {
      console.error('No IPs selected, cannot start Traefik');
      this.taonCloudStatus = TaonCloudStatus.NOT_STARED;
      return false;
    }

    await this.makeSureTraefikNetworkCreated();

    console.log(`🚀 Starting Traefik ${this.isDevMode ? 'DEV' : 'PROD'}...`);
    const execAsync = promisify(child_process.exec);

    Helpers.removeFolderIfExists(this.pathToTraefikComposeDestCwd);
    HelpersTaon.copy(
      this.pathToTraefikComposeSourceTemplateFilesCwd(),
      this.pathToTraefikComposeDestCwd,
      {
        recursive: true,
      },
    );

    this.service.initServiceReadme();

    // remove not used file
    Helpers.removeFileIfExists([
      this.pathToTraefikComposeDestCwd,
      `traefik-compose${!this.isDevMode ? '.local-dev' : ''}.yml`,
    ]);

    await execAsync(
      `docker compose -f ` +
        ` traefik-compose${this.isDevMode ? '.local-dev' : ''}.yml up -d traefik`,
      {
        cwd: this.pathToTraefikComposeDestCwd,
      },
    );

    // Wait until container health becomes healthy
    const isTraefikRunning = await this.checkIfTraefikIsRunning({
      waitUntilHealthy: true,
    });

    if (isTraefikRunning) {
      this.setEnabledMode();
      for (const cloudIp of this.cloudIps) {
        const workers =
          BaseCliWorker.getAllWorkersStartedInSystemFromCurrentCli();
        await this.service.registerWorkers(cloudIp, workers);
      }
      await this.restartTraefik();
    } else {
      this.taonCloudStatus = TaonCloudStatus.NOT_STARED;
    }

    return isTraefikRunning;
    //#endregion
  }
  //#endregion

  //#region public methods / stop traefik
  public async stopTraefik(): Promise<void> {
    //#region @backendFunc
    this.taonCloudStatus = TaonCloudStatus.KILLING;
    console.log('Stopping Traefik...');

    await this.deleteTraefikNetwork();

    const execAsync = promisify(child_process.exec);
    const localDevFileBasename = `traefik-compose.local-dev.yml`;
    const prodFileBasename = `traefik-compose.yml`;
    // Start traefik in detached mode
    const devFileExists = Helpers.exists([
      this.pathToTraefikComposeDestCwd,
      localDevFileBasename,
    ]);
    const prodFileExists = Helpers.exists([
      this.pathToTraefikComposeDestCwd,
      prodFileBasename,
    ]);

    let composeDownBothFiles = devFileExists && prodFileExists;
    if (!Helpers.exists(this.pathToTraefikComposeDestCwd)) {
      HelpersTaon.copy(
        this.pathToTraefikComposeSourceTemplateFilesCwd(),
        this.pathToTraefikComposeDestCwd,
        {
          recursive: true,
        },
      );
      composeDownBothFiles = true;
    }

    const composeDownFile = async (filename: string) => {
      return await execAsync(`docker compose -f ${filename} down`, {
        cwd: this.pathToTraefikComposeDestCwd,
      });
    };

    if (composeDownBothFiles) {
      Helpers.logInfo('Composing down both dev and production mode traefik...');
      try {
        await composeDownFile(localDevFileBasename);
      } catch (error) {
        console.log('Error stopping Traefik dev mode');
      }
      try {
        await composeDownFile(prodFileBasename);
      } catch (error) {
        console.log('Error stopping Traefik production mode');
      }
    } else {
      while (true) {
        try {
          if (
            Helpers.exists([
              this.pathToTraefikComposeDestCwd,
              localDevFileBasename,
            ])
          ) {
            Helpers.logInfo('Composing down dev mode traefik...');
            await composeDownFile(localDevFileBasename);
          }
          if (
            Helpers.exists([this.pathToTraefikComposeDestCwd, prodFileBasename])
          ) {
            Helpers.logInfo('Composing down production mode traefik...');
            await composeDownFile(prodFileBasename);
          }
          break;
        } catch (error) {
          Helpers.error('Error stopping Traefik', true, true);
          const tryAgain =
            await UtilsTerminal.pressAnyKeyToTryAgainErrorOccurred(error);
          if (!tryAgain) {
            break;
          }
        }
      }
    }

    await UtilsDocker.cleanImagesAndContainersByDockerLabel(
      'org.opencontainers.image.title',
      'Traefik',
    );

    Helpers.removeFolderIfExists(this.pathToTraefikComposeDestCwd);
    this.taonCloudStatus = TaonCloudStatus.NOT_STARED;
    BaseCliWorker.isCloudEnable.next(false);
    // docker compose rm -f traefik
    // docker compose down --remove-orphans

    //#endregion
  }
  //#endregion

  //#endregion
}
