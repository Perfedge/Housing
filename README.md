# Housing

A standalone, browser-based housing planning app for high school students, focused on Healdsburg.

Open index.html in a modern browser. No installation, internet connection, or account is required.

Adjust the development controls, complete the classroom mission, pin and compare a baseline, and download your planning brief. Use JSON export to keep scenario backups. Reflections are not automatically saved.

All housing inputs and challenge thresholds are illustrative. This is an educational model, not an adopted City plan or a parcel feasibility assessment. See the app for formulas and limitations.

This app has its own browser storage key. To transfer scenarios from the earlier lab, export JSON there and import it here.

## GitHub Pages

This is a standalone static app. No Node.js, build command, API keys, or backend are required.

Publish this folder as the root of its own repository named Housing. In repository Settings > Pages, choose Deploy from a branch, then main and / (root), and save. The hosting URL is supplied by GitHub after deployment.

Keep index.html and .nojekyll in the repository root. Updates to the publishing branch redeploy the app. The app uses browser-local storage, so scenarios from local files will not automatically appear on the hosted site. Export JSON from the local version and import it on the hosted version to transfer them.

Source and data note: modeled inputs and thresholds are illustrative classroom assumptions. No verified current City housing requirement is asserted. Student scenarios are not uploaded to a backend by this app.
