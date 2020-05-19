/* global output fonts KeySpline iso8859tocp437 colors */

var TextWindow = function(left, top, width, height)
{
	this.left = left;
	this.top = top;
	this.width = width;
	this.height = height;
	this.scrollScreens = 2;

	// Text printing
	this.leftIndent = 0;
	this.rightIndent = 0;
	this.frenchIndent = 0;
	this.currentAlignment = 'left';
	this.defaultColor = "#ccc";

	// Internal variables
	this.currentFont = null;
	this.currentX = 0;
	this.currentY = 0;
	this.currentScreenY = 0;
	this.currentBufferedText = "";
	this.currentLineHeight = 0;
	this.currentLineBaseLine = 0;
	this.currentLineDescent = 0;
	this.rightMostX = 0;
	this.currentColor = "#ccc";
	this.paragraphStart = true;
	this.fullScreen = false;

	// Animation properties
	this.lastFrameTime = 0;

	// Input mode
	this.inputPrompt = "> ";
	this.inputCursorColor = null;
	this.inputCursorAlpha = 1;
	this.inputCursorStyle = 'line';
	this.inputCursorBlinkStyle = 'off';
	this.inputCursorLeft = 1;
	this.inputCursorBottom = 0;
	this.inputText = "";
	this.inputActive = false;
	this.inputCursorChar = 0;
	this.inputCursorX = 0;
	this.inputPrintMode = false;
	this.inputUpdated = false;
	this.inputBlinkTime = 0.2666666666666667;
	this.inputBlinkRemaining = 0.2;
	this.inputBlinkStatus = false;
	this.inputAccepted = false;
	this.inputTextWidth = 0;
	this.inputOffset = 0;
	this.inputHistory = [];
	this.inputHistoryIndex = 0;
	this.waitingForKey = false;
	this.keyCallbacks = [];
	this.keyCallbacksFlush = [];

	// Initialization
	// Foreground (destination canvas, of screen size)
	this.frontBuffer = document.createElement('canvas');
	this.frontBuffer.width = width;
	this.frontBuffer.height = height;
	this.frontBufferCtx = this.frontBuffer.getContext('2d');
	output.setCanvasStyle(this.frontBuffer);

	// Background (output buffer in low resolution)
	this.screen = document.createElement('canvas');
	this.screen.width = this.width;
	this.screen.height = this.height * this.scrollScreens;
	this.screenCtx = this.screen.getContext('2d');
	this.screenCtx.clearRect(0, 0, this.width, this.height);
	this.screenOffset = 0;
	output.setCanvasStyle(this.screen);

	// Intermediate buffer for the current line (drawn at the middle of the canvas)
	this.lineBufferHeight = 64;
	this.lineBuffer = document.createElement('canvas');
	this.lineBuffer.width = this.width;
	this.lineBuffer.height = this.lineBufferHeight;
	this.lineBufferCtx = this.lineBuffer.getContext('2d');
	this.lineBufferCtx.clearRect(0, 0, this.width, this.lineBufferHeight);
	output.setCanvasStyle(this.lineBuffer);

	this.scrollPosition = 0;
	this.scrollActive = false;
	this.scrollDown = false;
	this.scrollLines = this.height;
	this.scrollTime = 0.4;
	this.scrollBegan = this.lastFrameTime;

	this.fadeOutTime = 0.5;
	this.fadeInRemaining = 0;
	this.fadeOutRemaining = 0;

	this.scrollSpline = new KeySpline(0.1, 0.62, 0.63, 1);
};

TextWindow.prototype.resizeCanvas = function(x, y, scaling)
{
	this.scaling = scaling;
	this.frontBuffer.width = this.width*scaling;
	this.frontBuffer.height = this.height*scaling;
	this.frontBuffer.style.left = (this.left*scaling + x) + 'px';
	this.frontBuffer.style.top = (this.top*scaling + y) + 'px';
	this.frontBufferCtx.setTransform (scaling, 0, 0, scaling, 0, 0);
	this.redrawCanvas();
};

