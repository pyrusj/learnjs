'use strict';

var crb = {};

crb.template = function(name) {
	return $('.templates .' + name).clone();
}

crb.landingView = function() {
	return crb.template('landing-view');
}

crb.bookView = function(data) {
	var bookNumber = parseInt(data, 10);
	var view = crb.template('book-view');
	var bookData = crb.books[bookNumber - 1];
	var messageFlash = view.find('.message');
	
	function checkPages() {
		var pagesRead = view.find('.pages-read').val();
		var totalPages = bookData.pages
		if (totalPages <= pagesRead) {
			var result = [true,'Congrats on finishing the book!'];
		} else {
			var result = [false, ('Only ' + (totalPages - pagesRead) + ' pages left to go!')];
		}
		return result;
	}
	
	function checkPagesClick() {
		var pageCheck = checkPages();
		if (pageCheck[0]) {
			crb.flashElement(messageFlash, crb.buildFinishedFlash(bookNumber));
		} else {
			crb.flashElement(messageFlash, pageCheck[1]);
		}
		return false;
	}
	
	if (bookNumber < crb.books.length) {
		var buttonItem = crb.template('next-btn');
		buttonItem.find('a').attr('href', '#book-' + (bookNumber + 1));
		$('.nav-list').append(buttonItem);
		view.bind('removingView', function() {
			buttonItem.remove();
		});
	}
	
	view.find('.save-btn').click(checkPagesClick);
	view.find('.author').text('by ' + crb.books[bookNumber - 1].author);
	crb.applyObject(bookData, view);
	return view;
}

crb.buildFinishedFlash = function(bookNum) {
	var finishedFlash = crb.template('finished-book');
	var link = finishedFlash.find('a');
	if (bookNum < crb.books.length) {
		link.attr('href', '#book-' + (bookNum + 1));
	} else {
		link.attr('href', '');
		link.text('Back to start');
	}
	return finishedFlash;
}

crb.showView = function(hash) {
	var routes = {
		'#book': crb.bookView,
		'': crb.landingView,
		'#': crb.landingView
	};
	var hashParts = hash.split('-');
	var viewFn = routes[hashParts[0]];
	if (viewFn) {
		crb.triggerEvent('removingView', []);
		$('.view-container').empty().append(viewFn(hashParts[1]));
	}
}

crb.appOnReady = function() {
	window.onhashchange = function() {
		crb.showView(window.location.hash);
	};
	crb.showView(window.location.hash);
}

crb.books = [
	{
		title: "To Say Nothing of the Dog",
		author: "Connie Willis",
		pages: 345
	},
	{
		title: "The Bible",
		author: "God; Various",
		pages: 2893
	}
];

crb.applyObject = function(obj, elem) {
	for (var key in obj) {
		elem.find('[data-name="' + key + '"]').text(obj[key]);
	}
};

crb.flashElement = function(elem, content) {
	elem.fadeOut('fast', function() {
		elem.html(content);
		elem.fadeIn();
	});
};

crb.triggerEvent = function(name, args) {
	$('.view-container>*').trigger(name, args);
}