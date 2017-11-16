<?php

namespace MediaWiki\Extension\ScryfallLinks;

/**
 * Hooks for ScryfallLinks extension
 *
 * @file
 * @ingroup Extensions
 */

class Hooks {

	/**
	 * Register the render callback with the parser
	 * @param Parser &$parser A parser
	 * @return bool
	 */
	public static function onParserFirstCallInit( &$parser ) {
		$parser->setHook( 'deck', 'MediaWiki\Extension\ScryfallLinks\Hooks::renderScryfallDeck' );
		$parser->setHook( 'c', 'MediaWiki\Extension\ScryfallLinks\Hooks::renderScryfallLink' );
		$parser->setHook( 'card', 'MediaWiki\Extension\ScryfallLinks\Hooks::renderScryfallLink' );
		return true;
	}

	/**
	 * Render <deck>
	 * @param string $input Some input
	 * @param array $args Some args
	 * @param Parser $parser A parser
	 * @param PPFrame $frame A PPFrame
	 * @return string
	 */
	public static function renderScryfallDeck( $input, array $args, $parser, $frame ) {
		$parser->getOutput()->addModules( 'ext.scryfallLinks.tooltip' );
		$input = $parser->recursiveTagParse( $input, $frame );

		if ( !$input ) {
			return '';
		}

		$decktitle = $args['title'] ?? '';
		$decktitlespan = '<div class="mw-scryfall-decktitle"><h3>' . htmlspecialchars( $decktitle ) .
			'</h3></div>';

		$decklist = explode( PHP_EOL, $input );
		$decklist = array_filter( $decklist );
		$decklist = preg_replace( '/^[^\d].+$/', '</div><div class="mw-scryfall-decksection"><h4>$0</h4>',
			$decklist );
		$decklist = preg_replace_callback( '/^(\d+)\s+(.+)$/',
			function ( $m ) {
				return '<p>' . $m[1] . ' ' . self::outputLink( $m[2], '', $m[2] ) . '</p>';
			},
			$decklist );
		$decklist = implode( PHP_EOL, $decklist );

		$output = '<div class="mw-scryfall-deck">' . $decktitlespan .
			'<div class="mw-scryfall-deckcontents"><div class="mw-scryfall-decksection">' .
			$decklist . '</div></div></div>';

		return $output;
	}

	/**
	 * Render <c>
	 * @param string $input Some input
	 * @param array $args Some args
	 * @param Parser $parser A parser
	 * @param PPFrame $frame A PPFrame
	 * @return string
	 */
	public static function renderScryfallLink( $input, array $args, $parser, $frame ) {
		$parser->getOutput()->addModules( 'ext.scryfallLinks.tooltip' );
		$input = $parser->recursiveTagParse( $input, $frame );

		if ( !$input ) {
			return '';
		}

		$set = $args['set'] ?? '';

		$anchor = $args['title'] ?? $input;

		return self::outputLink( $input, $set, $anchor );
	}
	/**
	 * Create link
	 * @param string $card Card name
	 * @param string $set Set abbreviation
	 * @param string $anchor Anchor text
	 * @return string
	 */
	protected static function outputLink( $card, $set, $anchor ) {
		$setquery = $set ? ' e:' . $set : '';
		$search = '!"' . $card . '"' . $setquery;
		$output = '<a href="https://scryfall.com/search?q=' . htmlspecialchars( urlencode( $search ) ) .
			'" class="mw-scryfall-link" data-card-name="' . htmlspecialchars( urlencode( $card ) ) .
			'" data-card-set="' . htmlspecialchars( urlencode( $set ) ) . '">' .
			htmlspecialchars( $anchor ) . '</a>';

		return $output;
	}

}
