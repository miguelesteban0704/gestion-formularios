export function getDropdownWidth(triggerWidth, dropdownMinWidth = 0) {
  return Math.max(triggerWidth, dropdownMinWidth);
}
