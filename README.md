# Nodeway

A browser-local viewer for saved RocketSolver decisions. It does not solve poker games.

## Try an import

Open the hosted Nodeway site, choose **Choose a file**, and select your `.rar` archive or an extracted `.rsl` solution. For an archive, choose one of the listed saves. Choose multiple views with the checkboxes (table + grid by default). The ten views share one selected node: tree, guided journey, folders, table, hand grid, replay, comparison, visual atlas, search and draggable canvas. Use the up/down controls to reorder panels. Click an action in any view to update the others; use the path, Back, or Start again to revisit a decision. Layout preferences are saved on this device; solution data stays in the tab. **Export path image** downloads a PNG; **Import report** downloads the decoded settings and current path as JSON.

Files are read locally in a Web Worker. The app does not upload solution data, contact RocketSolver, execute its installer, or require a running solver. Refreshing the page clears the import. The ten original sample concepts remain under **Concept lab** and are explicitly separate from imported data.

## Current support and limits

- RocketSolver 1.15.0 / RSOL container format 12, as found in the four supplied saves.
- Six-player, 100 BB, no-limit Hold'em preflop saves, with the tested position order and 0.5 / 1 blinds.
- RAR archives or individual RSL files up to 256 MB. Multipart and password-protected archives are rejected. Archive expansion is limited to 512 MB / 1,000 entries.
- Genuine saved action branches and raise amounts, reconstructed player order, committed chips, and preflop endpoints.
- **The hand grid is experimental.** Saved `R_<player>_0` weights are decoded on demand, interpreted as 169 hand-major rows and normalized per node/action. The triangular pairs/offsuit-then-suited hand mapping is inferred, not independently confirmed against RocketSolver. Persistent warnings are included on the grid and its PNG export. Zero-mass hands display no data, not a fabricated frequency. EV is decoded experimentally as described below; equity is not displayed. Cached range requests use node IDs, solution serials and request IDs to prevent stale data being displayed after navigation or imports.
- No postflop navigation yet; it stops explicitly when the preflop round ends.
- Directory and consumed encrypted sections are AES-GCM authenticated. The final 32 footer bytes are not interpreted. This is an experimental reader, not a guarantee of compatibility with other saves.

## Develop

Requires Node.js 20+ and npm. `npm ci`, then `npm run build` produces the self-contained static `dist/` directory. Serve `dist/` on localhost or HTTPS (Web Crypto requires a secure context). Do not open `index.html` directly with a `file://` URL.

`index.html` at the repository root redirects to `dist/`, so GitHub Pages configured to publish the `main` branch root can use the committed build without a GitHub Actions workflow. Other static hosts should publish `dist/`. Rebuild and commit generated assets after source changes.

- `src/rsl.js`: authenticated container reader, Zstandard decoding, tree reconstruction and supported-configuration checks.
- `src/worker.js`: RAR listing/extraction and background import.
- `src/app.js`: upload flow, shared path state, range request coordination, report and PNG export.
- `src/views.js`: ten composable views, shared navigation, hand selection, replay, pin comparison, search and canvas.
- `src/ranges.js`: on-demand R-section decoding and explicitly experimental hand mapping.
- `dist/concepts.html`: the original ten illustrative UI concepts.

The format constants in `src/format-keys.js` were read as data from the supplied 1.15.0 application module for saved-file interoperability. No RocketSolver executable or native module is distributed in this repository. The reader does not implement licensing, solving or application activation.

## Verification

Run `npm test` for the public malformed-input checks. Private integration fixtures are deliberately not committed:

```
NODEWAY_FIXTURES=/path/to/folder/with/sample-1.rsl-through-sample-4.rsl npm test
NODEWAY_ARCHIVE=/path/to/solutions.rar node --test tests/worker.test.mjs
```

The importer was tested on all four original RSL saves and the complete original RAR, including sequential selection of all four saves through the built worker. Reconstructed total tree nodes: 3,681,164; 2,238,508; 3,277,919; 1,835,263. Preflop decision counts: 22,236; 9,932; 22,236; 9,932. All six per-player action counts match each save's range dimensions. Tampered directories and encrypted tree data are rejected.

