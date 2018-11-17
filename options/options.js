let urlBlacklist = document.getElementById("urlBlacklist");
let nameBlacklist = document.getElementById("nameBlacklist");

function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};

browser.storage.local.get(["urlBlacklist", "nameBlacklist"]).then(function(res) {
	urlBlacklist.value = res.urlBlacklist || "%s";
	nameBlacklist.value = res.nameBlacklist || "";
});

let debouncedSaveUrlBlacklist = debounce(function(e) {
	browser.storage.local.set({
		"urlBlacklist": urlBlacklist.value.split(",").map(el => el.trim()).filter(el => el.length > 0)
	});
}, 1000);
let debouncedSaveNameBlacklist = debounce(function(e) {
	browser.storage.local.set({
		"nameBlacklist": nameBlacklist.value.split(",").map(el => el.trim()).filter(el => el.length > 0)
	});
}, 1000);

urlBlacklist.addEventListener("input", debouncedSaveUrlBlacklist);
nameBlacklist.addEventListener("input", debouncedSaveNameBlacklist);
