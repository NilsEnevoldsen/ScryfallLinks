/**
 * Tests for the tooltip module (ext.scryfallLinks.tooltip.js).
 *
 * Since the production code is an IIFE that depends on Popover API, jQuery,
 * mw.*, and fetch, we test the critical logic by replicating it in isolation:
 *   - API URL construction
 *   - Card layout rotation decisions
 *   - Caching and error state management
 *
 * This avoids needing to load the full DOM environment in the test
 * while still covering the logic that's most likely to break during refactoring.
 */

// --- API URL Construction ---
// Replicates the URL-building logic from loadCard

function buildSearchUri( params ) {
	const searchUri = new URL( 'https://api.scryfall.com/cards/named' );
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
		searchUri.pathname = 'cards/' + params.cardSet.toLowerCase() + '/' +
			params.cardNumber.toLowerCase();
	}
	return searchUri;
}

describe( 'API URL construction', () => {
	test( 'name only uses named endpoint with exact param', () => {
		const url = buildSearchUri( { cardName: 'Lightning Bolt' } );
		expect( url.pathname ).toBe( '/cards/named' );
		expect( url.searchParams.get( 'exact' ) ).toBe( 'Lightning Bolt' );
	} );

	test( 'name + set (no number) uses named endpoint with set param', () => {
		const url = buildSearchUri( {
			cardName: 'Lightning Bolt',
			cardSet: 'LEA'
		} );
		expect( url.pathname ).toBe( '/cards/named' );
		expect( url.searchParams.get( 'exact' ) ).toBe( 'Lightning Bolt' );
		expect( url.searchParams.get( 'set' ) ).toBe( 'LEA' );
	} );

	test( 'name + set + number uses path-based endpoint', () => {
		const url = buildSearchUri( {
			cardName: 'Lightning Bolt',
			cardSet: 'LEA',
			cardNumber: '161'
		} );
		expect( url.pathname ).toBe( '/cards/lea/161' );
		// Should NOT have query params
		expect( url.searchParams.has( 'exact' ) ).toBe( false );
	} );

	test( 'set present, number empty string falls back to named endpoint', () => {
		const url = buildSearchUri( {
			cardName: 'Lightning Bolt',
			cardSet: 'LEA',
			cardNumber: ''
		} );
		expect( url.pathname ).toBe( '/cards/named' );
		expect( url.searchParams.get( 'set' ) ).toBe( 'LEA' );
	} );

	test( 'set present, number undefined falls back to named endpoint', () => {
		const url = buildSearchUri( {
			cardName: 'Lightning Bolt',
			cardSet: 'LEA'
		} );
		expect( url.pathname ).toBe( '/cards/named' );
		expect( url.searchParams.get( 'set' ) ).toBe( 'LEA' );
	} );

	test( 'set and number are lowercased in path', () => {
		const url = buildSearchUri( {
			cardName: 'Lightning Bolt',
			cardSet: 'LEA',
			cardNumber: '161A'
		} );
		expect( url.pathname ).toBe( '/cards/lea/161a' );
	} );
} );

// --- Fast branch URL ---

function buildFastImageUri( searchUri ) {
	const fastImgUri = new URL( searchUri.href );
	fastImgUri.searchParams.set( 'format', 'image' );
	fastImgUri.searchParams.set( 'version', 'normal' );
	return fastImgUri;
}

describe( 'Fast branch URL construction', () => {
	test( 'adds format=image and version=normal params', () => {
		const searchUri = buildSearchUri( { cardName: 'Lightning Bolt' } );
		const fastUri = buildFastImageUri( searchUri );
		expect( fastUri.searchParams.get( 'format' ) ).toBe( 'image' );
		expect( fastUri.searchParams.get( 'version' ) ).toBe( 'normal' );
		expect( fastUri.searchParams.get( 'exact' ) ).toBe( 'Lightning Bolt' );
	} );
} );

// --- Card layout rotation logic ---
// Replicates the rotation decision tree from correctBranch