These structural checks do not independently validate hand labels or strategy percentages. The experimental grid needs comparison with RocketSolver at identical nodes before it can be treated as verified strategy data.

Third-party dependency licences are included in `dist/THIRD-PARTY-LICENSES.txt`. RAR extraction uses node-unrar-js / UnRAR; Zstandard decoding uses fzstd.

## Design feedback

The saved-solution viewer and all sample concepts include Design mode. The switch pauses replay and navigation; in-flight importer messages are deferred until it is turned off. Right click, long press, click, or focus an element and press Enter to leave a comment. Comments capture a CSS selector, visible label, panel, viewport, page, and selected node/path, with no solution binary or strategy arrays.

Drafts and submission history are kept in browser local storage under `nodeway-design-comments-v1`, shared between both pages. **Send comments to Nicole** offers direct email first: short batches are prefilled into a `mailto:` draft, and longer batches can be copied into webmail or downloaded as JSON to attach. Where supported, the native file share sheet is available. No activation is needed for direct email. The app never marks a draft sent just because it opened an email or copied text. Drafts remain saved.

**Try FormSubmit instead** optionally sends a native multipart form to FormSubmit for `hello@tanglevia.com` in a new tab. The app creates a real JSON file attachment and includes the same JSON in the message as a fallback. No GitHub account, mail app, API key or user file selection is needed. Existing drafts survive the migration from GitHub; old submitted history is preserved.

On first use, Nicole must activate FormSubmit using its email. Attachments are not retained during activation, so resend the batch after activation. Provider verification may appear in the new tab. Drafts are not marked accepted merely because the form was opened: FormSubmit returns to `email-result.html`, which matches the local batch/nonce and notifies the original tab through browser storage. This is a service handoff acknowledgment, not proof of inbox delivery. History and JSON backup remain available. Closing the service tab, activation, failed requests and missing storage do not delete feedback. Batches are bounded; remaining comments can be emailed separately. Provider limits and spam filtering still apply.

The JSON attachment, form fields and receipt matching are tested locally. Actual receipt in Nicole's inbox requires her one-time activation and a live send.

## Experimental EV and cross-solution comparison

The table shows acting-player EV from the current decision (relative EV). The hand detail shows each action's EV and sample count. Compare EV pins a snapshot, survives opening another RSL or archive entry in the same tab, and finds the equivalent action path in the next solution. Node IDs alone are not matched. A delta is withheld when paths, acting players, committed bets, active players, game/solver settings, or complete EV data differ. Available actions are shown side by side, so a call option can be compared with a raise/fold tree. EV-saving settings are excluded from compatibility checks because they affect storage rather than the game. Pins are session-only.

`Q_<player>_0` has 8-byte records in the same hand/action layout as R: little-endian unsigned sample count followed by a float32 running EV mean in milli-BB. A zero count means missing, not zero EV. Inspection of the supplied 1.15.0 native strategy reader at 0x180161cb0–0x180161d3b shows a nonzero lower-u32 check and conversion of the upper float divided by 1000, multiplied by the native monetary scale. This viewer supports only BB=1 and displays BB directly. The renderer adds the acting player's contribution for relative EV. Fold observations in all four private fixtures are checked against minus that contribution. No proprietary executable is shipped.

Hand EV is the strategy-weighted sum of action EVs. Node EV averages hand EVs with the saved R hand mass. A missing EV on any played action prevents a complete node result; zero-probability actions do not contribute. Unavailable values remain null. Counts below 1,000 prompt a sample-size notice; this is a display heuristic, not a statistical confidence bound. EV read failures leave tree/range navigation usable.

The hand mapping, saved-weight averaging and displayed results still need an independent comparison against RocketSolver's UI/export, especially at deeper nodes. Differences between separately solved strategies do not isolate the causal value of one extra action: reaching ranges, opponents and convergence may differ. Results are BB per visit to the selected node, not BB per 100 dealt hands. No solve is run and no new branches are invented.
