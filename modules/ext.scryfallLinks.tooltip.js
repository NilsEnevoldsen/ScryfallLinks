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
				formatParam = '&format=image',
				versionParam = '&version=normal',
				imageSrc = 'https://api.scryfall.com/cards/named?' + cardNameParam + cardSetParam + formatParam + versionParam;
			if ( tip.loading || content.innerHTML !== '' ) { return; }
			tip.loading = true;
			// Hide the tooltip until we've finished loaded the image
			thisPopper.style.display = 'none';
			// fetch() only works on modern browsers
			fetch( imageSrc )
				.then( response => {
					if ( !response.ok ) {
						throw Error( response.statusText );
					}
					return response;
				} )
				.then( response => response.blob() )
				.then( blob => {
					const url = URL.createObjectURL( blob ),
						img = document.createElement( 'img' );
					img.classList.add( 'ext-scryfall-cardimage' );
					img.src = url;
					img.alt = target.text;
					img.width = 244;
					content.append( img );
					thisPopper.style.removeProperty( 'display' );
					tip.loading = false;
				} )
				.catch( function () {
					// TODO: This should be localized
					content.innerHTML = 'Not found';
					content.parentNode.classList.remove( 'scryfall-theme' );
					content.parentNode.classList.add( 'ext-scryfall-notfound' );
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