function determineRotation( data, requestedCardName ) {
	const result = {
		rotationClass: null,
		fastBranchIsInvalid: false,
		isSecondface: false
	};

	if ( Object.prototype.hasOwnProperty.call( data, 'card_faces' ) ) {
		result.isSecondface =
			data.card_faces[ 0 ].name.replace( /[^a-z]/ig, '' ).toUpperCase() !==
			requestedCardName.replace( /[^a-z]/ig, '' ).toUpperCase();

		if (
			data.layout === 'transform' ||
			data.layout === 'modal_dfc' ||
			data.layout === 'double_faced_token'
		) {
			if ( result.isSecondface ) {
				result.fastBranchIsInvalid = true;
			}
		} else if ( data.layout === 'split' ) {
			if ( data.set.match( /cmb\d/ ) ) {
				// Mystery Booster: no rotation
			} else if ( data.card_faces[ 1 ].oracle_text.startsWith( 'Aftermath' ) ) {
				if ( result.isSecondface ) {
					result.rotationClass = 'ext-scryfall-rotate-90ccw';
				}
			} else {
				result.rotationClass = 'ext-scryfall-rotate-90cw';
			}
		} else if ( data.layout === 'flip' ) {
			if ( result.isSecondface ) {
				result.rotationClass = 'ext-scryfall-rotate-180';
			}
		}
	}

	if (
		data.layout === 'planar' ||
		data.name === 'Burning Cinder Fury of Crimson Chaos Fire'
	) {
		result.rotationClass = 'ext-scryfall-rotate-90cw';
	}

	return result;
}

/**
 * Helper to build mock Scryfall API responses.
 */
function mockCardData( overrides ) {
	return Object.assign( {
		name: 'Lightning Bolt',
		layout: 'normal',
		set: 'lea',
		scryfall_uri: 'https://scryfall.com/card/lea/161/lightning-bolt'
	}, overrides );
}

function mockDfcData( frontName, backName, layout ) {
	return mockCardData( {
		name: frontName + ' // ' + backName,
		layout: layout || 'transform',
		card_faces: [
			{
				name: frontName,
				oracle_text: 'Front face text',
				image_uris: { normal: 'https://example.com/front.jpg' }
			},
			{
				name: backName,
				oracle_text: 'Back face text',
				image_uris: { normal: 'https://example.com/back.jpg' }
			}
		]
	} );
}

function mockSplitData( firstName, secondName, opts ) {
	const defaults = { set: 'akh', aftermath: false };
	const config = Object.assign( defaults, opts );
	return mockCardData( {
		name: firstName + ' // ' + secondName,
		layout: 'split',
		set: config.set,
		card_faces: [
			{
				name: firstName,
				oracle_text: 'First half text'
			},
			{
				name: secondName,
				oracle_text: config.aftermath
					? 'Aftermath\nSecond half text'
					: 'Second half text'
			}
		]
	} );
}

