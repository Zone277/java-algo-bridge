import { spawn } from 'node:child_process';
export function command(executable: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { stdio: 'inherit', shell: false });
    child.once('error', reject);
    child.once('exit', code => resolve(code ?? 1));
  });
}
export function npmRun(name: string) { return command(process.execPath, [process.env.npm_execpath!, 'run', name]); }
