( function () {
	let tooltip, backdrop, activeLink, showTimeout, lastMouseX, lastMouseY;
	let isTouchMode = false;
	const SHOW_DELAY = 50;
	const CURSOR_OFFSET = 28;
	const VIEWPORT_MARGIN = 12;
	const CARD_IMAGE_WIDTH = 244;

	function createTooltip() {
		tooltip = document.createElement( 'div' );
		tooltip.id = 'ext-scryfall-tooltip';
		tooltip.className = 'ext-scryfall-tooltip';
		tooltip.setAttribute( 'popover', 'manual' );
		tooltip.addEventListener( 'click', handleTooltipClick );
		document.body.appendChild( tooltip );

		backdrop = document.createElement( 'div' );
		backdrop.className = 'ext-scryfall-backdrop';
		backdrop.hidden = true;
		backdrop.addEventListener( 'click', hideTooltip );
		document.body.appendChild( backdrop );
	}

	function createCardImage( link ) {
		const img = document.createElement( 'img' );
		img.classList.add( 'ext-scryfall-cardimage' );
		img.alt = link.textContent;
		if ( !isTouchMode ) {
			img.width = CARD_IMAGE_WIDTH;
		}
		img.onload = positionTooltip;
		return img;
	}

	function positionTooltip() {
		if ( isTouchMode ) {
			// Center on screen; CSS translate handles the offset
			tooltip.style.left = '50%';
			tooltip.style.top = '50%';
			return;
		}

		const rect = tooltip.getBoundingClientRect();
		const visualWidth = rect.width;
		const visualHeight = rect.height;
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		// Horizontal: centered on cursor, clamped to viewport
		let left = lastMouseX - ( visualWidth / 2 );
		left = Math.max( VIEWPORT_MARGIN,
			Math.min( left, viewportWidth - visualWidth - VIEWPORT_MARGIN )
		);

		// Vertical: below cursor, or above if no room
		let top = lastMouseY + CURSOR_OFFSET;
		if ( top + visualHeight > viewportHeight ) {
			top = lastMouseY - visualHeight - VIEWPORT_MARGIN;
		}

		// CSS transform rotates around the center, so the visual box is
		// offset from the layout box. Adjust left/top to compensate.
		if ( activeLink && activeLink.dataset.rotationClass ) {
			left -= ( tooltip.offsetWidth - visualWidth ) / 2;
			top -= ( tooltip.offsetHeight - visualHeight ) / 2;
		}

		tooltip.style.left = left + 'px';
		tooltip.style.top = top + 'px';
	}

	function showTooltip( link ) {
		activeLink = link;
		tooltip.className = 'ext-scryfall-tooltip';
		if ( link.dataset.rotationClass ) {
			// The following classes are used here:
			// * ext-scryfall-rotate-90ccw
			// * ext-scryfall-rotate-90cw
			// * ext-scryfall-rotate-180
			tooltip.classList.add( link.dataset.rotationClass );
		}
		if ( isTouchMode ) {
			tooltip.classList.add( 'ext-scryfall-touch' );
			backdrop.hidden = false;
		} else {
			document.addEventListener( 'mousemove', handleMouseMove, true );
		}
		tooltip.showPopover();
		positionTooltip();
	}

	function hideTooltip() {
		clearTimeout( showTimeout );
		document.removeEventListener( 'mousemove', handleMouseMove, true );
		try {
			tooltip.hidePopover();
		} catch ( e ) {
			// Already hidden
		}
		backdrop.hidden = true;
		activeLink = null;
		tooltip.className = 'ext-scryfall-tooltip';
		tooltip.textContent = '';
	}

	function setTooltipContent( content ) {
		tooltip.textContent = '';
		if ( typeof content === 'string' ) {
			tooltip.textContent = content;
		} else {
			tooltip.appendChild( content );
		}
	}

	function showTooltipError( link, message ) {
		setTooltipContent( message );
		showTooltip( link );
		tooltip.classList.add( 'ext-scryfall-tooltip-error' );
	}

	// Shows a cached card image
	function showCachedImage( link ) {
		const img = createCardImage( link );
		img.src = link.dataset.imgUri;
		setTooltipContent( img );
		showTooltip( link );
	}

	// Fetches the correct card image as long as it's not a back face
	function fastBranch( searchUri, link, img, fastController ) {
		const fastImgUri = new URL( searchUri.href );
		fastImgUri.searchParams.set( 'format', 'image' );
		fastImgUri.searchParams.set( 'version', 'normal' );
		return fetch( fastImgUri, { signal: fastController.signal } )
			.then( ( response ) => {
				if ( !response.ok ) {
					throw new Error( response.status );
				}
				return response.blob();
			} )
			.then( ( blob ) => {
				// If correctBranch() aborted us while blob() was in
				// progress, don't overwrite the back-face image (#38)
				if ( fastController.signal.aborted ) {
					return;
				}
				img.src = URL.createObjectURL( blob );
				link.dataset.imgUri = img.src;
				setTooltipContent( img );
				showTooltip( link );
			} )
			.catch( () => {
			} );
	}

	// Rotates the image if necessary and fetches the correct card image
	// if it's a back face
	function correctBranch( searchUri, link, img, fastController ) {
		return fetch( searchUri )
			.then( ( response ) => {
				if ( !response.ok ) {
					throw new Error( response.status );
				}
				return response.json();
			} )
			.then( ( data ) => {
				const referenceUri = new URL( link.href );
				const utmSource = referenceUri.searchParams.get( 'utm_source' );
				const permapageUri = new URL( data.scryfall_uri );
				permapageUri.searchParams.set( 'utm_source', utmSource );
				let fastBranchIsInvalid = false;
				if ( Object.prototype.hasOwnProperty.call(
					data, 'card_faces'
				) ) {
					const isSecondface =
						data.card_faces[ 0 ].name
							.replace( /[^a-z]/ig, '' ).toUpperCase() !==
						decodeURIComponent( link.dataset.cardName )
							.replace( /[^a-z]/ig, '' ).toUpperCase();
					if (
						data.layout === 'transform' ||
						data.layout === 'modal_dfc' ||
						data.layout === 'double_faced_token'
					) {
						if ( isSecondface ) {
							fastBranchIsInvalid = true;
							link.href = permapageUri.href + '&back';
						} else if (
							data.card_faces[ 0 ].type_line
								.startsWith( 'Battle' )
						) {
							link.dataset.rotationClass =
								'ext-scryfall-rotate-90cw';
						}
					} else if ( data.layout === 'split' ) {
						if ( data.set.match( /cmb\d/ ) ) {
							// Mystery Booster playtest split cards
							// are vertical orientation
						} else if (
							data.card_faces[ 1 ].oracle_text
								.startsWith( 'Aftermath' )
						) {
							if ( isSecondface ) {
								link.dataset.rotationClass =
									'ext-scryfall-rotate-90ccw';
							}
						} else {
							link.dataset.rotationClass =
								'ext-scryfall-rotate-90cw';
						}
					} else if ( data.layout === 'flip' ) {
						if ( isSecondface ) {
							link.dataset.rotationClass =
								'ext-scryfall-rotate-180';
						}
					}
				}
				if (
					data.layout === 'planar' ||
					data.name ===
						'Burning Cinder Fury of Crimson Chaos Fire'
				) {
					link.dataset.rotationClass =
						'ext-scryfall-rotate-90cw';
				}
				// Change from redirect link to permapage link
				link.href = permapageUri.href;
				// Re-show the tooltip to apply rotation even if
				// fastBranch() already displayed the image
				if ( !fastBranchIsInvalid && link.dataset.rotationClass ) {
					showTooltip( link );
				}
				// If fastBranch() is wrongly fetching the front face,
				// abort it and fetch the back one
				if ( fastBranchIsInvalid ) {
					fastController.abort();
					return fetch(
						data.card_faces[ 1 ].image_uris.normal
					)
						.then( ( responsebackface ) => {
							if ( !responsebackface.ok ) {
								throw new Error(
									responsebackface.status
								);
							}
							return responsebackface.blob();
						} )
						.then( ( blob ) => {
							img.src = URL.createObjectURL( blob );
							link.dataset.imgUri = img.src;
							setTooltipContent( img );
							showTooltip( link );
						} );
				}
			} );
	}

	function loadCard( link ) {
		link.dataset.loading = 'true';
		link.style.cursor = 'progress';
		const img = createCardImage( link );
		const params = link.dataset;
		const searchUri = new URL(
			'https://api.scryfall.com/cards/named'
		);
		if (
			typeof params.cardSet === 'undefined' ||
			typeof params.cardNumber === 'undefined' ||
			params.cardNumber === ''
		) {
			searchUri.searchParams.set( 'exact', params.cardName );
			if ( typeof params.cardSet !== 'undefined' ) {
				searchUri.searchParams.set( 'set', params.cardSet );
			}
		} else {
			searchUri.pathname = 'cards/' +
				params.cardSet.toLowerCase() + '/' +
				params.cardNumber +
				( params.cardLang ? '/' + params.cardLang : '' );
		}
		// Fast speculative loading alongside slow correct loading
		const fastController = new AbortController();
		const fastPromise = fastBranch(
			searchUri, link, img, fastController
		);
		const correctPromise = correctBranch(
			searchUri, link, img, fastController
		);
		Promise.all( [ fastPromise, correctPromise ] )
			.then( () => {
				link.dataset.cached = 'true';
			} )
			.catch( ( e ) => {
				if ( e.message === '404' ) {
					showTooltipError( link,
						mw.message(
							'scryfalllinks-unrecognized-card'
						).escaped()
					);
					link.dataset.unrecognized = 'true';
				} else {
					showTooltipError( link,
						mw.message(
							'scryfalllinks-card-tooltip-error'
						).escaped()
					);
				}
			} )
			.then( () => {
				link.style.removeProperty( 'cursor' );
				delete link.dataset.loading;
			} );
	}

	function handleMouseMove( e ) {
		lastMouseX = e.clientX;
		lastMouseY = e.clientY;
		positionTooltip();
	}

	function handleMouseEnter( e ) {
		if ( isTouchMode ) {
			return;
		}
		const link = e.target.closest( '.ext-scryfall-cardname' );
		if ( !link ) {
			return;
		}
		lastMouseX = e.clientX;
		lastMouseY = e.clientY;
		clearTimeout( showTimeout );
		showTimeout = setTimeout( () => {
			if ( link.dataset.loading ) {
				return;
			}
			if ( link.dataset.unrecognized ) {
				showTooltipError( link,
					mw.message(
						'scryfalllinks-unrecognized-card'
					).escaped()
				);
				return;
			}
			if ( link.dataset.cached ) {
				showCachedImage( link );
				return;
			}
			loadCard( link );
		}, SHOW_DELAY );
	}

	function handleMouseLeave( e ) {
		if ( isTouchMode ) {
			return;
		}
		const link = e.target.closest( '.ext-scryfall-cardname' );
		if ( !link ) {
			return;
		}
		hideTooltip();
	}

	function handleTooltipClick() {
		if ( isTouchMode && activeLink && !activeLink.dataset.unrecognized ) {
			window.location.href = activeLink.href;
		}
	}

	function handleCardClick( e ) {
		if ( !isTouchMode ) {
			return;
		}
		const link = e.target.closest( '.ext-scryfall-cardname' );
		if ( !link ) {
			return;
		}
		e.preventDefault();
		if ( link.dataset.loading ) {
			return;
		}
		if ( link.dataset.unrecognized ) {
			showTooltipError( link,
				mw.message(
					'scryfalllinks-unrecognized-card'
				).escaped()
			);
			return;
		}
		if ( link.dataset.cached ) {
			showCachedImage( link );
			return;
		}
		loadCard( link );
	}

	function init() {
		createTooltip();
		document.addEventListener( 'mouseenter', handleMouseEnter, true );
		document.addEventListener( 'mouseleave', handleMouseLeave, true );
		document.addEventListener( 'click', handleCardClick, true );
		document.addEventListener( 'pointerdown', ( e ) => {
			isTouchMode = e.pointerType === 'touch';
		} );
		window.addEventListener( 'pagehide', hideTooltip );
	}

	$( () => {
		mw.loader.using( 'mediawiki.api' ).then(
			() => new mw.Api().loadMessagesIfMissing( [
				'scryfalllinks-unrecognized-card',
				'scryfalllinks-card-tooltip-error'
			] )
		).then( init );
	} );
}() );
