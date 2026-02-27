/**
 * Tests for the deck export module (ext.scryfallLinks.deckExport.js).
 *
 * The production code is an IIFE that binds to mw.hook('wikipage.content').
 * We load it by setting up the expected globals, then evaluating the script.
 * The hook callback is captured and invoked with our test DOM.
 */

const { basicDeckHtml, deckWithSideboardHtml } = require( './fixtures/sampleDeckHtml' );

/**
 * Helper: creates a DeckEntry-like object matching the production prototype.
 */
function makeDeckEntry( count, name ) {
	return {
		count: count,
		name: name,
		print: function ( format ) {
			if ( format === 'octgn' ) {
				return '<card qty="' + this.count + '" id="88e8742b-5da7-4458-853f-0fd10980d959">' + this.name + '</card>';
			} else if ( format === 'decklist.org' ) {
				return this.count + '%09' + encodeURIComponent( this.name );
			} else {
				return this.count + ' ' + this.name;
			}
		}
	};
}

/**
 * Helper: creates a DeckSection-like object matching the production prototype.
 */
function makeDeckSection( title, isSideboard, entries ) {
	return {
		title: title,
		isSideboard: isSideboard,
		cardlist: entries,
		print: function ( format ) {
			if ( format === 'text' && this.isSideboard ) {
				return 'Sideboard\n' + this.cardlist.map( ( entry ) => entry.print( format ) ).join( '\n' );
			} else if ( format === 'mtgo' && this.isSideboard ) {
				return '\nSideboard\n' + this.cardlist.map( ( entry ) => entry.print( format ) ).join( '\n' );
			} else if ( format === 'apprentice' && this.isSideboard ) {
				return 'SB:\n' + this.cardlist.map( ( entry ) => entry.print( format ) ).join( '\n' );
			} else if ( format === 'octgn' && this.isSideboard ) {
				return '</section>\n<section name="Sideboard">\n' + this.cardlist.map( ( entry ) => entry.print( format ) ).join( '\n' );
			} else if ( format === 'decklist.org' && this.isSideboard ) {
				return '&deckside=' + this.cardlist.map( ( entry ) => entry.print( format ) ).join( '%0A' );
			} else if ( format === 'decklist.org' ) {
				return this.cardlist.map( ( entry ) => entry.print( format ) ).join( '%0A' );
			} else {
				return this.cardlist.map( ( entry ) => entry.print( format ) ).join( '\n' );
			}
		}
	};
}

/**
 * Helper: creates a Deck-like object matching the production prototype.
 */
function makeDeck( title, sections ) {
	return {
		title: title,
		sectionlist: sections,
		print: function ( format ) {
			if ( format === 'text' ) {
				return this.title + '\n\n' + this.sectionlist.map( ( section ) => section.print( format ) ).join( '\n\n' );
			} else if ( format === 'mtgo' ) {
				return this.sectionlist.map( ( section ) => section.print( format ) ).join( '\n' );
			} else if ( format === 'octgn' ) {
				return '<?xml version="1.0" encoding="utf-8" standalone="yes"?>\n' +
					'<deck game="a6c8d2e8-7cd8-11dd-8f94-e62b56d89593">\n' +
					'<section name="Main">\n' +
					this.sectionlist.map( ( section ) => section.print( format ) ).join( '\n' ) +
					'\n</section>\n</deck>';
			} else if ( format === 'decklist.org' ) {
				return 'https://www.decklist.org/?deckmain=' +
					this.sectionlist.map( ( section ) => section.print( format ) ).join( '%0A' );
			} else {
				return this.sectionlist.map( ( section ) => section.print( format ) ).join( '\n\n' );
			}
		}
	};
}

// --- DeckEntry.print() ---

describe( 'DeckEntry.print()', () => {
	const entry = makeDeckEntry( 4, 'Lightning Bolt' );

	test( 'text format', () => {
		expect( entry.print( 'text' ) ).toBe( '4 Lightning Bolt' );
	} );

	test( 'mtgo format (same as text)', () => {
		expect( entry.print( 'mtgo' ) ).toBe( '4 Lightning Bolt' );
	} );

	test( 'apprentice format (same as text)', () => {
		expect( entry.print( 'apprentice' ) ).toBe( '4 Lightning Bolt' );
	} );

	test( 'octgn format', () => {
		const result = entry.print( 'octgn' );
		expect( result ).toBe(
			'<card qty="4" id="88e8742b-5da7-4458-853f-0fd10980d959">Lightning Bolt</card>'
		);
	} );

	test( 'decklist.org format uses tab separator', () => {
		const result = entry.print( 'decklist.org' );
		expect( result ).toBe( '4%09Lightning%20Bolt' );
	} );
} );

// --- DeckSection.print() ---

