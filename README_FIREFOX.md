# Firefox Nightly on Android

This repository's default `manifest.json` targets Chromium browsers. Use
`manifest.firefox.json` for Firefox.

## Build the Firefox package

1. Copy `manifest.firefox.json` to a build folder and rename the copy to
   `manifest.json`.
2. Copy the extension's runtime files into that same folder:
   `background.js`, `contentScript.js`, `dateNowRefresh.js`,
   `pageScript.js`, `index.html`, `icon.png`, and any popup assets
   referenced by `index.html`.
3. Create a ZIP with those files at the ZIP root (do not put the folder itself
   around them). Rename the ZIP to `.xpi` only after packaging.
4. Submit the package to Mozilla Add-ons (AMO) for signing. Firefox Android
   generally rejects unsigned local extension packages as "corrupt"; changing
   the filename or zipping it again does not sign it.
5. Install the signed XPI on Firefox Nightly Android using the browser's
   supported add-on installation flow.

The Firefox manifest uses a stable Gecko ID, declares Android compatibility,
and uses Firefox's `background.scripts` format. The Date.now and game-refresh
source files are intentionally unchanged by this compatibility addition.
