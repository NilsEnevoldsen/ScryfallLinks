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
		$pattern_decksection = '/^[^\d].+/';
		$pattern_card = '/^(\d+)\s+(.+)/';

		// Build decklist line-by-line
		$decklist = explode( PHP_EOL, $input );
		$decklist = array_values( array_filter( $decklist ) );
		$decklist_html = [];
		$decklist_html[] = '<div class="mw-scryfall-decksection">';
		foreach ( $decklist as $key => $value ) {
			if ( preg_match( $pattern_decksection, $value ) ) {
				// Write a decksection element
				if ( $key != 0 ) {
					// If decklist begins with a decksection, don't prefix an empty decksection
					$decklist_html[] = '</div>';
					$decklist_html[] = '<div class="mw-scryfall-decksection">';
				}
				$decklist_html[] = '<h4>' . $value . '</h4>';
			} else {
				// Write a card element
				$decklist_html[] = preg_replace_callback( $pattern_card,
					function ( $m ) {
						return '<p> ' . $m[1] . ' ' . self::outputLink( $m[2], '', $m[2] ) . '</p>';
					}, $value );
			}
		}
		$decklist_html[] = '</div>';
		$decklist_html = implode( PHP_EOL, $decklist_html );
		$output = '<div class="mw-scryfall-deck">' . $decktitlespan .
			'<div class="mw-scryfall-deckcontents">' . $decklist_html . '</div>' .
			'</div>';

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
