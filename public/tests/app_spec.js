describe('CurrentlyReadingBooks', function(){
	it('invokes router when loaded', function() {
		spyOn(crb, 'showView');
		crb.appOnReady();
		expect(crb.showView).toHaveBeenCalledWith(window.location.hash);
	});
	
	it('subscribes to the hash change event', function() {
		crb.appOnReady();
		spyOn(crb, 'showView');
		$(window).trigger('hashchange');
		expect(crb.showView).toHaveBeenCalledWith(window.location.hash);
	});
	
	it('can show a book view', function() {
		crb.showView('#book-1');
		expect($('.view-container .book-view').length).toEqual(1);
	});
	
	it('shows the landing page when there is no hash', function() {
		crb.showView('');
		expect($('.view-container .landing-view').length).toEqual(1);
	});
	
	it('passes the hash view parameter to the view function', function() {
		spyOn(crb, 'bookView');
		crb.showView('#book-42');
		expect(crb.bookView).toHaveBeenCalledWith('42');
	});
	
	describe('reading section', function() {
		it('can check if book has been read by hitting a button', function() {
			var view = crb.bookView('1');
			view.find('.pages-read').val('345');
			view.find('.save-btn').click();
			expect(view.find('.finished-book span').text()).toEqual('Congrats on finishing the book!');
		});
	
		it('tells you how many pages are left to read', function() {
			var view = crb.bookView('1');
			view.find('.pages-read').val('300');
			view.find('.save-btn').click();
			expect(view.find('.message').text()).toEqual('Only 45 pages left to go!');
		});
	});
});