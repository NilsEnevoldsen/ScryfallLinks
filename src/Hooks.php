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
		$parser->getOutput()->addModules(
			[ 'ext.scryfallLinks.tooltip', 'ext.scryfallLinks.deckExport' ]
		);
		$input = $parser->recursiveTagParse( $input, $frame );

		if ( !$input ) {
			return '';
		}

		$decktitle = $args['title'] ?? 'Untitled Deck';

		$cards = self::parseDeckCards( $input );

		$html = self::buildDeckHtml( $decktitle, $cards );

		return $html;
	}

	/**
	 * Parse the <deck> tag input into an array of cards
	 * @param string $input The tag input
	 * @return array Parsed cards
	 */
	private static function parseDeckCards( $input ) {
		$cardsraw = explode( PHP_EOL, $input );
		$cardsraw = array_filter( $cardsraw );
		$cards = [];
		$sideboard = [];
		$current = &$cards;
		$thisSection = '';
		$isSideboard = false;
		foreach ( $cardsraw as $rawline ) {
			$line = preg_split( '/^\s*(?:(\d+)\s+)?/', $rawline, -1,
				PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY );
			if ( count( $line ) == 1 ) {
				// This line is a section title
				$thisSection = trim( preg_replace( '/[^A-Za-z- ]/', '', $line[0] ) );
				$isSideboard = in_array( strtolower( $thisSection ), [ 'sideboard', 'sb' ] );
				if ( $isSideboard ) {
					$current = &$sideboard;
				} else {
					$current = &$cards;
				}
			} else {
				// This line is a card name with a quantity
				$current[] = [
					'quantity' => $line[0],
					'name' => $line[1],
					'section' => $thisSection,
					'sb' => $isSideboard
				];
			}
		}
		return array_merge( $cards, $sideboard );
	}

	/**
	 * Build the HTML for a <deck> tag
	 * @param string $decktitle The title for the deck
	 * @param array &$cards The card list (see self::parseDeckCards)
	 * @return string
	 */
	private static function buildDeckHtml( $decktitle, &$cards ) {
		$decklist_html = [];
		$prevsection = '';
		$first_card_written = false;
		foreach ( $cards as $card ) {
			$sectionquantities[$card['section']][] = $card['quantity'];
		}
		$decklist_html[] = '<div class="ext-scryfall-decksection">';
		foreach ( $cards as $key => $card ) {
			if ( $card['section'] != $prevsection ) {
				if ( $first_card_written ) {
					// Only start a new section if the first section is nonempty
					$decklist_html[] = '</div>';
					if ( $card['sb'] ) {
						$decklist_html[] = '<div class="ext-scryfall-decksection ext-scryfall-decksideboard">';
					} else {
						$decklist_html[] = '<div class="ext-scryfall-decksection">';
					}
				}
				$decklist_html[] = '<h4><span class="ext-scryfall-decksectiontitle">' . $card['section']
					. '</span> (' . array_sum( $sectionquantities[$card['section']] ) . ')</h4>';
				$prevsection = $card['section'];
			}
			$decklist_html[] = '<p class="ext-scryfall-deckentry">' .
				'<span class="ext-scryfall-deckcardcount">' . $card['quantity'] . '</span> ' .
				self::outputLink( $card['name'], '', '', $card['name'] ) . '</p>';
			$first_card_written = true;
		}
		$decklist_html[] = '</div>';
		$decklist_html = implode( PHP_EOL, $decklist_html );

		// Create deck download tools
		$deckexport_anchor = '<div class="ext-scryfall-deckexport">' .
				'<button type="button" class="ext-scryfall-deckexport-dropbtn">Download/Export</button>' .
				'<ul class="ext-scryfall-deckexport-dropmenu">' .
					'<li><button title="Download in text format." type="button" ' .
						'class="ext-scryfall-deckexport-text">Text</button></li>' .
					'<li><button title="Download in Magic: The Gathering Online format." type="button" ' .
						'class="ext-scryfall-deckexport-mtgo">MTGO</button></li>' .
					'<li><button title="Download in Apprentice format." type="button" ' .
						'class="ext-scryfall-deckexport-apprentice">Apprentice</button></li>' .
					'<li><button title="Download in OCTGN format." type="button" ' .
						'class="ext-scryfall-deckexport-octgn">OCTGN</button></li>' .
					'<li><button title="Export to decklist.org." type="button" ' .
						'class="ext-scryfall-deckexport-decklist">decklist.org</button></li>' .
				'</ul>' .
			'</div>';

		// Return the HTML
		$output = '<div class="ext-scryfall-deck"><div class="ext-scryfall-decktitlecontainer">' .
			'<span class="ext-scryfall-decktitle">' . htmlspecialchars( $decktitle ) . '</span>' .
			$deckexport_anchor . '</div><div class="ext-scryfall-deckcontents">' . $decklist_html .
			'</div></div>';

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
		$cn = $args['number'] ?? '';

		$anchor = $args['title'] ?? $input;

		return self::outputLink( $input, $set, $cn, $anchor );
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
					$return .= self::outputLink( $line, '', '', $line ) . "\n";
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
	 * @param string $cn Collector number
	 * @param string $anchor Anchor text
	 * @return string
	 */
	protected static function outputLink( $card, $set, $cn, $anchor ) {
		$sitename = \MediaWiki\MediaWikiServices::getInstance()->getMainConfig()->get( 'Sitename' );
		$sitename = preg_replace( "/[^A-Za-z0-9]/", '', $sitename );
		$setquery = $set ? ' set:' . $set : '';
		$cnquery = $cn ? ' cn:' . $cn : '';
		$search = '!"' . $card . '"' . $setquery . $cnquery;
		$output = '<a href="https://scryfall.com/search?q=' . htmlspecialchars( urlencode( $search ) ) .
			'&utm_source=mw_' . $sitename . '" class="ext-scryfall-cardname"';

		$output .= ' data-card-name="' . htmlspecialchars( $card ) . '"';

		// Only add this attributes if set
		if ( $set ) {
			$output .= ' data-card-set="' . htmlspecialchars( $set ) . '"';
		}
		if ( $cn ) {
			$output .= ' data-card-number="' . htmlspecialchars( $cn ) . '"';
		}

		$output .= '>' . htmlspecialchars( $anchor ) . '</a>';

		return $output;
	}

}
