'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const funnel = require('broccoli-funnel');
const path = require('path');
const os = require('os');
const fs = require('fs');
const mergeTrees = require('broccoli-merge-trees');
const { buildWorkers } = require('./lib/worker-build');

const { EMBROIDER } = process.env;

module.exports = function (defaults) {
  let app = new EmberApp(defaults, {
    'asset-cache': {
      manual: ['workers/merge.js'],
    },
    'ember-cli-image-transformer': {
      images: [
        {
          inputFilename: 'lib/images/brand-icon.png',
          outputFileName: 'appicon-',
          convertTo: 'png',
          destination: 'assets/icons/',
          sizes: [32, 192, 280, 512],
        },
      ],
    },
  });

  // Use `app.import` to add additional libraries to the generated
  // output files.
  //
  // If you need to use different assets in different
  // environments, specify an object as the first parameter. That
  // object's keys should be the environment name and the values
  // should be the asset to use in that environment.
  //
  // If the library that you are including contains AMD or ES6
  // modules that you would like to import into your application
  // please specify an object with the list of modules as keys
  // along with the exports of each module as its value.
  let buildDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'activity-merge--workers--')
  );
  buildWorkers({
    buildDir,
    isProduction: process.env.EMBER_ENV === 'production',
  });

  const workers = funnel(buildDir, {
    destDir: 'workers/',
  });

  const { Webpack } = require('@embroider/webpack');

  if (EMBROIDER) {
    return require('@embroider/compat').compatBuild(app, Webpack, {
      extraPublicTrees: [workers],
      staticAddonTestSupportTrees: true,
      staticAddonTrees: true,
      staticHelpers: true,
      staticComponents: true,
      // splitAtRoutes: ['route.name'], // can also be a RegExp
      // Bug workaround https://github.com/embroider-build/embroider/issues/811#issuecomment-840180944
      packagerOptions: {
        webpackConfig: {
          module: {
            rules: [
              {
                test: /\/ember-concurrency\//,
                loader: 'string-replace-loader',
                options: {
                  multiple: [
                    {
                      search: '\\[yieldableSymbol\\]',
                      flags: 'g',
                      replace: '["__ec_yieldable__"]',
                    },
                    {
                      search: '\\[cancelableSymbol\\]',
                      flags: 'g',
                      replace: '["__ec_cancel__"]',
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    });
  }
  return mergeTrees([app.toTree(), workers]);
};
