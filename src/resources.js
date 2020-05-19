var resources = {
	pending:   [],
	cached:    [],
	callbacks: [],

	onload: function(callback) {
		this.callbacks.push(callback);
	},

	get: function(url) {
		return this.cached[url];
	},

	loadBinary: function(url, callback) {
		if (url in this.cached) {
			if (callback !== null)
				callback(this.cached[url]);
			return;
		}

		this.pending[url] = true;

		var req = new XMLHttpRequest();
		req.open("GET", url, true);
		req.responseType = "arraybuffer";
		req.onload = function(result) {
			resources.pending[url] = false;
			var arrayBuffer = req.response;
			if (arrayBuffer) {
				var byteArray = new Uint8Array(arrayBuffer);
				resources.cached[url] = byteArray;
				if (callback !== null)
					callback(byteArray);
				if (resources.noMorePending())
					resources.invokeCallbacks();
			} else {
				console.log("Error reading " + url + ": empty response");
			}
		};
		req.error = function(e) {
			console.log("req.error called. Error: " + e);
			resources.pending[url] = false;
			if (resources.noMorePending())
				resources.invokeCallbacks();
		};
		req.send(null);
	},

	noMorePending: function() {
		var count = 0;
		for (var key in this.pending) {
			if (this.pending[key] === true)
				return false;
			count++;
		}
		console.log("No more pending resources found (" + count + " in memory)");
		return true;
	},

	invokeCallbacks: function() {
		for (var i = 0 ; i < this.callbacks.length ; i++)
			this.callbacks[i]();
	}
};