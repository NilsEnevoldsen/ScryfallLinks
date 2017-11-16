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
		// $parser->getOutput()->addModules( 'ext.scryfallLinks.tooltip' );
		$input = $parser->recursiveTagParse( $input, $frame );

		if ( !$input ) {
			return '';
		}

		$decktitle = $args['title'] ?? '';
		$decktitlespan = '<h3 class="mw-scryfall-decktitle">' . htmlspecialchars( $decktitle ) . '</h3>';

		$decklist = explode( PHP_EOL, $input );
		$decklist = array_filter( $decklist );
		$decklist = preg_replace( '/^[^\d].+$/', '<h4 class="mw-scryfall-decksection">$0</h4>',
			$decklist );
		$decklist = preg_replace_callback( '/^(\d+)\s+(.+)$/',
			function ( $m ) {
				return '<p>' . $m[1] . ' <a href="https://scryfall.com/search?q=%21%22' .
				htmlspecialchars( urlencode( $m[2] ) ) . '%22" class="mw-scryfall-link" data-card-name="' .
				htmlspecialchars( urlencode( $m[2] ) ) . '">' . $m[2] . '</a></p>';
			},
			$decklist );
		$decklist = implode( PHP_EOL, $decklist );

		$output = '<div class="mw-scryfall-deck">' . $decktitlespan . $decklist .'</div>';

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
		$setquery = $set ? ' e:' . $set : '';

		$link = $args['title'] ?? $input;

		$search = '!"' . $input . '"' . $setquery;

		$output = '<a href="https://scryfall.com/search?q=' . htmlspecialchars( urlencode( $search ) ) .
			'" class="mw-scryfall-link" data-card-name="' . htmlspecialchars( urlencode( $input ) ) .
			'" data-card-set="' . htmlspecialchars( urlencode( $set ) ) . '">' . htmlspecialchars( $link ) .
			'</a>';

		return $output;
	}

}
