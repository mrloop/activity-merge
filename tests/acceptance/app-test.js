import { module, test } from 'qunit';
import { visit, currentURL, settled, triggerEvent } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';
import { river01, river02 } from 'activity-merge/tests/samples/river-gpx';

module('Acceptance | app', function (hooks) {
  setupApplicationTest(hooks);

  function uploadFiles() {
    let files = [
      new File([river01], 'river01.gpx'),
      new File([river02], 'river01.gpx'),
    ];
    triggerEvent('input[data-test-input]', 'change', { files });
  }

  test('visiting /', async function (assert) {
    await visit('/');

    assert.equal(currentURL(), '/');
    assert
      .dom('[data-test-drop-zone]')
      .hasText(
        'Select or drag files to merge. fit, gpx and tcx files accepted.',
      );
  });

  test('merges files', async function (assert) {
    await visit('/');
    uploadFiles();
    await settled();
    assert
      .dom('[data-test-download]')
      .hasAttribute('download', 'river01-activity-merge.gpx');
  });
});
