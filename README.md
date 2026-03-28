# ScryfallLinks

ScryfallLinks is a [MediaWiki extension](https://www.mediawiki.org/wiki/Manual:Extensions) that creates [Scryfall](https://scryfall.com/) links from [*Magic: The Gathering*](https://magic.wizards.com/) card names.

It is designed to be backwards-compatible with the [MTG Wiki](https://mtg.wiki)'s "MTGSCards" extension.

It uses the [Scryfall API](https://scryfall.com/docs/api/images) to load card images, and the [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) for tooltips.

## Usage

### `<c>` / `<card>` — Single card link

Creates a link to a card on Scryfall, with an image tooltip on hover.

```
<c>Black Lotus</c>
<card>Ancestral Recall</card>
```

#### Parameters

| Parameter | Description |
|-----------|-------------|
| `set`     | Set abbreviation (e.g. `UGL`). |
| `number`  | Collector number. Used with `set` to identify a specific printing. |
| `lang`    | Language code (e.g. `de`). Requires both `set` and `number`. |
| `title`   | Custom display text. Defaults to the card name. |

```
<card set="UGL" number="28">B.F.M. (Big Furry Monster)</card>
<card set="UGL" number="29" title="Part 2">B.F.M. (Big Furry Monster)</card>
<card set="6ED" number="4" lang="de" title="Götterdämmerung">Armageddon</card>
```

### `<cs>` / `<cards>` — Multiple card links

Creates a link for each line. Takes no parameters.

```
<cs>
Black Lotus
Ancestral Recall
Time Walk
</cs>
```

### `<d>` / `<deck>` — Deck list

Renders a full deck list with section headers, card counts, and export buttons.

```
<deck title="My Deck">
Creatures
4 Snapcaster Mage
3 Murktide Regent

Spells
4 Counterspell

Lands
4 Flooded Strand

Sideboard
2 Subtlety
</deck>
```

#### Parameters

| Parameter | Description |
|-----------|-------------|
| `title`   | Deck name displayed at the top. Defaults to "Untitled Deck". |

Lines starting with a number are parsed as `[quantity] [card name]`. Other lines become section headers. `Sideboard` or `SB` starts the sideboard section.

## Development

Running `npm test` and `composer test` will run automated code checks.

If you want to hack on this, whatever you're looking for is probably in `extension.json`, `/resources`, or `/src`.