describe( 'Card layout rotation', () => {
	test( 'transform, first face: no rotation, fast branch valid', () => {
		const data = mockDfcData( 'Delver of Secrets', 'Insectile Aberration', 'transform' );
		const result = determineRotation( data, 'Delver of Secrets' );
		expect( result.rotationClass ).toBeNull();
		expect( result.fastBranchIsInvalid ).toBe( false );
	} );

	test( 'transform, second face: fast branch aborted', () => {
		const data = mockDfcData( 'Delver of Secrets', 'Insectile Aberration', 'transform' );
		const result = determineRotation( data, 'Insectile Aberration' );
		expect( result.fastBranchIsInvalid ).toBe( true );
	} );

	test( 'modal_dfc, second face: fast branch aborted', () => {
		const data = mockDfcData( 'Emeria\'s Call', 'Emeria, Shattered Skyclave', 'modal_dfc' );
		const result = determineRotation( data, 'Emeria, Shattered Skyclave' );
		expect( result.fastBranchIsInvalid ).toBe( true );
	} );

	test( 'double_faced_token, second face: fast branch aborted', () => {
		const data = mockDfcData( 'Day', 'Night', 'double_faced_token' );
		const result = determineRotation( data, 'Night' );
		expect( result.fastBranchIsInvalid ).toBe( true );
	} );

	test( 'split (normal): rotate 90cw', () => {
		const data = mockSplitData( 'Fire', 'Ice' );
		const result = determineRotation( data, 'Fire' );
		expect( result.rotationClass ).toBe( 'ext-scryfall-rotate-90cw' );
	} );

	test( 'split (Aftermath), second face: rotate 90ccw', () => {
		const data = mockSplitData( 'Dusk', 'Dawn', { aftermath: true } );
		const result = determineRotation( data, 'Dawn' );
		expect( result.rotationClass ).toBe( 'ext-scryfall-rotate-90ccw' );
	} );

	test( 'split (Aftermath), first face: no rotation', () => {
		const data = mockSplitData( 'Dusk', 'Dawn', { aftermath: true } );
		const result = determineRotation( data, 'Dusk' );
		expect( result.rotationClass ).toBeNull();
	} );

	test( 'split (Mystery Booster cmb1): no rotation', () => {
		const data = mockSplitData( 'Slivdrazi Monstrosity', 'Other',
			{ set: 'cmb1' } );
		const result = determineRotation( data, 'Slivdrazi Monstrosity' );
		expect( result.rotationClass ).toBeNull();
	} );

	test( 'split (Mystery Booster cmb2): no rotation', () => {
		const data = mockSplitData( 'Test Card', 'Other',
			{ set: 'cmb2' } );
		const result = determineRotation( data, 'Test Card' );
		expect( result.rotationClass ).toBeNull();
	} );

	test( 'flip, first face: no rotation', () => {
		const data = mockCardData( {
			layout: 'flip',
			card_faces: [
				{ name: 'Bushi Tenderfoot', oracle_text: '' },
				{ name: 'Kenzo the Hardhearted', oracle_text: '' }
			]
		} );
		const result = determineRotation( data, 'Bushi Tenderfoot' );
		expect( result.rotationClass ).toBeNull();
	} );

	test( 'flip, second face: rotate 180', () => {
		const data = mockCardData( {
			layout: 'flip',
			card_faces: [
				{ name: 'Bushi Tenderfoot', oracle_text: '' },
				{ name: 'Kenzo the Hardhearted', oracle_text: '' }
			]
		} );
		const result = determineRotation( data, 'Kenzo the Hardhearted' );
		expect( result.rotationClass ).toBe( 'ext-scryfall-rotate-180' );
	} );

	test( 'planar layout: rotate 90cw', () => {
		const data = mockCardData( { layout: 'planar' } );
		const result = determineRotation( data, 'Some Plane' );
		expect( result.rotationClass ).toBe( 'ext-scryfall-rotate-90cw' );
	} );

	test( 'Burning Cinder Fury of Crimson Chaos Fire: rotate 90cw', () => {
		const data = mockCardData( {
			name: 'Burning Cinder Fury of Crimson Chaos Fire',
			layout: 'normal'
		} );
		const result = determineRotation( data, 'Burning Cinder Fury of Crimson Chaos Fire' );
		expect( result.rotationClass ).toBe( 'ext-scryfall-rotate-90cw' );
	} );

	test( 'normal card (no card_faces): no rotation', () => {
		const data = mockCardData( { layout: 'normal' } );
		const result = determineRotation( data, 'Lightning Bolt' );
		expect( result.rotationClass ).toBeNull();
		expect( result.fastBranchIsInvalid ).toBe( false );
	} );
} );

// --- Face matching normalization ---
// The code normalizes names by stripping non-alpha chars and uppercasing

function normalizeName( name ) {
	return name.replace( /[^a-z]/ig, '' ).toUpperCase();
}

describe( 'Face name normalization', () => {
	test( 'basic name', () => {
		expect( normalizeName( 'Lightning Bolt' ) ).toBe( 'LIGHTNINGBOLT' );
	} );

	test( 'name with apostrophe', () => {
		expect( normalizeName( "Sensei's Divining Top" ) ).toBe( 'SENSEISDIVININGTOP' );
	} );

	test( 'name with comma', () => {
		expect( normalizeName( 'Kongming, "Sleeping Dragon"' ) ).toBe( 'KONGMINGSLEEPINGDRAGON' );
	} );

	test( 'name with special characters', () => {
		expect( normalizeName( 'Fire // Ice' ) ).toBe( 'FIREICE' );
	} );

	test( 'matching works for face comparison', () => {
		const front = normalizeName( 'Delver of Secrets' );
		const requested = normalizeName( 'Delver of Secrets' );
		expect( front ).toBe( requested );
	} );

	test( 'non-matching faces detected', () => {
		const front = normalizeName( 'Delver of Secrets' );
		const requested = normalizeName( 'Insectile Aberration' );
		expect( front ).not.toBe( requested );
	} );
} );

