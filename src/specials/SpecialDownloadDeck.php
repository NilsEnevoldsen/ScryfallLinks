<?php

namespace MediaWiki\Extension\ScryfallLinks;

class SpecialDownloadDeck extends \UnlistedSpecialPage {

	public function __construct() {
		parent::__construct( 'DownloadDeck' );
	}

	/**
	 * Deprecation notice. It can be removed in a future version of the extension.
	 *
	 * @param string $subpage is a required parameter that we ignore.
	 */
	function execute( $subpage ) {
		$output = $this->getOutput();
		$this->setHeaders();
		$output->addWikiText(
			'This method of downloading decks is deprecated. You probably got here by
			following a link from a page which hasn\'t yet been processed with the
			updated extension.

			Return to the previous page, resave it (or purge the page cache by appending
			<code>?action=purge</code> to the page URL), and download the deck again.'
		);
	}
}
