'use strict';

module.exports = function (/* environment, appConfig */) {
  // See https://zonkyio.github.io/ember-web-app for a list of
  // supported properties

  return {
    name: 'Activity Merge',
    short_name: 'Activity Merge',
    description:
      'Merge fit, gpx and tcx files. Join split activites into a single file',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fb8b24ff',
    theme_color: '#fb8b24ff',
    icons: [
      {
        src: '/assets/icons/appicon-32.png',
        sizes: '32x32',
        targets: ['favicon'],
      },
      ...[192, 280, 512].map((size) => ({
        src: `/assets/icons/appicon-${size}.png`,
        sizes: `${size}x${size}`,
      })),
    ],
    ms: {
      tileColor: '#fb8b24ff',
    },
  };
};
