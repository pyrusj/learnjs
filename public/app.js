'use strict';

var crb = {
	poolId: 'us-east-1:9d07b099-44b1-4a27-b5d2-843c07ee1a9a'
};

crb.identity = new $.Deferred();

crb.template = function(name) {
	return $('.templates .' + name).clone();
}

crb.landingView = function() {
	return crb.template('landing-view');
}

crb.profileView = function() {
	var view = crb.template('profile-view');
	crb.identity.done(function(identity) {
		view.find('.email').text(identity.email);
	});
	return view;
}

crb.bookView = function(data) {
	var bookNumber = parseInt(data, 10);
	var view = crb.template('book-view');
	var bookData = crb.books[bookNumber - 1];
	var messageFlash = view.find('.message');
	var pagesRead = view.find('.pages-read');
	
	function checkPages() {
		var totalPages = bookData.pages
		if (totalPages <= pagesRead.val()) {
			var result = [true,'Congrats on finishing the book!'];
		} else {
			var result = [false, ('Only ' + (totalPages - pagesRead.val()) + ' pages left to go!')];
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
		crb.savePages(bookNumber, pagesRead.val());
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
	
	crb.fetchPages(bookNumber).then(function(data) {
		if (data.Item) {
			pagesRead.val(data.Item.pages);
		}
	});
	
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
		'#profile': crb.profileView,
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
	crb.identity.done(crb.addProfileLink);
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

function googleSignIn(googleUser) {
	function refresh() {
		return gapi.auth2.getAuthInstance().signIn({
			prompt: 'login'
		}).then(function(userUpdate) {
			var creds = AWS.config.credentials;
			var newToken = userUpdate.getAuthresponse().id_token;
			creds.params.Logins['accounts.google.com'] = newToken;
			return crb.awsRefresh();
		})
	}
	var id_token = googleUser.getAuthResponse().id_token;
	AWS.config.update({
		region: 'us-east-1',
		credentials: new AWS.CognitoIdentityCredentials({
			IdentityPoolId: crb.poolId,
			Logins: {
				'accounts.google.com': id_token
			}
		})
	})
	crb.awsRefresh().then(function(id) {
		crb.identity.resolve({
			id: id,
			email: googleUser.getBasicProfile().getEmail(),
			refresh: refresh
		});
	});
}

crb.awsRefresh = function() {
	var deferred = new $.Deferred();
	AWS.config.credentials.refresh(function(err) {
		if (err) {
			deferred.reject(err);
		} else {
			deferred.resolve(AWS.config.credentials.identityId);
		}
	});
	return deferred.promise();
}

crb.addProfileLink = function(profile) {
	var link = crb.template('profile-link');
	link.find('a').text(profile.email);
	$('.signin-bar').prepend(link);
}

crb.sendDbRequest = function(req, retry) {
	var promise = new $.Deferred();
	req.on('error', function(error) {
		if (error.code === "CredentialError") {
			crb.identity.then(function(identity) {
				return identity.refresh().then(function() {
					return retry();
				}, function() {
					promise.reject(resp);
				});
			});
		} else {
			promise.reject(error);
		}
	});
	req.on('success', function(resp) {
		promise.resolve(resp.data);
	});
	req.send();
	return promise;
}

crb.savePages = function(bookId, pages) {
	return crb.identity.then(function(identity) {
		var db = new AWS.DynamoDB.DocumentClient();
		var item = {
			TableName: 'learnjs',
			Item: {
				userId: identity.id,
				bookId: bookId,
				pages: pages
			}
		};
		return crb.sendDbRequest(db.put(item), function() {
			return crb.savePages(bookId, pages);
		})
	});
};

crb.fetchPages = function(bookId) {
	return crb.identity.then(function(identity) {
		var db = new AWS.DynamoDB.DocumentClient();
		var item = {
			TableName: 'learnjs',
			Key: {
				userId: identity.id,
				bookId: bookId
			}
		};
		return crb.sendDbRequest(db.get(item), function() {
			return crb.fetchPages(bookId);
		})
	});
};