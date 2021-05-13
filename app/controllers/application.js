import Controller from '@ember/controller';
import { action } from '@ember/object';
import { capitalize } from '@ember/string';
import sportsLibPkg from '@sports-alliance/sports-lib';
import utilitiesPkg from '@sports-alliance/sports-lib/lib/events/utilities/event.utilities.js';
import exporterPkg from '@sports-alliance/sports-lib/lib/events/adapters/exporters/exporter.gpx.js';

const { SportsLib } = sportsLibPkg;
const { EventExporterGPX } = exporterPkg;
const { EventUtilities } = utilitiesPkg;

export default class ApplicationController extends Controller {
  @action async onDrop(event) {
    event.preventDefault();
    let { dataTransfer } = event;
    let files = this.dataTransferToFiles(dataTransfer);
    files.forEach(this.logFile);
    let events = await Promise.all(files.map((f) => this.fileToEvent(f)));
    let evt = EventUtilities.mergeEvents(events);
    let gpxString = await new EventExporterGPX().getAsString(evt);
    let blob = new Blob([gpxString], { type: 'application/xml' });
    let url = window.URL.createObjectURL(blob);
    window.location.assign(url);
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
  }

  @action onDragEnd(event) {
    console.log('dragEnd');
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

  logFile(file, i) {
    console.log(`... file[${i}].name = ${file.name} : ${file.type}`);
  }
}
