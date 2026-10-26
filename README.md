# Advance Ad Filters

Ad filters for sites where ordinary network blocking isn't enough, because the ads come inside the same responses as
the content. Each site has a filter list in standard scriptlet syntax and, where needed, a small readable script.

## Files

```
filters/<site>.txt     filter list (uBlock Origin scriptlet syntax)
scripts/<site>-*.js    optional page scripts, plain JavaScript
tests/                 checks every file (node --test)
```

### YouTube

- `filters/youtube.txt` removes ad data from player responses, both in the first page load
  (`ytInitialPlayerResponse`) and in responses loaded while moving around the site (`JSON.parse`).
- `scripts/youtube-fast-start.js` handles what is left: it presses visible "Skip ad" buttons, moves a showing ad to its
  end, restarts playback if the player is stuck after an ad was removed, and shortens the one 17-second native timer
  YouTube uses when it waits for a removed ad. Other timers are not changed.

## Using the filters

**Ad blockers and browsers with a filter engine** (uBlock Origin, or any engine with the `set-constant` and
`json-prune` scriptlets): add the raw list URL as a custom filter list, for example

```
https://raw.githubusercontent.com/Craftynor-Studio/advance-ad-filters/main/filters/youtube.txt
```

The `! Expires: 1 day` header asks the engine to check for changes daily.

**Apps with a WebView or their own engine**: apply the list with your engine, and add
`scripts/youtube-fast-start.js` as a document-start script for `https://www.youtube.com` and `https://m.youtube.com`
(top frame only). The script has no dependencies, makes no network requests, and is safe to run more than once
(it starts only once per page).

## Rules for changes

- Filters must remove ads only. No changes to the page's content, layout or features beyond that.
- Scripts make no network requests, don't read cookies or storage, and stay readable: no minified or obfuscated code.
- Each rule gets a comment that says what it removes.

## Contributing

1. Fork the repo and create a branch.
2. Change a list or script, and test it on the site in a browser that applies it.
3. Run `node --test` (Node 20 or newer, no dependencies).
4. Open a pull request describing what was shown before, what changes, and how you tested it.

## License

MIT. See [LICENSE](LICENSE).
