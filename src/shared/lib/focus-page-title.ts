// Every page renders its h1 with this id. Focus moves there without scrolling, so a visitor deep in
// a list keeps their place while screen readers still announce where they are.
export function focusPageTitle(): void {
  document.getElementById('page-title')?.focus({ preventScroll: true })
}
