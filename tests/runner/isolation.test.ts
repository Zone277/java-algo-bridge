import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { JavaRunner, CONTAINER_LABEL } from '../../apps/api/src/runner.js';
import { correct, syntaxError, infinite } from '../fixtures/java.js';

const exec = promisify(execFile);
it('actual container configuration isolates only task data and cleanup removes resources after every terminal path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'jab-test-root-'));
  const runner = new JavaRunner({ tempRoot: root });
  const request = (source: string) => ({ problemId: '704' as const, lessonVersion: '704-v1' as const, mode: 'run' as const, source, input: { nums: [-8, 3, 7], target: 3 } });
  const seenNames: string[] = [];
  try {
    expect((await runner.getAvailability()).available, 'BLOCKED: Docker unavailable').toBe(true);
    const controller = new AbortController();
    const pending = runner.execute(request(infinite), { signal: controller.signal });
    let inspected = false;
    try {
      for (let i = 0; i < 40; i++) {
        const listed = await exec('docker', ['ps', '--filter', `label=${CONTAINER_LABEL}`, '--format', '{{.Names}}']);
        const names = listed.stdout.split(/\r?\n/).filter(name => name.startsWith('jab-run-'));
        for (const name of names) {
          const data = JSON.parse((await exec('docker', ['inspect', name])).stdout)[0];
          const binds = data.Mounts.filter((mount: {Type:string}) => mount.Type === 'bind');
          if (!binds.some((mount: {Source:string}) => mount.Source.includes(root.split(/[\\/]/).at(-1)!))) continue;
          seenNames.push(name);
          expect(data.Config.User).toBe('10001:10001');
          expect(data.HostConfig.NetworkMode).toBe('none');
          expect(data.HostConfig.ReadonlyRootfs).toBe(true);
          expect(data.HostConfig.Privileged).toBe(false);
          expect(data.HostConfig.CapDrop).toContain('ALL');
          expect(data.HostConfig.SecurityOpt).toContain('no-new-privileges');
          expect(data.HostConfig.NanoCpus).toBe(1000000000);
          expect(data.HostConfig.Memory).toBe(536870912);
          expect(data.HostConfig.MemorySwap).toBe(536870912);
          expect(data.HostConfig.PidsLimit).toBe(128);
          expect(binds).toHaveLength(1);
          expect(binds[0].Destination).toBe('/input');
          expect(binds[0].RW).toBe(false);
          expect(binds[0].Source).toContain('jab-test-root-');
          expect(data.HostConfig.Tmpfs['/work']).toContain('size=128m');
          inspected = true;
          break;
        }
        if (inspected) break;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      expect(inspected, 'actual running container must be inspected').toBe(true);
    } finally { controller.abort(); }
    expect((await pending).status).toBe('CANCELLED');
    expect(await readdir(root)).toEqual([]);
    for (const source of [correct, syntaxError, infinite]) {
      const result = await runner.execute(request(source));
      expect(result.status).toBe(source === correct ? 'PASSED_LOCAL_TESTS' : source === syntaxError ? 'COMPILE_ERROR' : 'TIME_LIMIT');
      expect(result.cleanup.status).toBe('done');
      expect(await readdir(root)).toEqual([]);
    }
    const remaining = (await exec('docker', ['ps', '-a', '--filter', `label=${CONTAINER_LABEL}`, '--format', '{{.Names}}'])).stdout;
    for (const name of seenNames) expect(remaining).not.toContain(name);
    const running = runner.execute(request(infinite));
    await new Promise(resolve => setTimeout(resolve, 400));
    await runner.close();
    expect((await running).status).toBe('CANCELLED');
    expect(await readdir(root)).toEqual([]);
  } finally { await runner.close(); await rm(root, { recursive: true, force: true }); }
});
