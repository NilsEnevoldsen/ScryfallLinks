( function () {
	/*
	* This file provides the ability to download/export decks.
	*
	* This is what happens when an export link is clicked: The <deck> from the webpage
	* is vacuumed up just as it is, as an XML object. Then a function parses the XML deck into
	* a JSON object: a Deck, which contains DeckSections, which contains DeckEntrys (i.e. cards).
	* The print() function of a Deck object recursively calls the print() function on each
	* DeckSection, which recursively calls the print() function on each DeckEntry. The print()
	* functions all take a format parameter (such as mtgo).
	*
	* Want to add a new format? Define how to print the DeckEntries, DeckSections, and Deck,
	* then hook up a click event to a new ".ext-scryfall-deckexport-foo" element. Add the
	* element itself in Hooks.php.
	*/
	const DeckEntry = {
			count: 0,
			name: '',
			print: function ( format ) {
				if ( format === 'octgn' ) {
					return '<card qty="' + this.count + '" id="88e8742b-5da7-4458-853f-0fd10980d959">' + this.name + '</card>';
				} else if ( format === 'decklist.org' ) {
					return this.count + '%09' + encodeURIComponent( this.name );
				} else {
					return this.count + ' ' + this.name;
				}
			}
		},
		DeckSection = {
			title: '',
			isSideboard: false,
			cardlist: [],
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
		},
		Deck = {
			title: '',
			sectionlist: [],
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

	// parseXMLDeck() accepts a <deck> in XML and returns it in JSON
	function parseXMLDeck( $xmlDeck ) {
		const deck = Object.create( Deck );
		deck.title = $xmlDeck.find( '.ext-scryfall-decktitle' ).text();
		deck.sectionlist = $xmlDeck.find( '.ext-scryfall-decksection' ).toArray().map( ( section ) => {
			const deckSection = Object.create( DeckSection ),
				$section = $( section );
			deckSection.title = $section.find( '.ext-scryfall-decksectiontitle' ).text();
			deckSection.isSideboard = section.classList.contains( 'ext-scryfall-decksideboard' );
			deckSection.cardlist = $section.find( '.ext-scryfall-deckentry' ).toArray().map( ( entry ) => {
				const deckEntry = Object.create( DeckEntry ),
					$entry = $( entry );
				deckEntry.count = +( $entry.find( '.ext-scryfall-deckcardcount' ).text() );
				deckEntry.name = $entry.find( '.ext-scryfall-cardname' ).text();
				return deckEntry;
			} );
			return deckSection;
		} );
		return deck;
	}

	// getDeck() finds the nearest <deck> and returns it as a JSON object
	function getDeck( event ) {
		const $xmlDeck = $( event.target ).closest( '.ext-scryfall-deck' );
		return parseXMLDeck( $xmlDeck );
	}

	// Once we have the deck in the format we want it, this function downloads it as a file
	function download( filename, data, contenttype ) {
		const blob = new Blob( [ data ], { type: contenttype } );
		if ( window.navigator.msSaveOrOpenBlob ) {
			window.navigator.msSaveBlob( blob, filename );
		} else {
			const elem = window.document.createElement( 'a' );
			elem.href = window.URL.createObjectURL( blob );
			elem.download = filename;
			document.body.appendChild( elem );
			elem.click();
			document.body.removeChild( elem );
		}
	}

	// Although we use download() in production, printToConsole() is useful for debugging
	function printToConsole( filename, data, contenttype ) { // eslint-disable-line no-unused-vars
		console.log( contenttype + '\n' + filename + '\n' + data ); // eslint-disable-line no-console
	}

	// Initialize the download dropdown menu(s)
	function initDownloadUi( $content ) {
		const $decks = $content.find( '.ext-scryfall-deckexport' ).not( '.loaded' );

		$decks.find( 'button.ext-scryfall-deckexport-text' ).on( 'click', ( event ) => {
			const deck = getDeck( event );
			download(
				deck.title + '.txt',
				deck.print( 'text' ),
				'text/plain'
			);
		} );

		$decks.find( '.ext-scryfall-deckexport-mtgo' ).on( 'click', ( event ) => {
			const deck = getDeck( event );
			download(
				deck.title + '.txt',
				deck.print( 'mtgo' ),
				'application/txt'
			);
		} );

		$decks.find( '.ext-scryfall-deckexport-apprentice' ).on( 'click', ( event ) => {
			const deck = getDeck( event );
			download(
				deck.title + '.dec',
				deck.print( 'apprentice' ),
				'application/dec'
			);
		} );

		$decks.find( '.ext-scryfall-deckexport-octgn' ).on( 'click', ( event ) => {
			const deck = getDeck( event );
			download(
				deck.title + '.o8d',
				deck.print( 'octgn' ),
				'text/plain'
			);
		} );

		$decks.find( '.ext-scryfall-deckexport-decklist' ).on( 'click', ( event ) => {
			const deck = getDeck( event ),
				uri = new URL( deck.print( 'decklist.org' ) );
			window.open( uri, '_blank' );
		} );

		// 'wikipage.content' may fire multiple times for a given content so mark
		// the download UI we just initialized as loaded so we don't repeat ourselves.
		$decks.addClass( 'loaded' );
	}

	mw.hook( 'wikipage.content' ).add( initDownloadUi );

}() );
