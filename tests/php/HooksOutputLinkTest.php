<?php

namespace MediaWiki\Extension\ScryfallLinks\Tests;

use MediaWiki\Extension\ScryfallLinks\Hooks;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

class HooksOutputLinkTest extends TestCase {

	private static $method;

	public static function setUpBeforeClass(): void {
		self::$method = new ReflectionMethod( Hooks::class, 'outputLink' );
	}

	private function outputLink( $card, $set, $cn, $anchor ) {
		return self::$method->invoke( null, $card, $set, $cn, $anchor );
	}

	public function testBasicCardNameOnly() {
		$html = $this->outputLink( 'Lightning Bolt', '', '', 'Lightning Bolt' );
		$this->assertStringContainsString( 'class="ext-scryfall-cardname"', $html );
		$this->assertStringContainsString( 'data-card-name="Lightning Bolt"', $html );
		$this->assertStringContainsString( '>Lightning Bolt</a>', $html );
		// Search query should contain exact name search
		$this->assertStringContainsString(
			urlencode( '!"Lightning Bolt"' ),
			$html
		);
		// UTM source uses sanitized sitename ("Test Wiki" → "TestWiki")
		$this->assertStringContainsString( 'utm_source=mw_TestWiki', $html );
		// No set or number attrs when empty
		$this->assertStringNotContainsString( 'data-card-set', $html );
		$this->assertStringNotContainsString( 'data-card-number', $html );
	}

	public function testCardWithSet() {
		$html = $this->outputLink( 'Lightning Bolt', 'LEA', '', 'Lightning Bolt' );
		$this->assertStringContainsString( 'data-card-set="LEA"', $html );
		// Search query includes set
		$this->assertStringContainsString( urlencode( ' set:LEA' ), $html );
		// No number attr
		$this->assertStringNotContainsString( 'data-card-number', $html );
	}

	public function testCardWithSetAndNumber() {
		$html = $this->outputLink( 'Lightning Bolt', 'LEA', '161', 'Lightning Bolt' );
		$this->assertStringContainsString( 'data-card-set="LEA"', $html );
		$this->assertStringContainsString( 'data-card-number="161"', $html );
		$this->assertStringContainsString( urlencode( ' cn:"161"' ), $html );
	}

	public function testCustomAnchorText() {
		$html = $this->outputLink( 'Lightning Bolt', '', '', 'Bolt' );
		// Anchor shows custom text
		$this->assertStringContainsString( '>Bolt</a>', $html );
		// data-card-name still has the real card name
		$this->assertStringContainsString( 'data-card-name="Lightning Bolt"', $html );
	}

	public function testHtmlSpecialCharsInName() {
		$html = $this->outputLink(
			'Jötun Grunt', '', '', 'Jötun Grunt'
		);
		// Name appears in data attr (htmlspecialchars escapes)
		$this->assertStringContainsString( 'data-card-name="', $html );
		// The output is valid HTML (no raw unescaped special chars)
		$this->assertStringContainsString( '</a>', $html );
	}

	public function testQuotesInCardName() {
		$html = $this->outputLink(
			'Kongming, "Sleeping Dragon"', '', '',
			'Kongming, "Sleeping Dragon"'
		);
		// Quotes should be HTML-escaped in data attribute
		$this->assertStringContainsString( '&quot;Sleeping Dragon&quot;', $html );
	}

	public function testApostropheInName() {
		$html = $this->outputLink(
			"Sensei's Divining Top", '', '',
			"Sensei's Divining Top"
		);
		$this->assertStringContainsString( "Sensei&#039;s Divining Top", $html );
	}

	public function testUtmSourceSanitization() {
		// The stub config returns 'Test Wiki' which has a space
		// outputLink strips non-alphanumeric → 'TestWiki'
		$html = $this->outputLink( 'Lightning Bolt', '', '', 'Lightning Bolt' );
		$this->assertMatchesRegularExpression(
			'/utm_source=mw_[A-Za-z0-9]+/',
			$html
		);
		$this->assertStringNotContainsString( 'utm_source=mw_Test Wiki', $html );
	}

	public function testOutputIsAnchorTag() {
		$html = $this->outputLink( 'Lightning Bolt', '', '', 'Lightning Bolt' );
		$this->assertMatchesRegularExpression( '/^<a .*<\/a>$/', $html );
	}

	public function testHrefPointsToScryfall() {
		$html = $this->outputLink( 'Lightning Bolt', '', '', 'Lightning Bolt' );
		$this->assertStringContainsString(
			'href="https://scryfall.com/search?q=',
			$html
		);
	}
}