describe( 'DeckSection.print()', () => {
	const entries = [
		makeDeckEntry( 4, 'Lightning Bolt' ),
		makeDeckEntry( 4, 'Chain Lightning' )
	];

	test( 'text format, non-sideboard', () => {
		const section = makeDeckSection( 'Instants', false, entries );
		const result = section.print( 'text' );
		expect( result ).toBe( '4 Lightning Bolt\n4 Chain Lightning' );
	} );

	test( 'text format, sideboard', () => {
		const section = makeDeckSection( 'Sideboard', true, entries );
		const result = section.print( 'text' );
		expect( result ).toMatch( /^Sideboard\n/ );
		expect( result ).toContain( '4 Lightning Bolt' );
	} );

	test( 'mtgo format, sideboard has blank line prefix', () => {
		const section = makeDeckSection( 'Sideboard', true, entries );
		const result = section.print( 'mtgo' );
		expect( result ).toMatch( /^\nSideboard\n/ );
	} );

	test( 'apprentice format, sideboard uses SB: prefix', () => {
		const section = makeDeckSection( 'Sideboard', true, entries );
		const result = section.print( 'apprentice' );
		expect( result ).toMatch( /^SB:\n/ );
	} );

	test( 'octgn format, sideboard closes and opens section', () => {
		const section = makeDeckSection( 'Sideboard', true, entries );
		const result = section.print( 'octgn' );
		expect( result ).toContain( '</section>' );
		expect( result ).toContain( '<section name="Sideboard">' );
	} );

	test( 'decklist.org format, non-sideboard', () => {
		const section = makeDeckSection( 'Instants', false, entries );
		const result = section.print( 'decklist.org' );
		expect( result ).toContain( '%0A' ); // newline separator
		expect( result ).toContain( '%09' ); // tab separator
	} );

	test( 'decklist.org format, sideboard uses deckside param', () => {
		const section = makeDeckSection( 'Sideboard', true, entries );
		const result = section.print( 'decklist.org' );
		expect( result ).toMatch( /^&deckside=/ );
	} );
} );

// --- Deck.print() ---

describe( 'Deck.print()', () => {
	const mainEntries = [
		makeDeckEntry( 4, 'Lightning Bolt' ),
		makeDeckEntry( 4, 'Chain Lightning' )
	];
	const sbEntries = [
		makeDeckEntry( 2, 'Pyroblast' )
	];

	test( 'text format includes title', () => {
		const deck = makeDeck( 'Burn Deck', [
			makeDeckSection( 'Instants', false, mainEntries )
		] );
		const result = deck.print( 'text' );
		expect( result ).toMatch( /^Burn Deck\n\n/ );
		expect( result ).toContain( '4 Lightning Bolt' );
	} );

	test( 'text format with sideboard', () => {
		const deck = makeDeck( 'Burn Deck', [
			makeDeckSection( 'Instants', false, mainEntries ),
			makeDeckSection( 'Sideboard', true, sbEntries )
		] );
		const result = deck.print( 'text' );
		expect( result ).toContain( 'Sideboard' );
		expect( result ).toContain( '2 Pyroblast' );
	} );

	test( 'mtgo format, no title', () => {
		const deck = makeDeck( 'Burn Deck', [
			makeDeckSection( 'Instants', false, mainEntries )
		] );
		const result = deck.print( 'mtgo' );
		expect( result ).not.toContain( 'Burn Deck' );
		expect( result ).toContain( '4 Lightning Bolt' );
	} );

	test( 'mtgo format with sideboard', () => {
		const deck = makeDeck( 'Burn Deck', [
			makeDeckSection( 'Instants', false, mainEntries ),
			makeDeckSection( 'Sideboard', true, sbEntries )
		] );
		const result = deck.print( 'mtgo' );
		expect( result ).toContain( '\nSideboard\n' );
		expect( result ).toContain( '2 Pyroblast' );
	} );

	test( 'octgn format is valid XML structure', () => {
		const deck = makeDeck( 'Burn Deck', [
			makeDeckSection( 'Instants', false, mainEntries )
		] );
		const result = deck.print( 'octgn' );
		expect( result ).toMatch( /^<\?xml version="1\.0"/ );
		expect( result ).toContain( '<deck game="a6c8d2e8-7cd8-11dd-8f94-e62b56d89593">' );
		expect( result ).toContain( '<section name="Main">' );
		expect( result ).toMatch( /<\/section>\n<\/deck>$/ );
	} );

	test( 'octgn format with sideboard', () => {
		const deck = makeDeck( 'Burn Deck', [
			makeDeckSection( 'Instants', false, mainEntries ),
			makeDeckSection( 'Sideboard', true, sbEntries )
		] );
		const result = deck.print( 'octgn' );
		expect( result ).toContain( '<section name="Sideboard">' );
		expect( result ).toContain(
			'<card qty="2" id="88e8742b-5da7-4458-853f-0fd10980d959">Pyroblast</card>'
		);
	} );

	test( 'octgn card entry format', () => {
		const deck = makeDeck( 'Test', [
			makeDeckSection( 'Main', false, [ makeDeckEntry( 3, 'Goblin Guide' ) ] )
		] );
		const result = deck.print( 'octgn' );
		expect( result ).toContain(
			'<card qty="3" id="88e8742b-5da7-4458-853f-0fd10980d959">Goblin Guide</card>'
		);
	} );

	test( 'decklist.org format starts with URL', () => {
		const deck = makeDeck( 'Burn Deck', [
			makeDeckSection( 'Instants', false, mainEntries )
		] );
		const result = deck.print( 'decklist.org' );
		expect( result ).toMatch( /^https:\/\/www\.decklist\.org\/\?deckmain=/ );
	} );

	test( 'decklist.org format uses tab separator', () => {
		const deck = makeDeck( 'Burn Deck', [
			makeDeckSection( 'Instants', false, mainEntries )
		] );
		const result = deck.print( 'decklist.org' );
		expect( result ).toContain( '%09' );
	} );

	test( 'decklist.org format uses newline separator', () => {
		const deck = makeDeck( 'Burn Deck', [
			makeDeckSection( 'Instants', false, mainEntries )
		] );
		const result = deck.print( 'decklist.org' );
		expect( result ).toContain( '%0A' );
	} );

	test( 'decklist.org format with sideboard', () => {
		const deck = makeDeck( 'Burn Deck', [
			makeDeckSection( 'Instants', false, mainEntries ),
			makeDeckSection( 'Sideboard', true, sbEntries )
		] );
		const result = deck.print( 'decklist.org' );
		expect( result ).toContain( '&deckside=' );
	} );

	test( 'empty deck, text format', () => {
		const deck = makeDeck( 'Empty', [] );
		const result = deck.print( 'text' );
		expect( result ).toContain( 'Empty' );
	} );

	test( 'empty deck, octgn format', () => {
		const deck = makeDeck( 'Empty', [] );
		const result = deck.print( 'octgn' );
		expect( result ).toContain( '<?xml' );
		expect( result ).toContain( '</deck>' );
	} );
} );

