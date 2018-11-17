function getSuggestions(query) {
	return browser.bookmarks.search(query).then(function(bookmarks) {
		let suggestions = [];

		for (var i = 0; i < 4 && i < bookmarks.length; i++) {
			if (!bookmarks[i].url || bookmarks[i].type != "bookmark") continue;

			if (bookmarks[i].url.indexOf("%s") != -1) continue;

			suggestions.push({
				content: bookmarks[i].url,
				description: bookmarks[i].title
			});
		}

		return suggestions;
	});
}

function openTabWithDisposition(url, disposition) {
	switch (disposition) {
		case "currentTab":
			browser.tabs.update({url: url});
			break;
		case "newForegroundTab":
			browser.tabs.create({url: url});
			break;
		case "newBackgroundTab":
			browser.tabs.create({url: url, active: false});
			break;
	}
}

function generateBookmarkCashHelper(node) {
	if (node.children) {
		let result = [];
		for (var i = 0; i < node.children.length; i++) {
			result = result.concat(generateBookmarkCashHelper(node.children[i]));
		}
		return result;
	}
	else {
		if (node.url.startsWith("javascript:") || node.url.indexOf("%s") != -1) {
			return [];
		}
		else {
			return [{
				content: node.url,
				description: node.title
			}];
		}
	}
}

let bookmarkCash = [];
function updateBookmarkCash() {
	return browser.bookmarks.getTree().then(function(tree) {
		bookmarkCash = generateBookmarkCashHelper(tree[0]);
	});
}

function searchBookmarkCash(query) {
	let fuse = new Fuse(bookmarkCash, {
		shouldSort: true,
		threshold: 0.6,
		location: 0,
		distance: 100,
		maxPatternLength: 32,
		minMatchCharLength: 1,
		keys: ["description"]
	});

	return fuse.search(query).slice(0, 3);
}

browser.omnibox.setDefaultSuggestion({
	description: "Search your Bookmarks"
});

let lastInput = "";
browser.omnibox.onInputChanged.addListener(function(input, suggest) {
	console.log("onInputChanged", input);
	lastInput = input;

	suggest(searchBookmarkCash(input));
});

browser.omnibox.onInputEntered.addListener(function(input, disposition) {
	console.log("onInputEntered", input, disposition);
	if (input === lastInput) {
		let suggestions = searchBookmarkCash(input);
		if (suggestions.length > 0) {
			openTabWithDisposition(suggestions[0].content, disposition);
		}
	}
	else {
		openTabWithDisposition(input, disposition);
	}
});

browser.bookmarks.onCreated.addListener(updateBookmarkCash);
browser.bookmarks.onRemoved.addListener(updateBookmarkCash);
browser.bookmarks.onChanged.addListener(updateBookmarkCash);
browser.bookmarks.onMoved.addListener(updateBookmarkCash);

updateBookmarkCash().then(function() {
	console.log(bookmarkCash);
	console.log(JSON.stringify(bookmarkCash));
});