TextWindow.prototype.redrawCanvas = function()
{
	this.frontBufferCtx.clearRect(0, 0, this.width, this.height);
	this.frontBufferCtx.mozImageSmoothingEnabled = false;
	this.frontBufferCtx.msImageSmoothingEnabled = false;
	if (typeof(this.frontBufferCtx.imageSmoothingEnabled) == 'boolean')
		this.frontBufferCtx.imageSmoothingEnabled = false;
	else
		this.frontBufferCtx.webkitImageSmoothingEnabled = false;

	if (this.fadeOutRemaining > 0) {
		this.frontBufferCtx.globalAlpha = Math.pow(this.fadeOutRemaining/this.fadeOutTime, 2);
	} else if (this.fadeInRemaining > 0) {
		this.frontBufferCtx.globalAlpha = Math.pow(1 - this.fadeInRemaining/this.fadeOutTime, 2);
	} else {
		this.frontBufferCtx.globalAlpha = 1;
	}

	var lines;
	if (this.screenOffset < 0) {
		var topy = this.height*this.scrollScreens + this.screenOffset;
		lines = -this.screenOffset;
		this.frontBufferCtx.drawImage(this.screen, 0, topy, this.width, lines, 0, 0, this.width, lines);
		this.frontBufferCtx.drawImage(this.screen, 0, 0, this.width, this.height - lines, 0, lines, this.width, this.height - lines);
	} else if (this.screenOffset > this.height * (this.scrollScreens-1)) {
		lines = this.height * this.scrollScreens - this.screenOffset;
		if (lines > 0)
			this.frontBufferCtx.drawImage(this.screen, 0, this.screenOffset, this.width, lines, 0, 0, this.width, lines);
		if (this.height - lines > 0)
			this.frontBufferCtx.drawImage(this.screen, 0, 0, this.width, this.height - lines, 0, lines, this.width, this.height - lines);
	} else {
		this.frontBufferCtx.drawImage(this.screen, 0, this.screenOffset, this.width, this.height,
			0, 0, this.width, this.height);
	}
};

// ----------------------------------------------------------------------
// Input
// ----------------------------------------------------------------------

TextWindow.prototype.scrollIfNeeded = function(lineHeight)
{
	if (this.currentScreenY + lineHeight > this.height) {
		this.scrollActive = true;
		this.scrollBegan = this.lastFrameTime;
		this.scrollLines = this.currentScreenY + lineHeight - this.height;
		this.scrollPosition = 0;
		this.scrollTime = this.scrollLines * 0.005;
	}
};

TextWindow.prototype.waitForKey = function(callback)
{
	this.flush();
	this.scrollIfNeeded(0);
	this.redrawCanvas();

	this.waitingForKey = true;
	this.keyCallbacks.push(callback);
	this.keyCallbacksFlush.push(this.currentBufferedText.length);
};

TextWindow.prototype.startInput = function(callback)
{
	this.flush();

	this.inputText = "";
	this.inputCursorX = 0;
	this.inputCursorChar = 0;
	this.inputActive = true;
	this.inputUpdated = true;
	this.inputOffset = 0;
	this.inputHistoryIndex = this.inputHistory.length;
	this.inputHistory.push("");
	if (!this.inputPromptFinal)
		this.inputPromptFinal = this.inputPrompt;

	if (!this.waitingForKey) {
		this._clearLine(this.currentFont.lineHeight + this.inputCursorBottom);
		this.scrollIfNeeded(this.currentFont.lineHeight + this.inputCursorBottom);
	}

	if (callback)
	{
		var previousCallback = this.oninput;
		this.oninput = function(text) {
			callback(text);
			this.oninput = previousCallback;
		};
	}
};

