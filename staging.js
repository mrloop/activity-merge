const puppeteer = require('puppeteer');
const execa = require('execa');
const NetlifyApi = require('netlify');
const { deploySite } = require('netlify-cli/src/utils/deploy/deploy-site');

let netlify = new NetlifyApi(process.env.NETLIFY_AUTH_TOKEN);

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
  let sites = await netlify.listSites();
  let sitename = await siteName();
  return sites.find(({ name }) => name === sitename);
}

async function deleteSite() {
  let site = await findSite();
  let sitename = await siteName();
  if (site) {
    await netlify.deleteSite({ site_id: site.id });
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
    site = await netlify.createSite({
      body: {
        name: sitename,
        account_slug: accountName,
      },
    });
    debug('Site created:', site);
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
    return await deploySite(netlify, id, 'dist', {
      message,
      filter: () => true,
    });
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
  let {
    deploy: { url },
  } = await deploy();
  await checkDeploy(url, '.drop-zone');
  debug('Deployed', url);
}

if (process.env.DELETE_SITE) {
  deleteSite();
} else {
  deployAndCheck();
}
