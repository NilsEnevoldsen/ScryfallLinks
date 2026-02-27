<?php

namespace MediaWiki\Extension\ScryfallLinks\Tests;

use MediaWiki\Extension\ScryfallLinks\Hooks;
use PHPUnit\Framework\TestCase;
use StubParser;
use StubPPFrame;

class HooksRenderTest extends TestCase {

	private $parser;
	private $frame;
	private $hooks;

	protected function setUp(): void {
		$this->parser = new StubParser();
		$this->frame = new StubPPFrame();
		$this->hooks = new Hooks();
	}

	// --- renderScryfallLink ---

	public function testRenderScryfallLinkBasic() {
		$html = $this->hooks->renderScryfallLink(
			'Lightning Bolt', [], $this->parser, $this->frame
		);
		$this->assertStringContainsString( 'ext-scryfall-cardname', $html );
		$this->assertStringContainsString( 'data-card-name="Lightning Bolt"', $html );
		$this->assertStringContainsString( '>Lightning Bolt</a>', $html );
	}

	public function testRenderScryfallLinkWithSetAndNumber() {
		$html = $this->hooks->renderScryfallLink(
			'Lightning Bolt',
			[ 'set' => 'LEA', 'number' => '161' ],
			$this->parser, $this->frame
		);
		$this->assertStringContainsString( 'data-card-set="LEA"', $html );
		$this->assertStringContainsString( 'data-card-number="161"', $html );
	}

	public function testRenderScryfallLinkWithTitleAttr() {
		$html = $this->hooks->renderScryfallLink(
			'Lightning Bolt',
			[ 'title' => 'Bolt' ],
			$this->parser, $this->frame
		);
		$this->assertStringContainsString( '>Bolt</a>', $html );
		$this->assertStringContainsString( 'data-card-name="Lightning Bolt"', $html );
	}

	public function testRenderScryfallLinkEmptyInput() {
		$html = $this->hooks->renderScryfallLink(
			'', [], $this->parser, $this->frame
		);
		$this->assertSame( '', $html );
	}

	public function testRenderScryfallLinkLoadsTooltipModule() {
		$this->hooks->renderScryfallLink(
			'Lightning Bolt', [], $this->parser, $this->frame
		);
		$this->assertContains(
			'ext.scryfallLinks.tooltip',
			$this->parser->modules
		);
	}

	// --- renderScryfallMultiLink ---

	public function testRenderScryfallMultiLinkMultiLine() {
		$html = $this->hooks->renderScryfallMultiLink(
			"Lightning Bolt\nChain Lightning",
			[], $this->parser, $this->frame
		);
		$this->assertSame( 2, substr_count( $html, 'ext-scryfall-cardname' ) );
		$this->assertStringContainsString( 'data-card-name="Lightning Bolt"', $html );
		$this->assertStringContainsString( 'data-card-name="Chain Lightning"', $html );
	}

	public function testRenderScryfallMultiLinkSkipsBlankLines() {
		$html = $this->hooks->renderScryfallMultiLink(
			"Lightning Bolt\n\nChain Lightning",
			[], $this->parser, $this->frame
		);
		// Only 2 links, not 3
		$this->assertSame( 2, substr_count( $html, 'ext-scryfall-cardname' ) );
	}

	public function testRenderScryfallMultiLinkLoadsTooltipModule() {
		$this->hooks->renderScryfallMultiLink(
			"Lightning Bolt", [], $this->parser, $this->frame
		);
		$this->assertContains(
			'ext.scryfallLinks.tooltip',
			$this->parser->modules
		);
	}

	// --- renderScryfallDeck ---

	public function testRenderScryfallDeckBasic() {
		$html = $this->hooks->renderScryfallDeck(
			"Instants\n4 Lightning Bolt",
			[ 'title' => 'Burn Deck' ],
			$this->parser, $this->frame
		);
		$this->assertStringContainsString( 'ext-scryfall-deck', $html );
		$this->assertStringContainsString( 'Burn Deck', $html );
		$this->assertStringContainsString( 'data-card-name="Lightning Bolt"', $html );
	}

	public function testRenderScryfallDeckEmptyInput() {
		$html = $this->hooks->renderScryfallDeck(
			'', [ 'title' => 'Empty' ], $this->parser, $this->frame
		);
		$this->assertSame( '', $html );
	}

	public function testRenderScryfallDeckDefaultTitle() {
		$html = $this->hooks->renderScryfallDeck(
			"4 Lightning Bolt", [], $this->parser, $this->frame
		);
		$this->assertStringContainsString( 'Untitled Deck', $html );
	}

	public function testRenderScryfallDeckLoadsBothModules() {
		$this->hooks->renderScryfallDeck(
			"4 Lightning Bolt", [], $this->parser, $this->frame
		);
		$this->assertContains(
			'ext.scryfallLinks.tooltip',
			$this->parser->modules
		);
		$this->assertContains(
			'ext.scryfallLinks.deckExport',
			$this->parser->modules
		);
	}

	// --- onParserFirstCallInit ---

	public function testOnParserFirstCallInitRegistersAllTags() {
		$parser = new StubParser();
		$this->hooks->onParserFirstCallInit( $parser );

		$expectedTags = [ 'd', 'deck', 'c', 'card', 'cs', 'cards' ];
		foreach ( $expectedTags as $tag ) {
			$this->assertArrayHasKey( $tag, $parser->hooks,
				"Tag <$tag> should be registered" );
		}
	}
}
