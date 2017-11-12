$( "a.mw-scryfall-link" ).hover(
	function() {
		var title = $( this ).text();
		var cardname = $( this ).attr( "cardname" );
		if ( $( this ).attr( "cardset" ) ) {
			var cardset = '&set=' + $( this ).attr( "cardset" );
		} else {
			var cardset = "";		
		}
		var popup = new OO.ui.PopupWidget( {
			$content: $( '<img class="cardimage" alt="' + title + '" width="244" src="https://api.scryfall.com/cards/named?exact=' + cardname + cardset + '&format=image&version=normal">' ),
			width: 244
		} );
		$( this ).append( popup.$element );
		popup.toggle( true );
	}, function() {
		$( this ).find( "div.oo-ui-popupWidget" ).remove();
	}
  );