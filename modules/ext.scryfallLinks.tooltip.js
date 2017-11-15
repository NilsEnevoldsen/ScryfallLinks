$('body').append('<div id="template" style="display: none;"></div>');

const template = document.getElementById('template');
const initialText = template.textContent;

const tip = tippy('.mw-scryfall-link', {
  arrow: false,
  animateFill: false,
  html: '#template',
  position: 'bottom',
  interactive: 'true',
  delay: [500,0],
  animation: 'scale',
  duration: 200,
  performance: true,
	onShow() {
		// `this` inside callbacks refers to the popper element
		const content = this.querySelector('.tippy-tooltip-content');

		if (tip.loading || content.innerHTML !== initialText) return;
		
		tip.loading = true;
		el = tip.getReferenceData(this).el;
				
		var title = el.text;
		var cardname = el.getAttribute( "cardname" );
		if ( el.getAttribute( "cardset" ) ) {
			var cardset = '&set=' + el.getAttribute( "cardset" );
		} else {
			var cardset = "";
		}

		fetch('https://api.scryfall.com/cards/named?exact='+cardname+cardset+'&format=image&version=normal').then(resp => resp.blob()).then(blob => {
			const url = URL.createObjectURL(blob);
			content.innerHTML = '<img class="cardimage" width="244" alt="'+title+'" src="'+url+'">';
			tip.loading = false;
		}).catch(e => {
			content.innerHTML = 'Loading failed';
			tip.loading = false;
		})
	},
	onHidden() {
		const content = this.querySelector('.tippy-tooltip-content');
		content.innerHTML = initialText;
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