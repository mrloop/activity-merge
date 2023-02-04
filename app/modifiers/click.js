import { modifier } from 'ember-modifier';

export default modifier(function click(element, [arg]) {
  if (arg) {
    element.click();
  }
});
