import Controller from '@ember/controller';
import { action } from '@ember/object';
import { capitalize } from '@ember/string';
import { schedule } from '@ember/runloop';
import { tracked } from '@glimmer/tracking';
import { SportsLib } from '@sports-alliance/sports-lib';
import { EventUtilities } from '@sports-alliance/sports-lib/lib/events/utilities/event.utilities.js';
import { EventExporterGPX } from '@sports-alliance/sports-lib/lib/events/adapters/exporters/exporter.gpx.js';

export default class ApplicationController extends Controller {
  downloadLinkElement;
  fileInputElement;
  @tracked objectUrl;
  @tracked fileName;
  @tracked isDragging;

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
    this.handleFiles([...this.fileInputElement.files]);
  }

  @action async onDrop(event) {
    event.preventDefault();
    this.isDragging = false;
    let { dataTransfer } = event;
    let files = this.dataTransferToFiles(dataTransfer);
    await this.handleFiles(files);
  }

  async handleFiles(files) {
    files.forEach(this.logFile);
    let events = await Promise.all(files.map((f) => this.fileToEvent(f)));
    let evt = EventUtilities.mergeEvents(events);
    let gpxString = await new EventExporterGPX().getAsString(evt);
    let blob = new Blob([gpxString], { type: 'application/gpx+xml' });
    this.objectUrl = window.URL.createObjectURL(blob);
    this.fileName = 'activity-merge.gpx';
    schedule('afterRender', () => {
      this.downloadLinkElement.click();
      window.URL.revokeObjectURL(this.objectUrl);
    });
  }

  async fileToEvent(file) {
    let fnName = `fileToEvent${capitalize(file.name.split('.').pop())}`;
    return this[fnName] && this[fnName](file);
  }

  async fileToEventFit(file) {
    let arrayBuffer = await file.arrayBuffer();
    return SportsLib.importFromFit(arrayBuffer);
  }

  async fileToEventGpx(file) {
    let text = await file.text();
    return SportsLib.importFromGPX(text);
  }

  async fileToEventTcx(file) {
    let text = await file.text();
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    return SportsLib.importFromTCX(xml);
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

  logFile(file, i) {
    console.log(`... file[${i}].name = ${file.name} : ${file.type}`);
  }
}
