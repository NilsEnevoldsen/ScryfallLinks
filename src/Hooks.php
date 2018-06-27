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
		$parser->setHook( 'd', 'MediaWiki\Extension\ScryfallLinks\Hooks::renderScryfallDeck' );
		$parser->setHook( 'deck', 'MediaWiki\Extension\ScryfallLinks\Hooks::renderScryfallDeck' );
		$parser->setHook( 'c', 'MediaWiki\Extension\ScryfallLinks\Hooks::renderScryfallLink' );
		$parser->setHook( 'card', 'MediaWiki\Extension\ScryfallLinks\Hooks::renderScryfallLink' );
		$parser->setHook( 'cs', 'MediaWiki\Extension\ScryfallLinks\Hooks::renderScryfallMultiLink' );
		$parser->setHook( 'cards', 'MediaWiki\Extension\ScryfallLinks\Hooks::renderScryfallMultiLink' );
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

		// Save the title
		$decktitle = $args['title'] ?? '';

		// Create "cards" array from raw input
		$cards = [];
		$thissection = '';
		$split_cardcount = function ( $string, $key, &$thissection ) use ( &$cards ) {
			// Split at the first whitespace following numerals
			$line = preg_split( '/^\s*(?:(\d+)\s+)?/', $string, -1,
				PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY );
			if ( count( $line ) == 1 ) {
				// This line is a section title
				$thissection = preg_replace( '/[^A-Za-z- ]/', '', $line[0] );
			} else {
				// This line is a card name with a quantity
				$cards[$key]['quantity'] = $line[0];
				$cards[$key]['name'] = $line[1];
				$cards[$key]['section'] = $thissection;
				// Hack to move SB cards to the end while preserving order (1/2)
				if ( in_array( strtolower( $cards[$key]['section'] ), [ 'sideboard', 'sb' ] ) ) {
					$cards[$key + 10000] = $cards[$key];
					unset( $cards[$key] );
				};
			}
		};
		$cardsraw = explode( PHP_EOL, $input );
		$cardsraw = array_filter( $cardsraw );
		array_walk( $cardsraw, $split_cardcount, $thissection );
		// Hack to move SB cards to the end while preserving order (2/2)
		ksort( $cards );

		$pageid = $parser->getTitle()->getArticleID();
		static $nums;
		if ( !isset( $nums[$pageid] ) ) {
			$nums[$pageid] = 0;
		}
		$decknum = $nums[$pageid]++;
		$deckexport_anchor = "
		<div class=\"ext-scryfall-deckdownloadcontainer\">
		<div class=\"ext-scryfall-downloadlinks\">
			Download:
			<a href=\"/Special:DownloadDeck?pageid={$pageid}&num={$decknum}&format=apprentice\" title=\"Download in Apprentice format.\">apprentice</a>,
			<a href=\"/Special:DownloadDeck?pageid={$pageid}&num={$decknum}&format=octgn\" title=\"Download in OCTGN2 format.\">octgn</a>,
			<a href=\"/Special:DownloadDeck?pageid={$pageid}&num={$decknum}&format=magiconline\" title=\"Download in Magic Online format.\">magiconline</a>
		</div>
		</div>
		";

		// Create HTML decklist
		$decklist_html = [];
		$prevsection = '';
		foreach ( $cards as $card ) {
			$sectionquantities[$card['section']][] = $card['quantity'];
		}
		$decklist_html[] = '<div class="ext-scryfall-decksection">';
		foreach ( $cards as $key => $card ) {
			if ( $card['section'] != $prevsection ) {
				if ( $prevsection != '' ) {
					// If decklist begins with a decksection, don't prefix an empty decksection
					$decklist_html[] = '</div>';
					$decklist_html[] = '<div class="ext-scryfall-decksection">';
				}
				$decklist_html[] = '<h4>' . $card['section'] . ' (' .
					array_sum( $sectionquantities[$card['section']] ) . ')</h4>';
				$prevsection = $card['section'];
			}
			$decklist_html[] = '<p><span class="ext-scryfall-deckcardcount">' . $card['quantity'] .
				'</span> ' . self::outputLink( $card['name'], '', $card['name'] ) . '</p>';
		}
		$decklist_html[] = '</div>';
		$decklist_html = implode( PHP_EOL, $decklist_html );

		// Return the HTML
		$output = '<div class="ext-scryfall-deck"><div class="ext-scryfall-decktitlecontainer">' .
			'<span class="ext-scryfall-decktitle">' . htmlspecialchars( $decktitle ) . '</span>' .
			'</div><div class="ext-scryfall-deckcontents">' . $decklist_html .
			'</div>' . $deckexport_anchor . '</div>';

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
	 * Render <cs>
	 * @param string $input Some input
	 * @param array $args Some args
	 * @param Parser $parser A parser
	 * @param PPFrame $frame A PPFrame
	 * @return string
	 */
	public static function renderScryfallMultiLink( $input, array $args, $parser, $frame ) {
		$parser->getOutput()->addModules( 'ext.scryfallLinks.tooltip' );
		$input = $parser->recursiveTagParse( $input, $frame );

		// Break input into array by lines
		$lines = explode( "\n", $input );

		if ( count( $lines ) ) {
			$return = "";
			foreach ( $lines as $line ) {
				if ( !empty( $line ) ) {
					$return .= self::outputLink( $line, '', $line ). "\n";
				}
				$return .= "\n";
			}
			// don't add extra  line breaks around tag
			$return = trim( $return );
			return $return;
		} else {
			// return input if failure
			return $input;
		}
	}

	/**
	 * Create link
	 * @param string $card Card name
	 * @param string $set Set abbreviation
	 * @param string $anchor Anchor text
	 * @return string
	 */
	protected static function outputLink( $card, $set, $anchor ) {
		$sitename = \MediaWiki\MediaWikiServices::getInstance()->getMainConfig()->get( 'Sitename' );
		$sitename = preg_replace( "/[^A-Za-z0-9]/", '', $sitename );
		$setquery = $set ? ' set:' . $set : '';
		$search = '!"' . $card . '"' . $setquery;
		$output = '<a href="https://scryfall.com/search?q=' . htmlspecialchars( urlencode( $search ) ) .
			'&utm_source=mw_' . $sitename . '" class="ext-scryfall-link" data-card-name="' .
			htmlspecialchars( $card ) . '" data-card-set="' .
			htmlspecialchars( $set ) . '">' . htmlspecialchars( $anchor ) . '</a>';

		return $output;
	}

}
