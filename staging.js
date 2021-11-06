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

// https://stackoverflow.com/questions/58033366/how-to-get-current-branch-within-github-actions
// https://docs.github.com/en/actions/reference/environment-variables
async function branchName() {
  let branchName = process.env.GITHUB_HEAD_REF;
  if (!branchName) {
    let { stdout } = await execa('git', ['branch', '--show-current']);
    branchName = stdout.trim();
  }
  return branchName.replace(/[./]/g, '-');
}

async function revision() {
  let { stdout: revision } = await execa('git', ['log', '--pretty=%h', '-n1']);
  return revision.trim();
}

async function siteName() {
  let appName = 'activity-merge';
  return `${appName}-${await branchName()}`;
}

async function findSite(siteName) {
  let sites = await netlify.listSites();
  return sites.find(({ name }) => name === siteName);
}

async function deleteSite(siteName) {
  let site = await findSite(siteName);
  if (site) {
    await netlify.deleteSite({ site_id: site.id });
    debug('Site deleted:', site.url);
  } else {
    debug('Site not found:', siteName);
  }
}

async function findOrCreateSite(name) {
  let site = await findSite(name);
  if (site) {
    debug('Site found:', name);
  } else {
    debug('Site not found:', name);
    site = await netlify.createSite({ body: { name } });
    debug('Site created:', site.url);
  }
  return site;
}

async function deploy(siteName, folder) {
  let { id } = await findOrCreateSite(siteName);
  let message = `Revision ${await revision()}`;
  debug('Deploying', message);
  return await deploySite(netlify, id, folder, {
    message,
    filter: () => true,
  });
}

async function checkDeploy(url, selector) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitForSelector(selector, { timeout: 10000 });
  await browser.close();
}

async function deployAndCheck(siteName) {
  let { deploy: d } = await deploy(siteName, 'dist');
  await checkDeploy(d.url, '.drop-zone');
  debug('Deployed', d.url);
}

async function run({ DELETE_SITE }) {
  try {
    let name = await siteName();
    if (DELETE_SITE) {
      deleteSite(name);
    } else {
      deployAndCheck(name);
    }
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

run(process.env);
