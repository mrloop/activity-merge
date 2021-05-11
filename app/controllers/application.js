import Controller from '@ember/controller';
import { action } from '@ember/object';

export default class ApplicationController extends Controller {
  @action onDrop(event) {
    event.preventDefault();
    let { dataTransfer } = event;
    if (dataTransfer.items) {
      [...dataTransfer.items].forEach((item, i) => {
        if (item.kind == 'file') {
          let file = item.getAsFile();
          this.logFile(file, i);
        }
      });
    } else {
      [...dataTransfer.files].forEach((file, i) => {
        this.logFile(file, i);
      });
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
