import type { VaultName } from 'polykey/dist/vaults/types';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from 'polykey/dist/PolykeyAgent';
import { vaultOps } from 'polykey/dist/vaults';
import * as keysUtils from 'polykey/dist/keys/utils';
import * as testUtils from '../utils';

describe('commandNewDir', () => {
  const password = 'password';
  const logger = new Logger('CLI Test', LogLevel.WARN, [new StreamHandler()]);
  let dataDir: string;
  let polykeyAgent: PolykeyAgent;
  let command: Array<string>;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(globalThis.tmpDir, 'polykey-test-'),
    );
    polykeyAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      options: {
        nodePath: dataDir,
        agentServiceHost: '127.0.0.1',
        clientServiceHost: '127.0.0.1',
        keys: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
          strictMemoryLock: false,
        },
      },
      logger: logger,
    });
  });
  afterEach(async () => {
    await polykeyAgent.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('should make a directory', async () => {
    const vaultName = 'Vault5' as VaultName;
    const vaultId = await polykeyAgent.vaultManager.createVault(vaultName);

    command = [
      'secrets',
      'mkdir',
      '-np',
      dataDir,
      `${vaultName}:dir1/dir2`,
      '-r',
    ];

    const result = await testUtils.pkStdio([...command], {
      env: { PK_PASSWORD: password },
      cwd: dataDir,
    });
    expect(result.exitCode).toBe(0);

    await polykeyAgent.vaultManager.withVaults([vaultId], async (vault) => {
      await vaultOps.addSecret(vault, 'dir1/MySecret1', 'this is the secret 1');
      await vaultOps.addSecret(
        vault,
        'dir1/dir2/MySecret2',
        'this is the secret 2',
      );

      const list = await vaultOps.listSecrets(vault);
      expect(list.sort()).toStrictEqual(
        ['dir1/MySecret1', 'dir1/dir2/MySecret2'].sort(),
      );
    });
  });
});
