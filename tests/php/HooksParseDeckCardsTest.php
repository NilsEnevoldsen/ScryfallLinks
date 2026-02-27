<?php

namespace MediaWiki\Extension\ScryfallLinks\Tests;

use MediaWiki\Extension\ScryfallLinks\Hooks;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

class HooksParseDeckCardsTest extends TestCase {

	private static $method;

	public static function setUpBeforeClass(): void {
		self::$method = new ReflectionMethod( Hooks::class, 'parseDeckCards' );
	}

	private function parseDeckCards( $input ) {
		return self::$method->invoke( null, $input );
	}

	public function testSimpleCardLine() {
		$result = $this->parseDeckCards( "4 Lightning Bolt" );
		$this->assertCount( 1, $result );
		$this->assertSame( '4', $result[0]['quantity'] );
		$this->assertSame( 'Lightning Bolt', $result[0]['name'] );
		$this->assertSame( '', $result[0]['section'] );
		$this->assertFalse( $result[0]['sb'] );
	}

	public function testSectionHeaderWithCards() {
		$result = $this->parseDeckCards( "Creatures\n4 Goblin Guide" );
		$this->assertCount( 1, $result );
		$this->assertSame( '4', $result[0]['quantity'] );
		$this->assertSame( 'Goblin Guide', $result[0]['name'] );
		$this->assertSame( 'Creatures', $result[0]['section'] );
		$this->assertFalse( $result[0]['sb'] );
	}

	public function testMultipleSections() {
		$result = $this->parseDeckCards(
			"Creatures\n4 Goblin Guide\nInstants\n4 Lightning Bolt"
		);
		$this->assertCount( 2, $result );
		$this->assertSame( 'Creatures', $result[0]['section'] );
		$this->assertSame( 'Goblin Guide', $result[0]['name'] );
		$this->assertSame( 'Instants', $result[1]['section'] );
		$this->assertSame( 'Lightning Bolt', $result[1]['name'] );
	}

	public function testSideboardDetectionFull() {
		$result = $this->parseDeckCards( "Sideboard\n2 Pyroblast" );
		$this->assertCount( 1, $result );
		$this->assertSame( 'Sideboard', $result[0]['section'] );
		$this->assertTrue( $result[0]['sb'] );
	}

	public function testSideboardDetectionShort() {
		$result = $this->parseDeckCards( "SB\n2 Pyroblast" );
		$this->assertCount( 1, $result );
		$this->assertTrue( $result[0]['sb'] );
	}

	public function testSideboardDetectionCaseInsensitive() {
		$result = $this->parseDeckCards( "sideboard\n2 Pyroblast" );
		$this->assertTrue( $result[0]['sb'] );

		$result = $this->parseDeckCards( "SIDEBOARD\n2 Pyroblast" );
		// Note: section title is sanitized to alpha+hyphen+space only,
		// then strtolower is applied for matching
		$this->assertTrue( $result[0]['sb'] );
	}

	public function testMixedMainAndSideboardOrdering() {
		$result = $this->parseDeckCards(
			"Main\n4 Lightning Bolt\nSideboard\n2 Pyroblast"
		);
		$this->assertCount( 2, $result );
		// Mainboard cards come first
		$this->assertSame( 'Lightning Bolt', $result[0]['name'] );
		$this->assertFalse( $result[0]['sb'] );
		// Sideboard cards appended at end
		$this->assertSame( 'Pyroblast', $result[1]['name'] );
		$this->assertTrue( $result[1]['sb'] );
	}

	public function testLeadingWhitespace() {
		$result = $this->parseDeckCards( "  4 Lightning Bolt" );
		$this->assertCount( 1, $result );
		$this->assertSame( '4', $result[0]['quantity'] );
		$this->assertSame( 'Lightning Bolt', $result[0]['name'] );
	}

	public function testEmptyLinesFiltered() {
		$result = $this->parseDeckCards( "4 Lightning Bolt\n\n4 Goblin Guide" );
		$this->assertCount( 2, $result );
		$this->assertSame( 'Lightning Bolt', $result[0]['name'] );
		$this->assertSame( 'Goblin Guide', $result[1]['name'] );
	}

	public function testSectionTitleCleansNonAlpha() {
		$result = $this->parseDeckCards( "Creatures (16)\n4 Goblin Guide" );
		$this->assertCount( 1, $result );
		// Digits and parens are stripped, but spaces remain
		$this->assertStringContainsString( 'Creatures', $result[0]['section'] );
		$this->assertStringNotContainsString( '(', $result[0]['section'] );
		$this->assertStringNotContainsString( '16', $result[0]['section'] );
	}

	public function testQuantityOne() {
		$result = $this->parseDeckCards( "1 Karakas" );
		$this->assertCount( 1, $result );
		$this->assertSame( '1', $result[0]['quantity'] );
		$this->assertSame( 'Karakas', $result[0]['name'] );
	}

	public function testLargeQuantity() {
		$result = $this->parseDeckCards( "40 Relentless Rats" );
		$this->assertCount( 1, $result );
		$this->assertSame( '40', $result[0]['quantity'] );
	}

	public function testEmptyInput() {
		$result = $this->parseDeckCards( "" );
		$this->assertCount( 0, $result );
	}

	public function testSectionAfterSideboardReturnsToMainboard() {
		$result = $this->parseDeckCards(
			"Sideboard\n2 Pyroblast\nMain\n4 Lightning Bolt"
		);
		// Mainboard cards come first in output (array_merge: cards then sideboard)
		$this->assertSame( 'Lightning Bolt', $result[0]['name'] );
		$this->assertFalse( $result[0]['sb'] );
		$this->assertSame( 'Pyroblast', $result[1]['name'] );
		$this->assertTrue( $result[1]['sb'] );
	}

	public function testMultipleCardsInSection() {
		$result = $this->parseDeckCards(
			"Creatures\n4 Goblin Guide\n4 Monastery Swiftspear\n4 Eidolon of the Great Revel"
		);
		$this->assertCount( 3, $result );
		foreach ( $result as $card ) {
			$this->assertSame( 'Creatures', $card['section'] );
			$this->assertSame( '4', $card['quantity'] );
		}
	}
}
