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
		$parser->setHook( 'c', 'MediaWiki\Extension\ScryfallLinks\Hooks::renderScryfallLink' );
		$parser->setHook( 'card', 'MediaWiki\Extension\ScryfallLinks\Hooks::renderScryfallLink' );
		return true;
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
		$parser->getOutput()->addModules( 'ext.scryfallLinks.foo' );
		$input = $parser->recursiveTagParse( $input, $frame );

		$urlset = '';
		$setquery = '';
		if ( isset( $args['set'] ) ) {
			$urlset = urlencode( $args['set'] );
			$setquery = '+e:'.$urlset;
		};

		$linktitle = '';
		if ( isset( $args['title'] ) ) {
			$linktitle = $args['title'];
		} else {
			$linktitle = $input;
		};

		$cardquery = urlencode( $input );

		$output = '';
		if ( $input ) {
			$output = '<a href="https://scryfall.com/search?q=!%22'.$cardquery.'%22'.$setquery.'" class="mw-scryfall-link" cardname="'.$cardquery.'" cardset="'.$urlset.'">'.$linktitle.'</a>';
		};

		return $output;
	}

}
