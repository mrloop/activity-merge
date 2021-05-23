import { module, test } from 'qunit';
import { visit, currentURL } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';

module('Acceptance | app', function (hooks) {
  setupApplicationTest(hooks);

  test('visiting /', async function (assert) {
    await visit('/');

    assert.equal(currentURL(), '/');
    assert
      .dom('[data-test-drop-zone]')
      .hasText(
        'Select or drag files to merge. fit, gpx and tcx files accepted.'
      );
  });
});
