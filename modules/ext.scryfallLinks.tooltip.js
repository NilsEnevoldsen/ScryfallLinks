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
		// followCursor: true,
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
			var thisPopper = this,
				cardImage = new Image( 244 );
			/* eslint no-underscore-dangle: ["error", { "allowAfterThis": true }] */
			const target = thisPopper._reference,
				anchorElement = '<a href="' + target.href + '"><img class="ext-scryfall-placeholder"></a>',
				cardNameQuery = '&exact=' + target.dataset.cardName,
				cardSet = target.dataset.cardSet,
				cardSetQuery = cardSet ? '&set=' + cardSet : '',
				formatQuery = '&format=image',
				versionQuery = '&version=normal',
				imageSrc = 'https://api.scryfall.com/cards/named?' + cardNameQuery + cardSetQuery + formatQuery + versionQuery;
			thisPopper.style.display = 'none';
			thisPopper.querySelector( '.tippy-content' ).innerHTML = anchorElement;
			cardImage.alt = target.text;
			cardImage.className = 'ext-scryfall-cardimage';
			cardImage.onload = function () {
				var placeholder = thisPopper.querySelector( '.ext-scryfall-placeholder' );
				placeholder.replaceWith( cardImage );
				thisPopper.style.display = '';
			};
			cardImage.src = imageSrc;
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