TextWindow.prototype._printInputLine = function()
{
	this.print('\0');
	this._clearLine();
	this.currentX = 0;
	this.inputPrintMode = true;
	this.print(this.inputActive ? this.inputPrompt : this.inputPromptFinal);
	this.inputCursorX = this.subtextWidth(this.inputText, 0, this.inputCursorChar);
	this.inputTextWidth = this.textWidth(this.inputText);

	var liney = this.lineBufferHeight/2 - this.currentLineBaseLine;
	var lineh = (this.lineBufferHeight/2 + this.currentLineDescent-1) - liney;
	var w = this.width - this.currentX;
	if (this.inputOffset < this.inputCursorX - w + 2)
		this.inputOffset = this.inputCursorX - w + 2;
	if (this.inputOffset > this.inputCursorX)
		this.inputOffset = this.inputCursorX;
	if (this.inputOffset < 0)
		this.inputOffset = 0;
	var x = this.currentX - this.inputOffset;
	this.lineBufferCtx.save();
	this.lineBufferCtx.beginPath();
	this.lineBufferCtx.rect(this.currentX, liney, this.width, lineh);
	this.lineBufferCtx.clip();
	this.printAtC(x, this.currentY, this.currentColor, this.inputText);

	var style = this.inputCursorStyle;
	if (this.inputBlinkStatus === true)
		style = this.inputCursorBlinkStyle;
	if (style !== 'off') {
		var cursorWidth = 1;
		var cursorHeight = this.currentLineHeight-1+this.inputCursorBottom;
		var cursorX = x + this.inputCursorX + this.inputCursorLeft;
		var cursorY = liney;
		if (style !== 'line') {
			cursorWidth = this.subtextWidth(this.inputText, this.inputCursorChar, this.inputCursorChar+1)-1;
			if (cursorWidth < 0)
				cursorWidth = this.currentFont.charRectWidth(65)-1;
		}
		if (style === 'underline') {
			cursorY = liney + cursorHeight - 1;
			cursorHeight = 1;
		}
		this.lineBufferCtx.beginPath();
		this.lineBufferCtx.rect(cursorX, cursorY, cursorWidth, cursorHeight);
		this.lineBufferCtx.fillStyle = this.inputCursorColor === null ? this.currentColor : this.inputCursorColor;
		this.lineBufferCtx.clip();
		this.lineBufferCtx.globalCompositeOperation = "source-out";
		this.lineBufferCtx.globalAlpha = this.inputCursorAlpha;
		this.lineBufferCtx.fill();
	}
	this.lineBufferCtx.restore();

	this.inputPrintMode = false;
	this._updateLine();
};

TextWindow.prototype.keyPressed = function(event)
{
	if (this.waitingForKey) {
		event.preventDefault();
		this.waitingForKey = false;
		if (this.keyCallbacks.length > 0) {
			var callback = this.keyCallbacks.pop();
			var flush = this.keyCallbacksFlush.pop();
			if (callback)
				callback();
			if (this.keyCallbacks.length > 0) {
				var buffer = this.currentBufferedText.substring(flush);
				this.currentBufferedText = this.currentBufferedText.substring(0, flush);
				this.flush();
				this.scrollIfNeeded();
				this.waitingForKey = true;
				this.currentBufferedText = buffer;
			} else if (this.inputActive) {
				this.flush();
				this.scrollIfNeeded(this.currentFont.lineHeight);
			}
		}
		return true;
	}
	if (this.inputActive !== true)
		return false;

	var key = event.which;
	var fontChar = key;
	if (this.currentFont.encoding === 'CP437')
		fontChar = iso8859tocp437[key];
	if (fontChar >= 32 && fontChar < 256) {
		this.inputText = this.inputText.substring(0, this.inputCursorChar) +
			String.fromCharCode(fontChar) + this.inputText.substring(this.inputCursorChar);
		this.inputCursorChar++;
		this.inputUpdated = true;
	}
	switch (key)
	{
		case 8:
			if (this.inputCursorChar > 0) {
				this.inputText = this.inputText.substring(0, this.inputCursorChar-1) +
					this.inputText.substring(this.inputCursorChar);
				this.inputCursorChar--;
				this.inputUpdated = true;
			}
			event.preventDefault();
			break;

		case 13:		// Enter
			if (this.inputText != '') {
				this.inputHistory[this.inputHistory.length - 1] = this.inputText;
				this.inputActive = false;
				this.inputBlinkStatus = true;
				this.inputCursorChar = 0;
				this.print('\0');
				this._clearLine();
				this.currentX = 0;
				this.paragraphStart = true;
				this.print(this.inputPromptFinal === null ? this.inputPrompt : this.inputPromptFinal);
				var previousIndent = this.frenchIndent;
				this.frenchIndent = this.currentX;
				this.print(this.inputText);
				this.print('<r>\n');
				this.frenchIndent = previousIndent;
				if (this.oninput)
					this.oninput(this.inputText);
			}
			break;

		case 1: 		// Ctrl+A
			this.inputCursorChar = 0;
			this.inputUpdated = true;
			break;

		case 5: 		// Ctrl+E
			this.inputCursorChar = this.inputText.length;
			this.inputUpdated = true;
			break;
	}
	//console.log("key pressed: " + key + " '" + String.fromCharCode(key) + "'");
	if (this.inputUpdated)
		event.preventDefault();
	return this.inputUpdated;
};

