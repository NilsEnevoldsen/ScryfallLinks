/**
 * Global mocks for MediaWiki environment.
 *
 * Sets up the mw.* globals, jQuery, and other browser APIs
 * that the extension's JS files expect.
 */

/* global global */

// MediaWiki message map
const messages = {
	'scryfalllinks-unrecognized-card': 'Unrecognized card',
	'scryfalllinks-card-tooltip-error': 'Preview error'
};

// MediaWiki globals
global.mw = {
	loader: {
		using: () => Promise.resolve()
	},
	Api: function () {
		return {
			loadMessagesIfMissing: () => Promise.resolve()
		};
	},
	message: function ( key ) {
		return {
			escaped: () => messages[ key ] || key
		};
	},
	hook: function () {
		return {
			add: jest.fn()
		};
	}
};