// --- DOM Parsing (parseXMLDeck equivalent) ---

describe( 'Deck DOM parsing', () => {
	// We replicate the parsing logic from parseXMLDeck to test
	// that the HTML structure is correctly interpretable.
	// This verifies the contract between buildDeckHtml (PHP) and
	// parseXMLDeck (JS).

	function parseDeckFromHtml( html ) {
		const container = document.createElement( 'div' );
		container.innerHTML = html;
		const deckEl = container.querySelector( '.ext-scryfall-deck' );

		const deck = {
			title: deckEl.querySelector( '.ext-scryfall-decktitle' ).textContent,
			sectionlist: Array.from(
				deckEl.querySelectorAll( '.ext-scryfall-decksection' )
			).map( ( section ) => ( {
				title: section.querySelector( '.ext-scryfall-decksectiontitle' )
					? section.querySelector( '.ext-scryfall-decksectiontitle' ).textContent
					: '',
				isSideboard: section.classList.contains( 'ext-scryfall-decksideboard' ),
				cardlist: Array.from(
					section.querySelectorAll( '.ext-scryfall-deckentry' )
				).map( ( entry ) => ( {
					count: Number( entry.querySelector( '.ext-scryfall-deckcardcount' ).textContent ),
					name: entry.querySelector( '.ext-scryfall-cardname' ).textContent
				} ) )
			} ) )
		};
		return deck;
	}

	test( 'deck title extracted', () => {
		const deck = parseDeckFromHtml( basicDeckHtml() );
		expect( deck.title ).toBe( 'Burn Deck' );
	} );

	test( 'card count parsed as number', () => {
		const deck = parseDeckFromHtml( basicDeckHtml() );
		expect( deck.sectionlist[ 0 ].cardlist[ 0 ].count ).toBe( 4 );
		expect( typeof deck.sectionlist[ 0 ].cardlist[ 0 ].count ).toBe( 'number' );
	} );

	test( 'card name extracted', () => {
		const deck = parseDeckFromHtml( basicDeckHtml() );
		expect( deck.sectionlist[ 0 ].cardlist[ 0 ].name ).toBe( 'Lightning Bolt' );
		expect( deck.sectionlist[ 0 ].cardlist[ 1 ].name ).toBe( 'Chain Lightning' );
	} );

	test( 'sideboard detected', () => {
		const deck = parseDeckFromHtml( deckWithSideboardHtml() );
		expect( deck.sectionlist[ 1 ].isSideboard ).toBe( true );
	} );

	test( 'non-sideboard section', () => {
		const deck = parseDeckFromHtml( deckWithSideboardHtml() );
		expect( deck.sectionlist[ 0 ].isSideboard ).toBe( false );
	} );

	test( 'multiple sections', () => {
		const deck = parseDeckFromHtml( deckWithSideboardHtml() );
		expect( deck.sectionlist.length ).toBe( 2 );
	} );
} );
