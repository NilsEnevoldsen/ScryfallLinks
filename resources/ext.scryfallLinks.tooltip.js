/* eslint one-var: "off", vars-on-top: "off" */
( function () {
	// Shows a tip that we've previously loaded
	function showCachedTip( tip ) {
		const img = document.createElement( 'img' );
		// The following class is used here:
		// * ext-scryfall-cardimage
		// * ext-scryfall-rotate-90ccw
		// * ext-scryfall-rotate-90cw
		// * ext-scryfall-rotate-180
		img.classList.add( 'ext-scryfall-cardimage', tip.reference.dataset.rotationClass );
		img.alt = tip.reference.text;
		img.width = 244;
		img.src = tip.reference.dataset.imgUri;
		tip.setContent( img );
	}

	// Fetches the correct card image as long as it's not a back face
	async function fastBranch( searchUri, tip, img, fastController ) {
		try {
			const fastImgUri = new URL( searchUri.href );
			fastImgUri.searchParams.set( 'format', 'image' );
			fastImgUri.searchParams.set( 'version', 'normal' );
			const response = await fetch( fastImgUri, { signal: fastController.signal } );
			if ( !response.ok ) {
				throw Error( response.status );
			}
			img.src = URL.createObjectURL( await response.blob() );
			tip.setContent( img );
			tip.reference.dataset.imgUri = img.src;
			// Show the tooltip by removing display:none
			tip.popper.style.removeProperty( 'display' );
		} catch ( e ) {
		}
	}

	// Rotates the image if necessary and fetches the correct card image if it's a back face
	async function correctBranch( searchUri, tip, img, fastController ) {
		const response = await fetch( searchUri );
		if ( !response.ok ) {
			throw Error( response.status );
		}
		const data = await response.json();
		const referenceUri = new URL( tip.reference.href );
		const utmSource = referenceUri.searchParams.get( 'utm_source' );
		const permapageUri = new URL( data.scryfall_uri );
		permapageUri.searchParams.set( 'utm_source', utmSource );
		let fastBranchIsInvalid = false;
		if ( Object.prototype.hasOwnProperty.call( data, 'card_faces' ) ) {
			const isSecondface = data.card_faces[ 0 ].name.replace( /[^a-z]/ig, '' ).toUpperCase() !==
				decodeURIComponent( tip.reference.dataset.cardName ).replace( /[^a-z]/ig, '' ).toUpperCase();
			if ( data.layout === 'transform' || data.layout === 'modal_dfc' || data.layout === 'double_faced_token' ) {
				if ( isSecondface ) {
					fastBranchIsInvalid = true;
					tip.reference.href = permapageUri.href + '&back';
				}
			} else if ( data.layout === 'split' ) {
				if ( data.set.match( /cmb\d/ ) ) {
					// Do nothing; Mystery Booster playtest split cards are vertical orientation
				} else if ( data.card_faces[ 1 ].oracle_text.startsWith( 'Aftermath' ) ) {
					if ( isSecondface ) {
						img.classList.add( 'ext-scryfall-rotate-90ccw' );
						// We add rotationClass to the reference attributes to cache it
						tip.reference.dataset.rotationClass = 'ext-scryfall-rotate-90ccw';
					}
				} else {
					img.classList.add( 'ext-scryfall-rotate-90cw' );
					tip.reference.dataset.rotationClass = 'ext-scryfall-rotate-90cw';
				}
			} else if ( data.layout === 'flip' ) {
				if ( isSecondface ) {
					img.classList.add( 'ext-scryfall-rotate-180' );
					tip.reference.dataset.rotationClass = 'ext-scryfall-rotate-180';
				}
			}
		}
		if ( data.layout === 'planar' || data.name === 'Burning Cinder Fury of Crimson Chaos Fire' ) {
			img.classList.add( 'ext-scryfall-rotate-90cw' );
			tip.reference.dataset.rotationClass = 'ext-scryfall-rotate-90cw';
		}
		// Change the card link from a redirect link to a direct (permapage) link
		tip.reference.href = permapageUri.href;
		// If fastBranch() is wrongly fetching the front face, abort it and fetch the back one
		if ( fastBranchIsInvalid ) {
			fastController.abort();
			const responsebackface = await fetch( data.card_faces[ 1 ].image_uris.normal, {} );
			if ( !responsebackface.ok ) {
				throw Error( responsebackface.status );
			}
			img.src = URL.createObjectURL( await responsebackface.blob() );
			tip.setContent( img );
			tip.reference.dataset.imgUri = img.src;
			// Show the tooltip by removing display:none
			tip.popper.style.removeProperty( 'display' );
		}
	}

	function initTippy() {
		/* global tippy */
		tippy( '.ext-scryfall-cardname', {
			arrow: false,
			followCursor: true,
			touch: 'hold',
			delay: [ 50, 0 ],
			animation: 'fade',
			duration: 0,
			ignoreAttributes: true,
			theme: 'scryfall',
			onShow( tip ) {
				if ( tip.loading || tip.props.content !== '' ) {
					return;
				}
				( async () => {
					try {
						if ( tip.reference.dataset.unrecognized ) {
							throw new Error( '404' );
						}
						if ( tip.reference.dataset.cached ) {
							showCachedTip( tip );
							return;
						}
						tip.loading = true;
						// Hide the tooltip until we've finished loaded the image
						tip.popper.style.display = 'none';
						tip.reference.style.cursor = 'progress';
						const img = document.createElement( 'img' );
						img.classList.add( 'ext-scryfall-cardimage' );
						img.alt = tip.reference.text;
						img.width = 244;
						const params = tip.reference.dataset;
						const searchUri = new URL( 'https://api.scryfall.com/cards/named' );
						if ( typeof params.cardSet === 'undefined' || typeof params.cardNumber === 'undefined' || params.cardNumber === '' ) {
							searchUri.searchParams.set( 'exact', params.cardName );
							if ( typeof params.cardSet !== 'undefined' ) {
								searchUri.searchParams.set( 'set', params.cardSet );
							}
						} else {
							searchUri.pathname = 'cards/' + params.cardSet.toLowerCase() + '/' + params.cardNumber.toLowerCase();
						}
						// Fast speculative loading at the same time as slow correct loading
						const fastController = new AbortController();
						const fastPromise = fastBranch( searchUri, tip, img, fastController );
						const correctPromise = correctBranch( searchUri, tip, img, fastController );
						await fastPromise;
						await correctPromise;
						tip.reference.dataset.cached = true;
					} catch ( e ) {
						if ( e.message === '404' ) {
							tip.setContent( mw.message( 'scryfalllinks-unrecognized-card' ).escaped() );
							// If we get a 404, we'll also short-circuit all future attempts
							tip.reference.dataset.unrecognized = true;
						} else {
							tip.setContent( mw.message( 'scryfalllinks-card-tooltip-error' ).escaped() );
						}
						tip.setProps( { theme: 'scryfall-error' } );
						// Show the tooltip by removing display:none
						tip.popper.style.removeProperty( 'display' );
					} finally {
						// End cursor:progress
						tip.reference.style.removeProperty( 'cursor' );
						tip.loading = false;
					}
				} )();
			},
			onHidden( tip ) {
				tip.setContent( '' );
			}
		} );
	}

	$( function () {
		mw.loader.using( 'mediawiki.api' ).then( () => {
			return new mw.Api().loadMessagesIfMissing( [
				'scryfalllinks-unrecognized-card',
				'scryfalllinks-card-tooltip-error'
			] );
		} ).then( initTippy );
	} );
}() );
