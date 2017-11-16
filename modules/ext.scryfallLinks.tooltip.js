var el = document.createElement('div');
el.style.cssTest = 'display: none;';
el.id = 'js--card-popup';
document.body.append(el);

const tip = tippy('.mw-scryfall-link', {
	arrow: false,
	animateFill: false,
	html: '#js--card-popup',
	position: 'bottom',
	interactive: 'true',
	delay: [500,0],
	animation: 'scale',
	duration: 200,
	performance: true,
	onShow() {
		// `this` inside callbacks refers to the popper element
		const target = tip.getReferenceData(this).el;
		const title = target.text;
		const cardname = target.getAttribute('cardname');

		var cardset = '';
		if (target.getAttribute('cardset')) {
			cardset = '&set=' + target.getAttribute('cardset');
		}

		const imageSrc = 'https://api.scryfall.com/cards/named?exact=' + cardname + cardset + '&format=image&version=normal';

		this.querySelector('.tippy-tooltip-content').innerHTML = '<img class="cardimage" width="244" alt="' + title + '" src="' + imageSrc + '">';
	},
	onHidden() {
		this.querySelector('.tippy-tooltip-content').innerHTML = '';
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
});