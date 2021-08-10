const puppeteer = require('puppeteer');
const execa = require('execa');

let timeout = 5000;

function debug(data, ...args) {
  if (process.env.DEBUG) {
    console.log(data, ...args);
  }
}

async function siteName() {
  let appName = 'activity-merge';
  // https://stackoverflow.com/questions/58033366/how-to-get-current-branch-within-github-actions
  // https://docs.github.com/en/actions/reference/environment-variables
  let branchName = process.env.GITHUB_HEAD_REF;
  if (!branchName) {
    let { stdout } = await execa('git', ['branch', '--show-current']);
    branchName = stdout;
  }

  branchName = branchName.replace(/[./]/g, '-');
  return `${appName}-${branchName}`;
}

async function findSite() {
  let { stdout } = await execa(
    'yarn',
    ['--silent', 'netlify', 'sites:list', '--json'],
    { timeout }
  );
  let sites = JSON.parse(stdout);
  let sitename = await siteName();
  return sites.find(({ name }) => name === sitename);
}

async function deleteSite() {
  let site = await findSite();
  let sitename = await siteName();
  if (site) {
    debug('Site found:', sitename);
    let { stdout } = await execa(
      'yarn',
      ['--silent', 'netlify', 'sites:delete', '--force', site.id],
      { timeout }
    );
    debug(stdout);
  } else {
    debug('Site not found:', sitename);
  }
}

async function findOrCreateSite() {
  let accountName = 'mrloop';
  let site = await findSite();
  let sitename = await siteName();
  if (site) {
    debug('Site found:', sitename);
  } else {
    debug('Site not found:', sitename);
    let { stdout: json } = await execa(
      'yarn',
      [
        '--silent',
        'netlify',
        'sites:create',
        '--json',
        '--account-slug',
        accountName,
        '--name',
        sitename,
      ],
      { timeout }
    );
    debug(json);
    site = JSON.parse(json);
    debug('Site created');
  }
  return site;
}

async function deploy() {
  try {
    let { id } = await findOrCreateSite();
    let { stdout: revision } = await execa('git', [
      'log',
      '--pretty=%h',
      '-n1',
    ]);
    let message = `Revision ${revision}`;
    debug('Deploying', message);
    let { stdout } = await execa(
      'yarn',
      [
        '--silent',
        'netlify',
        'deploy',
        '--dir=dist',
        '--prod',
        '--message',
        message,
        '--site',
        id,
        '--json',
      ],
      { timeout }
    );
    return stdout;
  } catch (error) {
    console.error(error);
    /* eslint-disable no-process-exit */
    process.exit(1);
  }
}

async function checkDeploy(url, selector) {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForSelector(selector, { timeout: 10000 });
    await browser.close();
  } catch (error) {
    console.error(error);
    /* eslint-disable no-process-exit */
    process.exit(1);
  }
}

async function deployAndCheck() {
  let json = await deploy();
  let { url } = JSON.parse(json);
  await checkDeploy(url, '.drop-zone');
  console.log(json);
}

if (process.env.DELETE_SITE) {
  deleteSite();
} else {
  deployAndCheck();
}