TextWindow.prototype.keyDown = function(event)
{
	var keyCode = event.keyCode;
	//var charCode = event.charCode;
	//console.log("key down: " + keyCode + " char: " + charCode);

	switch (keyCode)
	{
		case 112: 		// F1
			if (output.showScanlines === false) {
				output.showScanlines = true;
				output.scanlinesOpacity = 0.5;
				output.scanlinesScaling = -1;
			} else if (output.scanlinesOpacity === 0.5) {
				output.scanlinesOpacity = 0.25;
				output.scanlinesScaling = -1;
			} else {
				output.showScanlines = false;
			}
			event.preventDefault();
			break;

		case 121: 		// F10
			this.fullScreen = !this.fullScreen;
			var docElm = document.body;
			if (docElm.requestFullscreen) {
				if (this.fullScreen)
					docElm.requestFullscreen();
				else
					document.exitFullscreen();
				console.log("Showing HTML5 full screen");
			} else if (docElm.webkitRequestFullscreen) {
				if (this.fullScreen)
					docElm.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
				else
					document.webkitExitFullscreen();
				console.log("Showing webkit full screen");
			}
			break;
	}

	if (this.inputActive !== true || this.waitingForKey)
		return;

	switch (keyCode)
	{
		case 8:
			if (this.inputCursorChar > 0) {
				this.inputText = this.inputText.substring(0, this.inputCursorChar-1) +
					this.inputText.substring(this.inputCursorChar);
				this.inputCursorChar--;
				this.inputUpdated = true;
			}
			event.preventDefault();
			break;

		case 27:
			this.inputText = "";
			this.inputCursorChar = 0;
			this.inputUpdated = true;
			break;

		case 46: 		// Del
			this.inputText = this.inputText.substring(0, this.inputCursorChar) +
				this.inputText.substring(this.inputCursorChar+1);
			this.inputUpdated = true;
			break;

		case 37: 		// Left
			if (this.inputCursorChar > 0)
				this.inputCursorChar--;
			this.inputUpdated = true;
			break;

		case 38: 		// Up
			this.inputHistory[this.inputHistoryIndex] = this.inputText;
			if (--this.inputHistoryIndex < 0)
				this.inputHistoryIndex = this.inputHistory.length-1;
			this.inputText = this.inputHistory[this.inputHistoryIndex];
			this.inputCursorChar = this.inputText.length;
			this.inputUpdated = true;
			break;

		case 39: 		// Right
			if (this.inputCursorChar < this.inputText.length)
				this.inputCursorChar++;
			this.inputUpdated = true;
			break;

		case 40: 		// Down
			this.inputHistory[this.inputHistoryIndex] = this.inputText;
			if (++this.inputHistoryIndex == this.inputHistory.length)
				this.inputHistoryIndex = 0;
			this.inputText = this.inputHistory[this.inputHistoryIndex];
			this.inputCursorChar = this.inputText.length;
			this.inputUpdated = true;
			break;

		case 33: 		// PgUp
		case 36: 		// Home
			this.inputCursorChar = 0;
			this.inputUpdated = true;
			break;

		case 34: 		// PgDown
		case 35: 		// End
			this.inputCursorChar = this.inputText.length;
			this.inputUpdated = true;
			break;
	}
	if (this.inputUpdated)
		event.preventDefault();
	return this.inputUpdated;
};

// ----------------------------------------------------------------------
// Scroll & animation
// ----------------------------------------------------------------------

TextWindow.prototype.scrollContents = function(lines)
{
	var fullHeight = this.height * this.scrollScreens;
	lines = lines|0;
	if (lines < -fullHeight)
		lines = -(-lines % fullHeight);
	if (lines > fullHeight)
		lines %= fullHeight;
	this.screenOffset += lines;
	this.currentScreenY -= lines;

	if (this.screenOffset < 0) {
		this.screenOffset += fullHeight;
	} else if (this.screenOffset >= fullHeight) {
		this.screenOffset -= fullHeight;
	}
};

