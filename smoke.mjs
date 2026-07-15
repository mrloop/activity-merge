import puppeteer from 'puppeteer';
import { execa } from 'execa';
import process from 'process';

function waitForOutput(serverProcess, stringToMatch) {
  return new Promise((resolve, reject) => {
    let output = '';
    let listener = (data) => {
      output += data.toString();
      if (output.includes(stringToMatch)) {
        serverProcess.stdout.removeListener('data', listener);
        serverProcess.stderr.removeListener('data', listener);
        resolve(output);
      }
    };
    serverProcess.stdout.on('data', listener);
    serverProcess.stderr.on('data', listener);
    serverProcess.on('exit', (code) => {
      if (code > 0) reject(new Error(output));
    });
  });
}

async function startEmber() {
  let port = '4321';
  let serverProcess = execa('ember', ['s', '-prod', '--port', port]);
  await waitForOutput(serverProcess, 'Build successful');
  return { serverProcess, port };
}

async function test(startServerFn, testSelector) {
  let server;
  try {
    let { serverProcess, port } = await startServerFn();
    server = serverProcess;
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [process.env.CI ? '--no-sandbox' : null].filter(Boolean),
    });
    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}`);
    await page.waitForSelector(testSelector, { timeout: 5000 });
    await browser.close();
  } finally {
    server?.kill();
  }
}

try {
  test(startEmber, '.ember-application');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
