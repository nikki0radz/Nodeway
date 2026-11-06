# Nodeway

A browser-local viewer for saved RocketSolver decisions. It does not solve poker games.

## Try an import

Open the hosted Nodeway site, choose **Choose a file**, and select your `.rar` archive or an extracted `.rsl` solution. For an archive, choose one of the listed saves. Click an action to follow its branch; use the path, Back, or Start again to revisit a decision. **Export path image** downloads a PNG; **Import report** downloads the decoded settings and current path as JSON.

Files are read locally in a Web Worker. The app does not upload solution data, contact RocketSolver, execute its installer, or require a running solver. Refreshing the page clears the import. The ten original sample concepts remain under **Concept lab** and are explicitly separate from imported data.

## Current support and limits

- RocketSolver 1.15.0 / RSOL container format 12, as found in the four supplied saves.
- Six-player, 100 BB, no-limit Hold'em preflop saves, with the tested position order and 0.5 / 1 blinds.
- RAR archives or individual RSL files up to 256 MB. Multipart and password-protected archives are rejected. Archive expansion is limited to 512 MB / 1,000 entries.
- Genuine saved action branches and raise amounts, reconstructed player order, committed chips, and preflop endpoints.
- **Hand ranges, frequencies, equity and EV are not displayed.** Their numerical mapping still needs verification against RocketSolver. Saved range dimensions are checked against reconstructed action counts, but range payloads are not decoded by this preview.
- No postflop navigation yet; it stops explicitly when the preflop round ends.
- Directory and consumed encrypted sections are AES-GCM authenticated. The final 32 footer bytes are not interpreted. This is an experimental reader, not a guarantee of compatibility with other saves.

## Develop

Requires Node.js 20+ and npm. `npm ci`, then `npm run build` produces the self-contained static `dist/` directory. Serve `dist/` on localhost or HTTPS (Web Crypto requires a secure context). Do not open `index.html` directly with a `file://` URL.

`index.html` at the repository root redirects to `dist/`, so GitHub Pages configured to publish the `main` branch root can use the committed build without a GitHub Actions workflow. Other static hosts should publish `dist/`. Rebuild and commit generated assets after source changes.

- `src/rsl.js`: authenticated container reader, Zstandard decoding, tree reconstruction and supported-configuration checks.
- `src/worker.js`: RAR listing/extraction and background import.
- `src/app.js`: upload flow, path navigation, report and PNG export.
- `dist/concepts.html`: the original ten illustrative UI concepts.

The format constants in `src/format-keys.js` were read as data from the supplied 1.15.0 application module for saved-file interoperability. No RocketSolver executable or native module is distributed in this repository. The reader does not implement licensing, solving or application activation.

## Verification

Run `npm test` for the public malformed-input checks. Private integration fixtures are deliberately not committed:

```
NODEWAY_FIXTURES=/path/to/folder/with/sample-1.rsl-through-sample-4.rsl npm test
NODEWAY_ARCHIVE=/path/to/solutions.rar node --test tests/worker.test.mjs
```

The importer was tested on all four original RSL saves and the complete original RAR, including sequential selection of all four saves through the built worker. Reconstructed total tree nodes: 3,681,164; 2,238,508; 3,277,919; 1,835,263. Preflop decision counts: 22,236; 9,932; 22,236; 9,932. All six per-player action counts match each save's range dimensions. Tampered directories and encrypted tree data are rejected.

These structural checks do not validate strategy percentages. A comparison with RocketSolver is still required before enabling those values.

Third-party dependency licences are included in `dist/THIRD-PARTY-LICENSES.txt`. RAR extraction uses node-unrar-js / UnRAR; Zstandard decoding uses fzstd.
