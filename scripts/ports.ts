function port(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1024 || value > 65535) throw new Error(`Invalid loopback port: ${name}`);
  return value;
}
export const webPort = port('JAB_WEB_PORT', 5173);
export const apiPort = port('JAB_API_PORT', 3001);
if (webPort === apiPort) throw new Error('Web and API ports must differ');
export const webUrl = `http://127.0.0.1:${webPort}`;
export const apiUrl = `http://127.0.0.1:${apiPort}`;
