( function () {
	var el = document.createElement( 'div' );
	el.style.cssTest = 'display: none;';
	el.id = 'js--card-popup';
	document.body.append( el );
}() );

/* global tippy */
const tip = tippy( '.mw-scryfall-link', {
	arrow: false,
	animateFill: false,
	html: '#js--card-popup',
	position: 'bottom',
	interactive: 'true',
	delay: [ 500, 0 ],
	animation: 'scale',
	duration: 200,
	performance: true,
	theme: 'scryfall',
	onShow() {
		// `this` inside callbacks refers to the popper element
		const target = tip.getReferenceData( this ).el,
			title = target.text,
			cardNameQuery = '&exact=' + target.dataset.cardName,
			cardSet = target.dataset.cardSet,
			cardSetQuery = cardSet ? '' : '&set=' + cardSet,
			formatQuery = '&format=image',
			versionQuery = '&version=normal',
			imageSrc = 'https://api.scryfall.com/cards/named?' + cardNameQuery + cardSetQuery + formatQuery + versionQuery,
			imageElement = '<img class="cardimage" width="244" alt="' + title + '" src="' + imageSrc + '">';

		this.querySelector( '.tippy-tooltip-content' ).innerHTML = imageElement;
	},
	onHidden() {
		this.querySelector( '.tippy-tooltip-content' ).innerHTML = '';
	},
	// prevent tooltip from displaying over button
	popperOptions: {
		flipDuration: 0,
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
