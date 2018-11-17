function openTabWithDisposition(url, disposition) {
	switch (disposition) {
		case "currentTab":
			browser.tabs.update({"url": url});
			break;
		case "newForegroundTab":
			browser.tabs.create({"url": url});
			break;
		case "newBackgroundTab":
			browser.tabs.create({"url": url, "active": false});
			break;
	}
}

let privileged = ["chrome:", "javascript:", "data:", "file:", "about:config", "about:addons", "about:debugging", "place:"];
function generateBookmarkCashHelper(node) {
	if (node.children) {
		let result = [];
		for (var i = 0; i < node.children.length; i++) {
			result = result.concat(generateBookmarkCashHelper(node.children[i]));
		}
		return result;
	}
	else {
		if (privileged.some(e => node.url.indexOf(e) !== -1)
			|| settings.urlBlacklist.some(e => node.url.indexOf(e) !== -1)
			|| settings.nameBlacklist.some(e => node.title.toLowerCase().indexOf(e) !== -1)) {

			return [];
		}
		else {
			return [{
				"content": node.url,
				"description": node.title
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
		"shouldSort": true,
		"threshold": 0.6,
		"location": 0,
		"distance": 100,
		"maxPatternLength": 32,
		"minMatchCharLength": 1,
		"keys": [{
			"name": "description",
			"weight": 0.8
		}, {
			"name": "content",
			"weight": 0.2
		}]
	});

	return fuse.search(query).slice(0, 3);
}

let settings = {
	"urlBlacklist": [],
	"nameBlacklist": []
}
function updateSettings(changes) {
	if (changes) {
		let changed = false;
		if (changes["urlBlacklist"]) {
			settings.urlBlacklist = changes["urlBlacklist"].newValue || ["%s"];
			changed = true;
		}
		if (changes["nameBlacklist"]) {
			settings.nameBlacklist = changes["nameBlacklist"].newValue || [];
			changed = true;
		}

		if (changed) {
			updateBookmarkCash();
		}
	}
	else {
		return browser.storage.local.get(["urlBlacklist", "nameBlacklist"]).then(function(res) {
			settings.urlBlacklist = res.urlBlacklist || ["%s"];
			settings.nameBlacklist = res.nameBlacklist || [];
		});
	}
}

browser.omnibox.setDefaultSuggestion({
	description: "Search your Bookmarks"
});

let lastInput = "";
browser.omnibox.onInputChanged.addListener(function(input, suggest) {
	lastInput = input;

	suggest(searchBookmarkCash(input));
});

browser.omnibox.onInputEntered.addListener(function(input, disposition) {
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

updateSettings().then(function(res) {
	updateBookmarkCash()

	browser.bookmarks.onCreated.addListener(updateBookmarkCash);
	browser.bookmarks.onRemoved.addListener(updateBookmarkCash);
	browser.bookmarks.onChanged.addListener(updateBookmarkCash);
	browser.bookmarks.onMoved.addListener(updateBookmarkCash);

	browser.storage.onChanged.addListener(updateSettings);
});
