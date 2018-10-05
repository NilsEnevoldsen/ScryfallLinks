$( function () {
	/* global tippy */
	tippy( '.ext-scryfall-cardname', {
		// try to get image right away, correct later
		// shortcut retries
		arrow: false,
		animateFill: false,
		followCursor: true,
		placement: 'top',
		touchHold: true,
		delay: [ 50, 0 ],
		animation: 'fade',
		duration: 0,
		performance: true,
		theme: 'scryfall',
		onShow( tip ) {
			const params = tip.reference.dataset,
				searchURI = new URL( 'https://api.scryfall.com/cards/named' );
			var rotationClass = 'ext-scryfall-rotate-0';
			if ( tip.loading || tip.props.content !== '' ) { return; }
			tip.loading = true;
			// Hide the tooltip until we've finished loaded the image
			tip.popper.style.display = 'none';
			tip.reference.style.cursor = 'progress';
			if ( typeof params.cardSet === 'undefined' || typeof params.cardNumber === 'undefined' || params.cardNumber === '' ) {
				searchURI.searchParams.set( 'exact', params.cardName );
				if ( typeof params.cardSet !== 'undefined' ) {
					searchURI.searchParams.set( 'set', params.cardSet );
				}
			} else {
				searchURI.pathname = 'cards/' + params.cardSet.toLowerCase() + '/' + params.cardNumber.toLowerCase();
			}
			// fetch() only works on modern browsers
			fetch( searchURI )
				.then( response => {
					if ( !response.ok ) { throw Error( response.statusText ); }
					{ return response; }
				} )
				.then( response => response.json() )
				.then( data => {
					const referenceURI = new URL( tip.reference.href ),
						permapageURI = new URL( data.scryfall_uri ),
						utmSource = referenceURI.searchParams.get( 'utm_source' );
					permapageURI.searchParams.set( 'utm_source', utmSource );
					if ( data.hasOwnProperty( 'card_faces' ) ) {
						const isSecondface = data.card_faces[ 0 ].name.replace( /[^a-z]/ig, '' ).toUpperCase() !==
							decodeURIComponent( params.cardName ).replace( /[^a-z]/ig, '' ).toUpperCase();
						if ( data.layout === 'transform' || data.layout === 'double_faced_token' ) {
							if ( isSecondface ) {
								tip.reference.href = permapageURI.href + '&back';
								return data.card_faces[ 1 ].image_uris.normal;
							} else {
								return data.card_faces[ 0 ].image_uris.normal;
							}
						} else if ( data.layout === 'split' ) {
							if ( data.card_faces[ 1 ].oracle_text.startsWith( 'Aftermath' ) ) {
								if ( isSecondface ) { rotationClass = 'ext-scryfall-rotate-90ccw'; }
							} else { rotationClass = 'ext-scryfall-rotate-90cw'; }
						} else if ( data.layout === 'flip' ) {
							if ( isSecondface ) { rotationClass = 'ext-scryfall-rotate-180'; }
						}
					}
					tip.reference.href = permapageURI.href;
					if ( data.layout === 'planar' || data.name === 'Burning Cinder Fury of Crimson Chaos Fire' ) {
						rotationClass = 'ext-scryfall-rotate-90cw';
					}
					return data.image_uris.normal;
				} )
				.then( imgURI => fetch( imgURI ) )
				.then( response => response.blob() )
				.then( blob => {
					const url = URL.createObjectURL( blob ),
						img = document.createElement( 'img' );
					img.classList.add( 'ext-scryfall-cardimage', rotationClass );
					img.src = url;
					img.alt = tip.reference.text;
					img.width = 244;
					tip.setContent( img );
				} )
				.catch( function () {
					// TODO: This should be localized
					tip.setContent( 'Preview error' );
					tip.set( { theme: 'scryfall-error' } );
				} )
				.finally( function () {
					// Show the tooltip by removing display:none
					tip.popper.style.removeProperty( 'display' );
					// End cursor:progress
					tip.reference.style.removeProperty( 'cursor' );
					tip.loading = false;
				} );
		},
		onHidden( tip ) {
			tip.setContent( '' );
		}
	} );
}() );
