/**
 * Applies the stored theme before first paint.
 *
 * This has to be a blocking inline script: with a static export there is no
 * server to read a cookie, so any later approach produces a white flash for
 * dark-mode users on every page load.
 */
const script = `
(function () {
  try {
    var stored = localStorage.getItem('b101-theme');
    var dark = stored ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    // globals.css puts the dark values on :root and the light ones on .light,
    // so light is the class to add. Adding 'dark' matched no rule at all,
    // which left the toggle inert and light mode unreachable.
    if (!dark) document.documentElement.classList.add('light');
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