TextWindow.prototype.animationFrame = function(frameTime)
{
	if (this.lastFrameTime === 0)
		this.lastFrameTime = frameTime;

	var elapsedTime = (frameTime - this.lastFrameTime)/1000;
	this.lastFrameTime = frameTime;

	var mustRedraw = false;

	if (this.fadeOutRemaining > 0)
	{
		this.fadeOutRemaining -= elapsedTime;
		this.fadeOutRemaining = Math.max(0, this.fadeOutRemaining);
		mustRedraw = true;
	}
	else if (this.fadeInRemaining > 0)
	{
		this.fadeInRemaining -= elapsedTime;
		this.fadeInRemaining = Math.max(0, this.fadeInRemaining);
		mustRedraw = true;
	}

	if (this.scrollActive)
	{
		var t = ((frameTime - this.scrollBegan)/1000) / this.scrollTime;
		if (t > 1) t = 1;
		var st = this.scrollSpline.get(t);
		//console.log("Scroll t=" + t + " st=" + st);
		var increment = ((st * this.scrollLines) | 0) - this.scrollPosition;
		if (increment !== 0) {
			this.scrollContents(this.scrollDown ? -increment:increment);
			this.scrollPosition += increment;
		}
		if (t >= 1)
			this.scrollActive = false;
		mustRedraw = true;
	}

	if (this.inputActive && !this.waitingForKey)
	{
		if (this.inputUpdated) {
			this.inputUpdated = false;
			this.inputBlinkRemaining = this.inputBlinkTime*2;
			this.inputBlinkStatus = false;
			this._printInputLine();
			mustRedraw = true;
		} else {
			this.inputBlinkRemaining -= elapsedTime;
			if (this.inputBlinkRemaining <= 0) {
				this.inputBlinkRemaining = this.inputBlinkTime;
				this.inputBlinkStatus = !this.inputBlinkStatus;
				this._printInputLine();
				mustRedraw = true;
			}
		}
	}

	if (mustRedraw)
	{
		this.redrawCanvas();

		if (this.showFPS) {
			var fps = 1/elapsedTime;
			this.frontBufferCtx.globalAlpha = 1;
			this.frontBufferCtx.fillStyle = 'white';
			this.frontBufferCtx.fillText((fps|0) + " fps", 0, 10);
		}
	}
};

// ----------------------------------------------------------------------
// Text printing
// ----------------------------------------------------------------------

TextWindow.prototype.subtextWidth = function(text, from, to)
{
	var widths = this.currentFont.characterAdvance;
	var width = 0;
	for (var i = from; i < text.length && i < to; i++)
		width += widths[text.charCodeAt(i)];
	return width;
};

TextWindow.prototype.textWidth = function(text)
{
	var widths = this.currentFont.characterAdvance;
	var width = 0;
	for (var i = 0; i < text.length; i++) {
		var c = text.charCodeAt(i);
		if (c < 0 || c > 255)
			continue;
		width += widths[c];
	}
	return width;
};

TextWindow.prototype.parseEscapeString = function(text)
{
	var res = text.toLowerCase().split(/[ :=]/);
	if (res[0] == 'c' || res[0] == 'color') {
		if (res.length === 0 || !res[1])
			this.currentColor = this.defaultColor;
		else
			this.currentColor = res[1];
	} else if (res[0] == '/c' || res[0] == '/color') {
		this.currentColor = this.defaultColor;
	} else if (res[0] == 'f' || res[0] == 'font') {
		this.currentFont = fonts[res[1]];
		if (!this.currentFont) {
			this.currentFont = fonts[parseInt(res[1])];
			if (!this.currentFont)
				this.currentFont = fonts[0];
		}
	} else if (res[0] == 'b') {
		this.currentFont = fonts[1];
	} else if (res[0] == '/f' || res[0] == '/font' || res[0] == '/b') {
		this.currentFont = fonts[0];
	} else if (res[0] == 'r' || res[0] == 'reset') {
		this.currentFont = fonts[0];
		this.currentColor = this.defaultColor;
		this.currentAlignment = 'left';
	} else if (res[0] == 'center') {
		this.currentAlignment = 'center';
	} else if (res[0] == 'right') {
		this.currentAlignment = 'right';
	} else if (res[0] == 'left' || res[0] == '/center' || res[0] == '/right' || res[0] == '/left') {
		this.currentAlignment = 'left';
	} else if (res[0] in colors) {
		this.currentColor = res[0];
	} else if (res[0].charAt(0) == '/' && res[0].substring(1) in colors) {
		this.currentColor = this.defaultColor;
	} else if (res[0] === 'clear') {
		this._nextLine();
		this.scrollActive = false;
		this.screenOffset = this.currentY;
		this.currentScreenY = 0;
		this._clearScreen();
		this.redrawCanvas();
	} else {
		console.log("Unknown escape string: " + text);
		this.print(text);
	}
};

