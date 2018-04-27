( function () {
	var el = document.createElement( 'div' );
	el.style.display = 'none';
	el.id = 'js--card-popup';
	document.body.append( el );
}() );

$( function () {
	/* global tippy */
	const tip = tippy( '.ext-scryfall-link', {
		arrow: false,
		animateFill: false,
		followCursor: true,
		html: '#js--card-popup',
		placement: 'top',
		touchHold: true,
		delay: [ 50, 0 ],
		animation: 'fade',
		duration: 0,
		performance: true,
		theme: 'scryfall',
		onShow() {
			const thisPopper = this,
				content = thisPopper.querySelector( '.tippy-content' ),
				/* eslint no-underscore-dangle: ["error", { "allow": ["_reference"] }] */
				target = thisPopper._reference,
				cardNameParam = 'exact=' + target.dataset.cardName,
				cardSet = target.dataset.cardSet,
				cardSetParam = cardSet ? '&set=' + cardSet : '',
				cardJSON = 'https://api.scryfall.com/cards/named?' + cardNameParam + cardSetParam;
			var rotationClass = 'ext-scryfall-rotate-0';
			if ( tip.loading || content.innerHTML !== '' ) { return; }
			tip.loading = true;
			// Hide the tooltip until we've finished loaded the image
			thisPopper.style.display = 'none';
			// fetch() only works on modern browsers
			fetch( cardJSON )
				.then( response => {
					if ( !response.ok ) { throw Error( response.statusText ); }
					return response;
				} )
				.then( response => response.json() )
				.then( data => {
					if ( data.hasOwnProperty( 'card_faces' ) ) {
						const isSecondface = data.card_faces[ 0 ].name.replace( /[^a-z]/ig, '' ).toUpperCase() !==
							decodeURIComponent( target.dataset.cardName ).replace( /[^a-z]/ig, '' ).toUpperCase();
						if ( data.layout === 'transform' || data.layout === 'double_faced_token' ) {
							const i = isSecondface ? 1 : 0;
							return data.card_faces[ i ].image_uris.normal;
						} else if ( data.layout === 'split' ) {
							if ( data.card_faces[ 1 ].oracle_text.startsWith( 'Aftermath' ) ) {
								if ( isSecondface ) { rotationClass = 'ext-scryfall-rotate-90ccw'; }
							} else { rotationClass = 'ext-scryfall-rotate-90cw'; }
						} else if ( data.layout === 'flip' ) {
							if ( isSecondface ) { rotationClass = 'ext-scryfall-rotate-180'; }
						}
					}
					if ( data.layout === 'planar' ) { rotationClass = 'ext-scryfall-rotate-90cw'; }
					return data.image_uris.normal;
				} )
				.then( imageURI => fetch( imageURI ) )
				.then( response => response.blob() )
				.then( blob => {
					const url = URL.createObjectURL( blob ),
						img = document.createElement( 'img' );
					img.classList.add( 'ext-scryfall-cardimage' );
					img.classList.add( rotationClass );
					img.src = url;
					img.alt = target.text;
					img.width = 244;
					content.append( img );
					// Show the tooltip by removing display:none
					thisPopper.style.removeProperty( 'display' );
					tip.loading = false;
				} )
				.catch( function () {
					// TODO: This should be localized
					content.innerHTML = 'Preview error';
					content.parentNode.classList.remove( 'scryfall-theme' );
					content.parentNode.classList.add( 'ext-scryfall-error' );
					// Show the tooltip by removing display:none
					thisPopper.style.removeProperty( 'display' );
					tip.loading = false;
				} );
		},
		onHidden() {
			const content = this.querySelector( '.tippy-content' );
			content.innerHTML = '';
		},
		// prevent tooltip from displaying over button
		popperOptions: {
			modifiers: {
				preventOverflow: {
					enabled: false
				},
				hide: {
					enabled: false
				}
			}
		}
	} );
}() );
