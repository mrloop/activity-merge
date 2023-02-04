import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { wrap } from 'comlink';
import { dropTask } from 'ember-concurrency';
import { waitForPromise } from '@ember/test-waiters';
import { service } from '@ember/service';

export default class ApplicationController extends Controller {
  @tracked objectUrl;
  @tracked fileName;
  @tracked isDragging;
  @tracked fileNames;
  @tracked filesSelectClickCount = 0;

  @service metrics;

  @action onFilesSelect() {
    this.filesSelectClickCount++;
  }

  @action onFilesSelected({ target }) {
    return this.mergeFiles.perform([...target.files]);
  }

  get isMerging() {
    return this.mergeFiles.last?.isRunning;
  }

  @action async onDrop(event) {
    event.preventDefault();
    this.isDragging = false;
    let { dataTransfer } = event;
    let files = this.dataTransferToFiles(dataTransfer);
    await this.mergeFiles.perform(files);
  }

  mergeFiles = dropTask(async (files) => {
    if (files.length > 1) {
      this.metrics.trackEvent({
        name: 'mergeFiles',
        numberOfFiles: files.length,
      });
      this.fileNames = files.map((f) => f.name);
      const Merge = wrap(new Worker('/workers/merge.js'));
      const merge = await waitForPromise(new Merge(files));
      const blob = await waitForPromise(merge.blob());
      this.objectUrl = window.URL.createObjectURL(blob);
      this.fileName = `${this.fileNames[0].split('.')[0]}-activity-merge.gpx`;
    }
  });

  @action cleanUp() {
    window.URL.revokeObjectURL(this.objectUrl);
  }

  dataTransferToFiles({ items, files }) {
    if (items) {
      return [...items].map((item) => {
        if (item.kind === 'file') {
          return item.getAsFile();
        }
      });
    } else {
      return [...files];
    }
  }

  @action onDragOver(event) {
    event.preventDefault();
    this.isDragging = true;
  }

  @action onDragEnd(event) {
    this.isDragging = false;
    let { dataTransfer } = event;
    // Remove all of the drag data
    if (dataTransfer.items) {
      // Use DataTransferItemList interface to remove the drag data
      for (var i = 0; i < dataTransfer.items.length; i++) {
        dataTransfer.items.remove(i);
      }
    } else {
      // Use DataTransfer interface to remove the drag data
      dataTransfer.clearData();
    }
  }

  @action onDragLeave() {
    this.isDragging = false;
  }
}