TextWindow.prototype.clear = function()
{
	if (this.currentX !== 0)
		this._nextLine();
	this.scrollActive = false;
	this.screenOffset = this.currentY;
	this.currentScreenY = 0;
	this._clearScreen();
	this.redrawCanvas();
};

TextWindow.prototype.empty = function()
{
	return this.currentY === 0 && this.currentX === 0;
};

TextWindow.prototype._clearScreen = function()
{
	var maxHeight = this.height * this.scrollScreens;
	this.screenCtx.clearRect(0, this.currentY, this.width, this.height);
	if (this.currentY + this.height > maxHeight)
		this.screenCtx.clearRect(0, 0, this.width,
			this.currentY + this.height - maxHeight);
};

TextWindow.prototype._clearLine = function(height)
{
	if (!height)
		height = this.currentLineHeight;

	var maxHeight = this.height * this.scrollScreens;
	this.screenCtx.clearRect(0, this.currentY, this.width, height);
	if (this.currentY + height > maxHeight)
		this.screenCtx.clearRect(0, 0, this.width,
			this.currentY + height - maxHeight);
};

TextWindow.prototype._updateLine = function()
{
	var x = this.paragraphStart ? this.leftIndent : this.leftIndent + this.frenchIndent;
	var w = this.width - x - this.rightIndent;
	if (this.currentAlignment === 'center')
		x += ((w - this.currentX)/2 | 0);
	else if (this.currentAlignment === 'right')
		x = this.width - this.rightIndent - this.currentX;

	var liney = this.lineBufferHeight/2 - this.currentLineBaseLine;
	var lineh = (this.lineBufferHeight/2 + this.currentLineDescent-1) - liney;
	var maxHeight = this.height * this.scrollScreens;

	if (lineh > 0) {
		this.screenCtx.clearRect(0, this.currentY, this.width, lineh);
		this.screenCtx.drawImage(this.lineBuffer, 0, liney, this.width, lineh,
			x, this.currentY, this.width, lineh);
		if (this.currentY + lineh > maxHeight) {
			var top = maxHeight - this.currentY;
			var bottom = this.currentY + lineh - maxHeight;
			this.screenCtx.clearRect(0, 0, this.width, bottom);
			this.screenCtx.drawImage(this.lineBuffer, 0, liney+top, this.width, bottom,
				x, 0, this.width, bottom);
		}
	}

	this.lineBufferCtx.clearRect(0, liney, this.width+1, lineh+1);
};

TextWindow.prototype._nextLine = function()
{
	if (this.inputPrintMode)
		return;

	if (this.currentLineHeight > 0) {
		var maxHeight = this.height * this.scrollScreens;
		var lineh = this.currentLineHeight;
		this.screenCtx.clearRect(0, this.currentY, this.width, this.currentLineHeight);
		if (this.currentY + this.currentLineHeight > maxHeight) {
			var bottom = this.currentY + lineh - maxHeight;
			this.screenCtx.clearRect(0, 0, this.width, bottom);
		}
	}

	this._updateLine();
	this._moveToNextLine();
};

TextWindow.prototype._moveToNextLine = function()
{
	this.currentX = 0;
	this.currentY += this.currentLineHeight;
	this.currentScreenY += this.currentLineHeight;
	this.currentLineHeight = 0;
	this.currentLineDescent = 0;
	this.currentLineBaseLine = 0;
	this.rightMostX = 0;

	if (this.currentY > this.height * this.scrollScreens)
		this.currentY -= this.height * this.scrollScreens;
};

