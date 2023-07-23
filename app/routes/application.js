import Route from '@ember/routing/route';
import { getOwner } from '@ember/application';
import { service } from '@ember/service';
import SimpleAnalytics from 'ember-metrics-simple-analytics';

export default class ApplicationRoute extends Route {
  @service metrics;
  @service router;

  constructor() {
    super(...arguments);

    getOwner(this).register(
      'metrics-adapter:simple-analytics',
      SimpleAnalytics,
    );

    this.router.on('routeDidChange', () => {
      const page = this.router.currentURL;
      const title = this.router.currentRouteName || 'unknown';

      this.metrics.trackPage({ page, title });
    });
  }
}
