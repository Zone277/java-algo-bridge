import { spawn, type ChildProcess } from 'node:child_process';
import { webUrl, apiUrl } from './ports.js';
const api = spawn(process.execPath, ['--import', 'tsx', 'apps/api/src/main.ts'], { stdio: ['inherit', 'inherit', 'inherit', 'ipc'], shell: false });
const children: ChildProcess[] = [api];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) {
    if (child.connected) {
      child.send('shutdown');
      const fallback = setTimeout(() => { if (child.exitCode === null) child.kill('SIGTERM'); }, 8000);
      fallback.unref();
      child.once('exit', () => clearTimeout(fallback));
    } else child.kill('SIGTERM');
  }
}
function watch(child: ChildProcess) {
  child.on('error', err => { console.error(err); stop(1); });
  child.on('exit', code => { if (!stopping) stop(code ?? 1); });
}
watch(api);
// Start the browser entry only after the API is actually listening.
api.once('message', message => {
  if (message !== 'ready' || stopping) return;
  const web = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--config', 'apps/web/vite.config.ts'], { stdio: 'inherit', shell: false });
  children.push(web);
  watch(web);
  console.log(`Java Algo Bridge: ${webUrl} · API ${apiUrl} (Ctrl+C 停止)`);
});
process.once('SIGINT', () => stop());
process.once('SIGTERM', () => stop());
process.on('message', message => {
  if (message === 'shutdown') { stop(); if (process.connected) process.disconnect(); }
});
