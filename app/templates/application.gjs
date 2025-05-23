import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { wrap } from 'comlink';
import { dropTask } from 'ember-concurrency';
import { waitFor } from '@ember/test-waiters';
import { service } from '@ember/service';
import { on } from '@ember/modifier';
import click from '../modifiers/click';

export default class ApplicationComponent extends Component {
  @tracked objectUrl;
  @tracked fileName;
  @tracked isDragging;
  @tracked fileNames;
  @tracked filesSelectClickCount = 0;

  @service metrics;

  onFilesSelect = () => {
    this.filesSelectClickCount++;
  };

  onFilesSelected = ({ target }) => {
    return this.mergeFiles.perform([...target.files]);
  };

  get isMerging() {
    return this.mergeFiles.last?.isRunning;
  }

  onDrop = async (event) => {
    event.preventDefault();
    this.isDragging = false;
    let { dataTransfer } = event;
    let files = this.dataTransferToFiles(dataTransfer);
    await this.mergeFiles.perform(files);
  };

  mergeFiles = dropTask(
    waitFor(async (files) => {
      if (files.length > 1) {
        this.metrics.trackEvent({
          name: 'mergeFiles',
          numberOfFiles: files.length,
        });
        this.fileNames = files.map((f) => f.name);
        const Merge = wrap(new Worker('/workers/merge.js'));
        const merge = await new Merge(files);
        const blob = await merge.blob();
        this.objectUrl = window.URL.createObjectURL(blob);
        this.fileName = `${this.fileNames[0].split('.')[0]}-activity-merge.gpx`;
      }
    }),
  );

  cleanUp = () => {
    window.URL.revokeObjectURL(this.objectUrl);
  };

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

  onDragOver = (event) => {
    event.preventDefault();
    this.isDragging = true;
  };

  onDragEnd = (event) => {
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
  };

  onDragLeave = () => {
    this.isDragging = false;
  };

  <template>
    <section
      class="content {{if this.isDragging 'drag-over'}}"
      {{on "drop" this.onDrop}}
      {{on "dragover" this.onDragOver}}
      {{on "dragend" this.onDragEnd}}
      {{on "dragleave" this.onDragLeave}}
    >
      <div class="drop-zone" data-test-drop-zone>
        <main>
          <strong><button
              class="select-files"
              type="button"
              {{on "click" this.onFilesSelect}}
            >Select</button>
            or drag files to merge.</strong>
          <aside class="info">fit, gpx and tcx files accepted.</aside>
          <div class="status">
            {{#if this.isMerging}}
              Merging
              {{this.fileNames}}<span class="loading"></span>
            {{/if}}
          </div>

        </main>
      </div>
      <footer>
        <p>© 2021
          <a
            rel="noopener noreferrer"
            class="source"
            target="_blank"
            href="https://blog.mrloop.com/"
          >Ewan McDougall</a>
          ●
          <a
            rel="noopener noreferrer"
            class="source"
            target="_blank"
            href="https://github.com/mrloop/activity-merge/"
          >source code here</a></p>

      </footer>
      <div class="sponsor">
        <a class="link" href="https://picturewham.com?t=plm">
          Sponsored<br />by
          <img
            class="picture-wham-logo"
            src="images/picture-wham-logo-mark.svg"
            alt="Picture Wham Logo"
          />
        </a>
      </div>
    </section>

    <label class="file-input">Select files to merge<input
        data-test-input
        accept=".FIT,.fit,.GPX,.gpx,.TCX,.tcx,application/gpx+xml,application/vnd.garmin.tcx+xml"
        multiple
        type="file"
        {{click this.filesSelectClickCount}}
        {{on "change" this.onFilesSelected}}
      /></label>
    {{#if this.objectUrl}}
      <a
        data-test-download
        download={{this.fileName}}
        href={{this.objectUrl}}
        aria-hidden="true"
        {{click this.fileName}}
        {{on "click" this.cleanUp}}
      ></a>
    {{/if}}
  </template>
}
