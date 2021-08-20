import { EventUtilities } from '@sports-alliance/sports-lib/lib/events/utilities/event.utilities.js';
import { EventExporterGPX } from '@sports-alliance/sports-lib/lib/events/adapters/exporters/exporter.gpx.js';
import { SportsLib } from '@sports-alliance/sports-lib';
import { expose } from 'comlink';
import { DOMParser } from '@xmldom/xmldom';

const capitalize = function (str) {
  return str.replace(/^\w/, (c) => c.toUpperCase());
};

class Merge {
  constructor(files) {
    this.files = files;
  }
  async blob() {
    let events = await Promise.all(this.files.map((f) => this.fileToEvent(f)));
    let evt = EventUtilities.mergeEvents(events);
    let gpxString = await new EventExporterGPX().getAsString(evt);
    return new Blob([gpxString], { type: 'application/gpx+xml' });
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
    return SportsLib.importFromGPX(text, DOMParser);
  }

  async fileToEventTcx(file) {
    let text = await file.text();
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    return SportsLib.importFromTCX(xml);
  }
}

expose(Merge);
