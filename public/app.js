'use strict';

var crb = {};

crb.bookView = function(bookNumber) {
	var title = 'Book #' + bookNumber + ' Coming soon!';
	return $('<div class="book-view">').text(title);
}

crb.showView = function(hash) {
	var routes = {
		'#book': crb.bookView
	};
	var hashParts = hash.split('-');
	var viewFn = routes[hashParts[0]];
	if (viewFn) {
		$('.view-container').empty().append(viewFn(hashParts[1]));
	}
}

crb.appOnReady = function() {
	window.onhashchange = function() {
		crb.showView(window.location.hash);
	};
	crb.showView(window.location.hash);
}