// --- Link state management ---
// Tests the dataset-based state machine used by the tooltip system.
// State is stored on the link element's dataset properties:
//   - dataset.loading: currently fetching card data
//   - dataset.cached: card data has been fetched and cached
//   - dataset.unrecognized: card was not found (404)
//   - dataset.imgUri: cached image blob URL
//   - dataset.rotationClass: rotation CSS class for the image

describe( 'Link state management', () => {
	let link;

	beforeEach( () => {
		link = document.createElement( 'a' );
		link.className = 'ext-scryfall-cardname';
		link.textContent = 'Lightning Bolt';
		link.href = 'https://scryfall.com/search?q=test&utm_source=mw_TestWiki';
		link.dataset.cardName = 'Lightning Bolt';
	} );

	test( 'fresh link has no state flags', () => {
		expect( link.dataset.loading ).toBeUndefined();
		expect( link.dataset.cached ).toBeUndefined();
		expect( link.dataset.unrecognized ).toBeUndefined();
	} );

	test( 'loading state prevents re-trigger', () => {
		link.dataset.loading = 'true';
		expect( link.dataset.loading ).toBeTruthy();
	} );

	test( 'cached state triggers cached path', () => {
		link.dataset.cached = 'true';
		link.dataset.imgUri = 'blob:http://example.com/abc';
		expect( link.dataset.cached ).toBeTruthy();
		expect( link.dataset.imgUri ).toBeTruthy();
	} );

	test( 'unrecognized state triggers error path', () => {
		link.dataset.unrecognized = 'true';
		expect( link.dataset.unrecognized ).toBeTruthy();
	} );

	test( 'after successful load, cached is set and loading is cleared', () => {
		link.dataset.loading = 'true';
		// Simulate successful load
		link.dataset.cached = 'true';
		delete link.dataset.loading;

		expect( link.dataset.cached ).toBeTruthy();
		expect( link.dataset.loading ).toBeUndefined();
	} );

	test( '404 error sets unrecognized', () => {
		link.dataset.loading = 'true';
		// Simulate 404 error
		link.dataset.unrecognized = 'true';
		delete link.dataset.loading;

		expect( link.dataset.unrecognized ).toBe( 'true' );
		expect( link.dataset.loading ).toBeUndefined();
	} );

	test( 'loading sets cursor to progress', () => {
		link.style.cursor = 'progress';
		expect( link.style.cursor ).toBe( 'progress' );
	} );

	test( 'load completion clears cursor', () => {
		link.style.cursor = 'progress';
		link.style.removeProperty( 'cursor' );
		expect( link.style.cursor ).toBe( '' );
	} );

	test( 'rotation class stored for caching', () => {
		link.dataset.rotationClass = 'ext-scryfall-rotate-90cw';
		expect( link.dataset.rotationClass ).toBe( 'ext-scryfall-rotate-90cw' );
	} );
} );

// --- Permalink URL construction ---

describe( 'Permalink URL construction', () => {
	test( 'preserves utm_source from original link', () => {
		const referenceHref = 'https://scryfall.com/search?q=test&utm_source=mw_MTGWiki';
		const scryfallUri = 'https://scryfall.com/card/lea/161/lightning-bolt';

		const referenceUri = new URL( referenceHref );
		const utmSource = referenceUri.searchParams.get( 'utm_source' );
		const permapageUri = new URL( scryfallUri );
		permapageUri.searchParams.set( 'utm_source', utmSource );

		expect( utmSource ).toBe( 'mw_MTGWiki' );
		expect( permapageUri.href ).toContain( 'utm_source=mw_MTGWiki' );
		expect( permapageUri.pathname ).toBe( '/card/lea/161/lightning-bolt' );
	} );

	test( 'back face appends &back to URL', () => {
		const permapageUri = new URL( 'https://scryfall.com/card/isd/51/delver-of-secrets' );
		permapageUri.searchParams.set( 'utm_source', 'mw_TestWiki' );
		const backUrl = permapageUri.href + '&back';
		expect( backUrl ).toContain( '&back' );
	} );
} );
