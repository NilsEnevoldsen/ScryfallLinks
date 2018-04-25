( function () {
	var el = document.createElement( 'div' );
	el.style.cssTest = 'display: none;';
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
		placement: 'bottom',
		interactive: true,
		touchHold: true,
		delay: [ 50, 0 ],
		animation: 'fade',
		duration: 0,
		performance: true,
		theme: 'scryfall',
		onShow() {
			// `this` inside callbacks refers to the popper element
			const target = this._reference,
				title = target.text,
				cardNameQuery = '&exact=' + target.dataset.cardName,
				cardSet = target.dataset.cardSet,
				cardSetQuery = cardSet ? '&set=' + cardSet : '',
				formatQuery = '&format=image',
				versionQuery = '&version=normal',
				imageSrc = 'https://api.scryfall.com/cards/named?' + cardNameQuery + cardSetQuery + formatQuery + versionQuery,
				imageElement = '<img class="ext-scryfall-cardimage" width="244" alt="' + title + '" src="' + imageSrc + '">',
				anchorElement = '<a href="' + target.href + '">' + imageElement + '</a>';
			this.querySelector( '.tippy-content' ).innerHTML = anchorElement;
		},
		onHidden() {
			this.querySelector( '.tippy-content' ).innerHTML = '';
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
