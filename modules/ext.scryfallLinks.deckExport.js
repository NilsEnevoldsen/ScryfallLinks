( function () {
	const DeckEntry = {
			count: 0,
			name: '',
			asText: function () {
				return this.count + ' ' + this.name;
			}
		},
		DeckSection = {
			title: '',
			cardlist: [],
			asText: function () {
				return this.cardlist.map( entry => entry.asText() ).join( '\n' );
			}
		},
		Deck = {
			title: '',
			sectionlist: [],
			asText: function () {
				return this.sectionlist.map( section => section.asText() ).join( '\n\n' );
			}
		};

	function parseXMLDeck( xmlDeck ) {
		const deck = Object.create( Deck );
		deck.title = $( xmlDeck ).find( '.ext-scryfall-decktitle' ).text();
		deck.sectionlist = $( xmlDeck ).find( '.ext-scryfall-decksection' ).toArray().map( section => {
			const deckSection = Object.create( DeckSection );
			deckSection.title = $( section ).find( '.ext-scryfall-decksectiontitle' ).text();
			deckSection.cardlist = $( section ).find( '.ext-scryfall-deckentry' ).toArray().map( entry => {
				const deckEntry = Object.create( DeckEntry );
				deckEntry.count = +( $( entry ).find( '.ext-scryfall-deckcardcount' ).text() );
				deckEntry.name = $( entry ).find( '.ext-scryfall-cardname' ).text();
				return deckEntry;
			} );
			return deckSection;
		} );
		return deck;
	}

	function getDeck( event ) {
		const xmlDeck = $( event.target ).closest( '.ext-scryfall-deck' );
		return parseXMLDeck( xmlDeck );
	}

	$( function () {
		// eslint-disable-next-line no-console
		$( '.ext-scryfall-deckexport-text' ).click( event => console.log( getDeck( event ).asText() ) );
	} );
}() );

// mtgo
// mws
// apprentice
// octgn
