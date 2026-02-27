<?php
/**
 * Minimal stubs for MediaWiki classes used by Hooks.php.
 *
 * These allow PHPUnit tests to run without a MediaWiki installation.
 * Each stub only implements the methods that Hooks.php actually calls.
 */

namespace MediaWiki\Hook {

	/**
	 * Stub for the ParserFirstCallInitHook interface.
	 */
	interface ParserFirstCallInitHook {
		/**
		 * @param \Parser $parser
		 * @return void
		 */
		public function onParserFirstCallInit( $parser ): void;
	}
}

namespace MediaWiki {

	class MediaWikiServices {
		private static $instance;

		public static function getInstance() {
			if ( !self::$instance ) {
				self::$instance = new self();
			}
			return self::$instance;
		}

		public function getMainConfig() {
			return new StubConfig();
		}

		/**
		 * Reset the singleton (useful between tests).
		 */
		public static function resetInstance() {
			self::$instance = null;
		}
	}

	class StubConfig {
		public function get( $key ) {
			$values = [
				'Sitename' => 'Test Wiki',
			];
			return $values[$key] ?? null;
		}
	}
}

namespace {

	/**
	 * Stub Parser: records setHook calls, tracks addModules calls,
	 * and returns input unchanged from recursiveTagParse.
	 */
	class StubParser {
		public $hooks = [];
		public $modules = [];
		private $output;

		public function __construct() {
			$this->output = new StubParserOutput( $this );
		}

		public function setHook( $tag, $callback ) {
			$this->hooks[$tag] = $callback;
		}

		public function getOutput() {
			return $this->output;
		}

		public function recursiveTagParse( $input, $frame ) {
			return $input;
		}
	}

	/**
	 * Stub ParserOutput: records addModules calls.
	 */
	class StubParserOutput {
		private $parser;

		public function __construct( $parser ) {
			$this->parser = $parser;
		}

		public function addModules( $modules ) {
			$this->parser->modules = array_merge( $this->parser->modules, $modules );
		}
	}

	/**
	 * Stub PPFrame: never called directly by Hooks.php,
	 * just passed through to recursiveTagParse.
	 */
	class StubPPFrame {
	}
}
