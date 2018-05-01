<?php
namespace MediaWiki\Extension\ScryfallLinks;

/**
 * Special Page for Deck Downloads
 *
 * @file
 * @ingroup Extensions
 */

class SpecialDownloadDeck extends \UnlistedSpecialPage {

	/**
	 * The Constructor
	 */
	public function __construct() {
		parent::__construct( 'DownloadDeck' );
	}

	/**
	 * Valid Download Types we Handle
	 *
	 * @var array
	 */
	public static $valid_formats = ['magiconline', 'magicworkstation', 'apprentice', 'octgn', 'text'];

	/**
	 * Show the special page
	 */
	public function execute($subpage) {
		$pageid = $this->getRequest()->getInt('pageid');
		$num = $this->getRequest()->getInt('deck'); // will default to 0, or the first, if not passed.
		$format = $this->getRequest()->getText('format');

		if (!$pageid) {
			$this->getOutput()->addWikiMsg('no-deck-found');
			return;
		}

		$page = \WikiPage::newFromId(intval($pageid));
		if (!$page) {
			$this->getOutput()->addWikiMsg('no-deck-found');
			return;
		}
		$text = $page->getContent()->getNativeData();

		$match = "/(\<)(deck|d)( title(=)(&quot;|\"|\'|)([^\]]+)(&quot;|\"|\'|))?\>(.+)(\<\/(deck|d)\>)/siU";
		preg_match_all($match, $text, $decks, PREG_SET_ORDER);

		if (!count($decks) || !array_key_exists($num, $decks)) {
			$this->getOutput()->addWikiMsg('no-deck-found');
			return;
		}

		if (!in_array($format, self::$valid_formats)) {
			$this->getOutput()->addWikiMsg('invalid-format');
			return;
		}

		$name = $decks[$num][6];
		$deck = $decks[$num][8];
		if ($name == "") {
			$name = "Unknown";
		}
		$filename = str_replace(["\n", "\r\n", "\r", '.', ':', '/', '\\', '<', '>', '"', '|', '?', '*', "\0", ';'], "", $name);
		$deck = preg_replace("/[\040\011]*(\r\n|\r|\n)[\040\011]*/", "\n", $deck);
		$deck = trim($deck);



		// Disable normal output so we can take over.
		$this->getOutput()->disable();

		// ############################ Apprentice ##############################
		if ($format == "apprentice") {
			header("Content-type: application/dec");
			header("Content-Disposition: attachment; filename=\"$filename.dec\"");
			echo self::handleDeckApprentice($deck, $name);
		}

		// ########################## Magic Online ##############################
		if ($format == "magiconline") {
			header("Content-type: application/txt");
			header("Content-Disposition: attachment; filename=\"$filename.txt\"");
			echo self::handleDeckMagicOnline($deck);
		}

		// ############################## OCTGN #################################
		if ($format == "octgn") {
			header("Content-type: text/plain");
			header("Content-Disposition: attachment; filename=\"$filename.o8d\"");
			echo self::handleDeckOCTGN2($deck, $name, $post['username']);
		}

		// ############################### Text #################################
		if ($format == "text") {
			// This format just displays
			echo "<pre>".self::handleDeckText($deck, $name)."</pre>";
		}
	}

	/**
	 * Returns the contents of a deck in the Apprentice file format
	 *
	 * @param string $deck
	 * @param string $name
	 * @param boolean $setinfo
	 * @return void
	 */
	static public function handleDeckApprentice($deck, $name, $setinfo = false) {
		$formatted_deck = "// Name: $name\n";
		$sections = preg_split("/\n{2,}/", $deck);
		foreach ($sections as $section) {
			// If this section is the sideboard, format card lines appropriately
			if (preg_match("/side|board|sb/i", $section)) {
				$section = preg_replace("/SB\:/i", "", $section);
				$sb = 'SB:  ';
			} else {
				$sb = '        ';
			}
			// Comment all lines
			$section = preg_replace("/^\s*(.*)/m", "// $1", $section);
			// Uncomment and format all lines with cards
			$cardword = "\w+[',:!\-]*\w*";
			if ($setinfo) {
				$section = preg_replace("#^//\s*(\d+)x?\040*(\040\[\w{2,3}\])?\040*($cardword(\040$cardword)*).*#m", "$sb$1$2 $3", $section);
			} else {
				$section = preg_replace("#^//\s*(\d+)x?\040*(\040\[\w{2,3}\])?\040*($cardword(\040$cardword)*).*#m","$sb$1 $3", $section);
			}
			$formatted_deck .= $section . "\n";
		}
		$formatted_deck = trim(str_replace("\n", "\r\n", $formatted_deck));
		return $formatted_deck;
	}

	/**
	 * Return a deck as a Magic Online text file
	 *
	 * @param string $deck
	 * @return string
	 */
	static public function handleDeckMagicOnline($deck) {
		$deck = trim($deck);
		$sections = preg_split("/\n{2,}/", $deck);
		foreach ($sections as $section) {
			if (preg_match("/side|board|sb/i", $section)) {
				$section = preg_replace("/SB\:/i", "", $section);
				$sbline = "Sideboard\n";
			} else {
				$sbline = "";
			}
			$cardword = "\w+[',:!\-]*\w*";
			$section = preg_replace("#^\s*(\d+)x?\040*($cardword(\040$cardword)*).*#m", "$1 $2", $section);
			$section = preg_replace("/^[^\d].*\n?/m", "", $section);
			$formatted_deck .= $sbline . $section . "\n";
		}
		$formatted_deck = trim(str_replace("\n", "\r\n", $formatted_deck));
		return $formatted_deck;
	}

	/**
	 * Return a deck as a OCTGN text file
	 *
	 * @param string $deck
	 * @param string $name
	 * @param string $author
	 * @return sting
	 */
	static public function handleDeckOCTGN2($deck, $name, $author) {
		$downloadedfrom = str_replace('&', '&amp;', $_SERVER['REQUEST_URI']);
		$formatted_deck = "<?xml version=\"1.0\" encoding=\"utf-8\" standalone=\"yes\"?>\n<deck game=\"a6c8d2e8-7cd8-11dd-8f94-e62b56d89593\">\n<section name=\"Main\">";
		$entities = preg_split("/\n{1,}/", $deck);
		$sb = 0;
		for ($i = 0; $i < count($entities); $i++) {
			if (strlen($entities[$i])>1) {
				if ($sb == 0 && strtolower($entities[$i])==="sideboard") {
					$formatted_deck .= "</section><section name=\"Sideboard\">";
					$sb = 1;
				}
				if (preg_match("/[0-9]+(.[a-zA-Z ])/Uis",$entities[$i])) {
					$cardline = explode(" ", $entities[$i], 2);
					$num_cards = intval($cardline[0]);
					$name_card = $cardline[1];
					$formatted_deck .= "<card qty=\"$num_cards\" id=\"88e8742b-5da7-4458-853f-0fd10980d959\">$name_card</card>";
				}
			}
		}
		$formatted_deck.=($sb==1?"</section><section name=\"Command Zone\" /></deck>":"</section><section name=\"Sideboard\" /><section name=\"Command Zone\" /></deck>"); //final tags for with/without sb
		$formatted_deck = trim(str_replace("\n", "\r\n", $formatted_deck));
		return $formatted_deck;
	}

	/**
	 * Export Deck with Name
	 *
	 * @param string $deck
	 * @param string $name
	 * @return void
	 */
	static function handleDeckText($deck, $name) {
		return "$name\n$deck";
	}
}
