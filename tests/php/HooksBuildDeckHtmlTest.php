<?php

namespace MediaWiki\Extension\ScryfallLinks\Tests;

use MediaWiki\Extension\ScryfallLinks\Hooks;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

class HooksBuildDeckHtmlTest extends TestCase {

	private static $method;

	public static function setUpBeforeClass(): void {
		self::$method = new ReflectionMethod( Hooks::class, 'buildDeckHtml' );
	}

	private function buildDeckHtml( $title, $cards ) {
		return self::$method->invokeArgs( null, [ $title, &$cards ] );
	}

	private function makeCards( $specs ) {
		$cards = [];
		foreach ( $specs as $spec ) {
			$cards[] = [
				'quantity' => $spec[0],
				'name' => $spec[1],
				'section' => $spec[2] ?? '',
				'sb' => $spec[3] ?? false,
			];
		}
		return $cards;
	}

	public function testSingleSectionTwoCards() {
		$cards = $this->makeCards( [
			[ '4', 'Lightning Bolt', 'Instants' ],
			[ '4', 'Chain Lightning', 'Instants' ],
		] );
		$html = $this->buildDeckHtml( 'Test Deck', $cards );

		// One section
		$this->assertSame( 1, substr_count( $html, 'ext-scryfall-decksection' )
			- substr_count( $html, 'ext-scryfall-decksectiontitle' ) );
		// Two card entries
		$this->assertSame( 2, substr_count( $html, 'ext-scryfall-deckentry' ) );
		// Section quantity total: 4+4=8
		$this->assertStringContainsString( '(8)', $html );
	}

	public function testTwoSections() {
		$cards = $this->makeCards( [
			[ '4', 'Goblin Guide', 'Creatures' ],
			[ '4', 'Lightning Bolt', 'Instants' ],
		] );
		$html = $this->buildDeckHtml( 'Test Deck', $cards );

		$this->assertStringContainsString( 'Creatures', $html );
		$this->assertStringContainsString( 'Instants', $html );
		// Each section gets its own count
		$this->assertSame( 2, substr_count( $html, '(4)' ) );
	}

	public function testSideboardSection() {
		$cards = $this->makeCards( [
			[ '4', 'Lightning Bolt', 'Main' ],
			[ '2', 'Pyroblast', 'Sideboard', true ],
		] );
		$html = $this->buildDeckHtml( 'Test Deck', $cards );

		$this->assertStringContainsString( 'ext-scryfall-decksideboard', $html );
	}

	public function testDeckTitleEscaped() {
		$cards = $this->makeCards( [
			[ '4', 'Lightning Bolt', 'Main' ],
		] );
		$html = $this->buildDeckHtml( '<script>alert("xss")</script>', $cards );

		$this->assertStringNotContainsString( '<script>', $html );
		$this->assertStringContainsString( '&lt;script&gt;', $html );
	}

	public function testSectionQuantityTotals() {
		$cards = $this->makeCards( [
			[ '4', 'Goblin Guide', 'Creatures' ],
			[ '4', 'Monastery Swiftspear', 'Creatures' ],
			[ '2', 'Eidolon of the Great Revel', 'Creatures' ],
		] );
		$html = $this->buildDeckHtml( 'Test Deck', $cards );

		// 4+4+2=10
		$this->assertStringContainsString( '(10)', $html );
	}

	public function testExportButtonsPresent() {
		$cards = $this->makeCards( [
			[ '4', 'Lightning Bolt', 'Main' ],
		] );
		$html = $this->buildDeckHtml( 'Test Deck', $cards );

		$this->assertStringContainsString( 'ext-scryfall-deckexport-text', $html );
		$this->assertStringContainsString( 'ext-scryfall-deckexport-mtgo', $html );
		$this->assertStringContainsString( 'ext-scryfall-deckexport-apprentice', $html );
		$this->assertStringContainsString( 'ext-scryfall-deckexport-octgn', $html );
		$this->assertStringContainsString( 'ext-scryfall-deckexport-decklist', $html );
	}

	public function testCardLinksHaveCorrectDataAttributes() {
		$cards = $this->makeCards( [
			[ '4', 'Lightning Bolt', 'Main' ],
		] );
		$html = $this->buildDeckHtml( 'Test Deck', $cards );

		$this->assertStringContainsString( 'data-card-name="Lightning Bolt"', $html );
		$this->assertStringContainsString( 'ext-scryfall-cardname', $html );
	}

	public function testDeckStructureHasRequiredContainers() {
		$cards = $this->makeCards( [
			[ '4', 'Lightning Bolt', 'Main' ],
		] );
		$html = $this->buildDeckHtml( 'Test Deck', $cards );

		$this->assertStringContainsString( 'ext-scryfall-deck', $html );
		$this->assertStringContainsString( 'ext-scryfall-decktitlecontainer', $html );
		$this->assertStringContainsString( 'ext-scryfall-decktitle', $html );
		$this->assertStringContainsString( 'ext-scryfall-deckcontents', $html );
		$this->assertStringContainsString( 'ext-scryfall-deckcardcount', $html );
	}
}