TextWindow.prototype.print = function(text)
{
	if (this.currentFont === null)
		this.currentFont = fonts[0];
	if (this.waitingForKey)
	{
		this.currentBufferedText += text;
		return;
	}

	text = this.currentBufferedText + text;
	this.currentBufferedText = "";

	var maxWidth = this.width - this.leftIndent - this.rightIndent;
	if (this.paragraphStart === false)
		maxWidth -= this.frenchIndent;
	var from = 0;
	for (var i = 0; i < text.length ; i++)
	{
		var c = text.charCodeAt(i);
		if (c == 32 || c == 13 || c == 10 || c === 0 || c == 60) {
			var width = this.subtextWidth(text, from, i);
			if (this.currentX + width >= maxWidth) {
				this._nextLine();
				this.paragraphStart = false;
				maxWidth = this.width - this.leftIndent - this.rightIndent - this.frenchIndent;
			}
			this.currentX = this.printAtC(this.currentX, this.currentY,
				this.currentColor, text.substring(from, i));
			if (c == 32) {
				this.currentX += this.currentFont.charAdvance(32);
			} else if (c == 13 || c == 10) {
				// Use the current font's line height for \n even if no text was printed
				if (this.currentX === 0)
					this.currentLineHeight = this.currentFont.lineHeight;
				this._nextLine();
				this.paragraphStart = true;
				maxWidth = this.width - this.leftIndent - this.rightIndent;
			} else if (c == 60 /* < */) {
				from = i+1;
				while (i < text.length) {
					i++;
					c = text.charCodeAt(i);
					if (c == 62 /* > */)
						break;
				}
				this.parseEscapeString(text.substring(from, i));

				// The escape string may have printed some text
				if (this.currentBufferedText !== "") {
					this.print(text.substring(i+1));
					return;
				}
			}
			from = i+1;
		}
	}
	this.currentBufferedText = text.substring(from);
};

TextWindow.prototype.flush = function()
{
	this.print("\0");
	if (this.currentX > 0)
		this._nextLine();
	this.redrawCanvas();
};

TextWindow.prototype.printAt = function(x, y, text)
{
	if (text.length === 0)
		return x;

	if (!this.currentFont)
		this.currentFont = fonts[0];
	var font = this.currentFont;
	for (var i = 0; i < text.length; i++) {
		var c = text.charCodeAt(i);
		if (c < 0 || c > 255)
			continue;
		var crx = font.charRectX(c);
		var cry = font.charRectY(c);
		var crw = font.charRectWidth(c);
		var crh = font.charRectHeight(c);
		var crb = font.charBaseLine(c);
		var crd = font.charDescend(c);
		var cro = font.charOffsetX(c);
		if (crh > 0 && crw > 0)
			this.lineBufferCtx.drawImage(font.image, crx, cry, crw, crh, x+cro, this.lineBufferHeight/2-crb, crw, crh);
		x += font.charAdvance(c);
		if (this.currentLineDescent < crd)
			this.currentLineDescent = crd;
		if (this.currentLineBaseLine < crb)
			this.currentLineBaseLine = crb;
		if (this.rightMostX < x+cro+crw)
			this.rightMostX = x+cro+crw;
	}
	if (this.currentLineHeight < font.lineHeight)
		this.currentLineHeight = font.lineHeight;
	return x;
};

TextWindow.prototype.printAtC = function(x, y, color, text)
{
	if (color == 'white' || color === null)
		return this.printAt(x, y, text);
	if (!this.currentFont)
		this.currentFont = fonts[0];

	var leftx = -this.currentFont.charOffsetX(text.charCodeAt(0));
	var nextx = this.printAt(x, y, text);
	var width = this.rightMostX - x;

	if (leftx > 0) {
		x -= leftx;
		width += leftx;
	}

	var liney = this.lineBufferHeight/2 - this.currentLineBaseLine;
	var lineh = (this.lineBufferHeight/2 + this.currentLineDescent-1) - liney;

	this.lineBufferCtx.save();
	this.lineBufferCtx.globalCompositeOperation = "source-in";

	this.lineBufferCtx.beginPath();
	this.lineBufferCtx.rect(x, liney, width, lineh);
	this.lineBufferCtx.clip();

	this.lineBufferCtx.fillStyle = color;
	this.lineBufferCtx.fillRect(x, liney, width, lineh);

	this.lineBufferCtx.restore();
	return nextx;
};
