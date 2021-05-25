import Controller from '@ember/controller';
import { action } from '@ember/object';
import { schedule } from '@ember/runloop';
import { tracked } from '@glimmer/tracking';
import { wrap } from 'comlink';
import { dropTask } from 'ember-concurrency';

export default class ApplicationController extends Controller {
  downloadLinkElement;
  fileInputElement;
  @tracked objectUrl;
  @tracked fileName;
  @tracked isDragging;
  @tracked fileNames;

  @action setDownloadLink(element) {
    this.downloadLinkElement = element;
  }

  @action setFileInput(element) {
    this.fileInputElement = element;
  }

  @action onFilesSelect() {
    this.fileInputElement.click();
  }

  @action onFilesSelected() {
    return this.mergeFiles.perform([...this.fileInputElement.files]);
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

  @dropTask *mergeFiles(files) {
    if (files.length > 1) {
      this.fileNames = files.map((f) => f.name);
      const Merge = wrap(new Worker('workers/merge.js'));
      const merge = yield new Merge(files);
      const blob = yield merge.blob();
      this.objectUrl = window.URL.createObjectURL(blob);
      this.fileName = 'activity-merge.gpx';
      schedule('afterRender', () => {
        this.downloadLinkElement.click();
        window.URL.revokeObjectURL(this.objectUrl);
      });
    }
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
