const puppeteer = require('puppeteer');
const execa = require('execa');

function waitForOutput(ember, target) {
  return new Promise((resolve) => {
    let output = '';
    let listener = (data) => {
      output += data.toString();
      if (output.includes(target)) {
        ember.stdout.removeListener('data', listener);
        ember.stderr.removeListener('data', listener);
        resolve(output);
      }
    };
    ember.stdout.on('data', listener);
    ember.stderr.on('data', listener);
  });
}

(async () => {
  let ember;
  try {
    ember = execa('ember', ['s', '-prod', '--port', '4321']);
    await waitForOutput(ember, 'Build successful');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('http://localhost:4321');
    await page.waitForSelector('.drop-zone');
    await browser.close();
  } catch (error) {
    console.error(error);
    /* eslint-disable no-process-exit */
    process.exit(1);
  } finally {
    if (ember) {
      ember.cancel();
    }
  }
})();
