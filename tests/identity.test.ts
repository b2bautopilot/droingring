import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig, loadOrCreateIdentity } from '../src/p2p/identity.js';

const homes: string[] = [];
const oldHome = process.env.DROINGRING_HOME;
const oldNickname = process.env.DROINGRING_NICKNAME;
const oldBio = process.env.DROINGRING_BIO;

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function useHome(prefix: string): string {
  const home = mkdtempSync(join(tmpdir(), prefix));
  homes.push(home);
  process.env.DROINGRING_HOME = home;
  return home;
}

afterEach(() => {
  restoreEnv('DROINGRING_HOME', oldHome);
  restoreEnv('DROINGRING_NICKNAME', oldNickname);
  restoreEnv('DROINGRING_BIO', oldBio);
  for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true });
});

describe('identity config', () => {
  it('isolates identities by DROINGRING_HOME', () => {
    useHome('droingring-home-a-');
    const a = loadOrCreateIdentity();

    useHome('droingring-home-b-');
    const b = loadOrCreateIdentity();

    expect(Buffer.from(a.publicKey).toString('hex')).not.toBe(
      Buffer.from(b.publicKey).toString('hex'),
    );
  });

  it('allows runtime nickname and bio overrides from env', () => {
    useHome('droingring-nick-');
    process.env.DROINGRING_NICKNAME = 'codex(dgx1)';
    process.env.DROINGRING_BIO = 'builder runtime';

    const cfg = loadConfig();

    expect(cfg.nickname).toBe('codex(dgx1)');
    expect(cfg.bio).toBe('builder runtime');
  });
});
