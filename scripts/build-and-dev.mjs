import { spawn } from 'node:child_process';

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      env: process.env,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

const separatorIndex = process.argv.indexOf('--');
const devArgs = separatorIndex === -1 ? [] : process.argv.slice(separatorIndex + 1);

await run('npm', ['run', 'build']);
await run('npm', ['run', 'dev', '--', ...devArgs]);
