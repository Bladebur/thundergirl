/* global TextWindow GraphicWindow */
/* export output */

/** @constructor */
var Output = function()
{
	this.screenWidth      = 480;
	this.screenHeight     = 300;
	this.showScanlines    = true;
	this.scanlines        = null;
	this.scanlinesOpacity = 0.25;
	this.scanlineScaling  = null;
	this.scaling          = 1;
	this.windows          = [];
};

// ----------------------------------------------------------------------
//  Initialization
// ----------------------------------------------------------------------

Output.prototype.initialize = function()
{
	this.frontBuffer = document.createElement('canvas');
	this.frontBuffer.width = this.screenWidth;
	this.frontBuffer.height = this.screenHeight;
	this.frontBufferCtx = this.frontBuffer.getContext('2d');
	this.setCanvasStyle(this.frontBuffer);

	this.autoResizeCanvas();
	document.body.appendChild(this.frontBuffer);

	// Handle requestAnimationFrame

	var lastTime = 0;
	var vendors = ['webkit', 'moz'];
	var output = this;
	for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
		window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
		window.cancelAnimationFrame =
		window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
	}
	if (!window.requestAnimationFrame)
		window.requestAnimationFrame = function(callback, element) {
			var currTime = new Date().getTime();
			var timeToCall = Math.max(0, 16 - (currTime - lastTime));
			var id = window.setTimeout(function() { callback(currTime + timeToCall); },
				timeToCall);
			lastTime = currTime + timeToCall;
			return id;
		};
	if (!window.cancelAnimationFrame)
		window.cancelAnimationFrame = function(id) { clearTimeout(id); };

	window.onresize = function() { output.autoResizeCanvas(); };
	document.onkeypress = function(event) { output.keyPressed(event); };
	document.onkeydown = function(event)  { output.keyDown(event); };
};

Output.prototype.setCanvasStyle = function (canvas)
{
	canvas.style.position = "absolute";
	canvas.style.outline = "none";
	canvas.style.imageRendering = "optimizeSpeed";
	canvas.style.imageRendering = "optimize-contrast";
	canvas.style.imageRendering = "-webkit-optimize-contrast";
	canvas.style.imageRendering = "-moz-crisp-edges";
	canvas.style.msInterpolationMode = "nearest-neighbor";
	canvas.style.imageRendering = "pixelated";
};

Output.prototype.createTextWindow = function (x, y, width, height)
{
	var textWindow = new TextWindow(x, y, width, height);
	this.windows.push(textWindow);
	textWindow.frontBuffer.tabIndex = this.windows.length;
	textWindow.frontBuffer.style.zIndex = this.windows.length-1;
	this.frontBuffer.style.zIndex = this.windows.length;
	this.autoResizeCanvas();
	document.body.appendChild(textWindow.frontBuffer);
	return textWindow;
};

Output.prototype.createGraphicWindow = function (x, y, width, height, hiDPI)
{
	var graphicWindow = new GraphicWindow(x, y, width, height, hiDPI);
	this.windows.push(graphicWindow);
	graphicWindow.frontBuffer.tabIndex = this.windows.length;
	graphicWindow.frontBuffer.style.zIndex = this.windows.length-1;
	this.frontBuffer.style.zIndex = this.windows.length;
	this.autoResizeCanvas();
	document.body.appendChild(graphicWindow.frontBuffer);
	return graphicWindow;
};

Output.prototype.buildScanlines = function() {
	this.scanlines = document.createElement('canvas');
	this.setCanvasStyle(this.scanlines);
	this.scanlinesScaling = this.scaling;
	if (this.scaling > 3)
		this.scanlinesScaling /= 2;
	this.scanlines.width = this.screenWidth*this.scanlinesScaling;
	this.scanlines.height = this.screenHeight*this.scanlinesScaling;
	this.scanlinesCtx = this.scanlines.getContext('2d');
	this.scanlinesCtx.strokeStyle = 'black';
	this.scanlinesCtx.lineWidth = 1;
	this.scanlinesCtx.globalAlpha = this.scanlinesOpacity;
	this.scanlinesCtx.beginPath();

	var y;
	for (y = 0 ; y < this.screenHeight*this.scanlinesScaling ; y += this.scanlinesScaling)
	{
		this.scanlinesCtx.moveTo(0, y-0.5);
		this.scanlinesCtx.lineTo(this.screenWidth*4, y-0.5);
	}
	if (this.scanlinesScaling == 3)
	{
		this.scanlinesCtx.stroke();
		this.scanlinesCtx.beginPath();
		this.scanlinesCtx.globalAlpha = this.scanlinesOpacity/2;
		for (y = this.scanlinesScaling-1 ; y < this.screenHeight*this.scanlinesScaling ; y += this.scanlinesScaling)
		{
			this.scanlinesCtx.moveTo(0, y-0.5);
			this.scanlinesCtx.lineTo(this.screenWidth*4, y-0.5);
		}
	}
	this.scanlinesCtx.stroke();
};

Output.prototype.autoResizeCanvas = function()
{
	var widthsFit  = Math.floor(window.innerWidth / this.screenWidth);
	var heightsFit = Math.floor(window.innerHeight / this.screenHeight);
	var scaling = Math.max(1, Math.min(widthsFit, heightsFit));
	var x = (window.innerWidth/2 - this.screenWidth*scaling/2);
	var y = (window.innerHeight/2 - this.screenHeight*scaling/2);
	this.frontBuffer.width      = this.screenWidth*scaling;
	this.frontBuffer.height     = this.screenHeight*scaling;
	this.frontBuffer.style.left = x + 'px';
	this.frontBuffer.style.top  = y + 'px';
	this.frontBufferCtx.setTransform (scaling, 0, 0, scaling, 0, 0);
	this.scaling = scaling;

	for (var n = 0 ; n < this.windows.length ; n++)
		this.windows[n].resizeCanvas(x, y, scaling);
	this.redrawScanlines(this.scanlines === null || this.scanlinesScaling != this.scaling);
	this.redrawCanvas();
};

Output.prototype.redrawScanlines = function(rebuild)
{
	this.frontBufferCtx.clearRect(0, 0, this.screenWidth, this.screenHeight);
	this.frontBufferCtx.mozImageSmoothingEnabled = false;
	this.frontBufferCtx.msImageSmoothingEnabled  = false;
	if (typeof(this.frontBufferCtx.imageSmoothingEnabled) == 'boolean')
		this.frontBufferCtx.imageSmoothingEnabled = false;
	else
		this.frontBufferCtx.webkitImageSmoothingEnabled = false;

	if (rebuild)
		this.buildScanlines();

	this.frontBufferCtx.globalAlpha = 1;
	this.frontBufferCtx.drawImage(this.scanlines, 0, 0,
		this.screenWidth*this.scanlinesScaling, this.screenHeight*this.scanlinesScaling,
		0, 0, this.screenWidth, this.screenHeight);
};

Output.prototype.redrawCanvas = function()
{
	if (this.scaling > 1 && this.showScanlines)
	{
		if (this.scanlines === null || this.scanlinesScaling != this.scaling)
			this.redrawScanlines(true);

		this.frontBuffer.style.visibility = 'visible';
	}
	else
	{
		this.frontBuffer.style.visibility = 'hidden';
	}
};

Output.prototype.keyPressed = function(event)
{
	for (var n = 0 ; n < this.windows.length ; n++)
	{
		if (this.windows[n].inputActive || this.windows[n].waitingForKey) {
			this.windows[n].keyPressed(event);
			break;
		}
	}
};

Output.prototype.keyDown = function(event)
{
	for (var n = 0 ; n < this.windows.length ; n++)
	{
		if (this.windows[n].inputActive || this.windows[n].waitingForKey) {
			this.windows[n].keyDown(event);
			break;
		}
	}
};

Output.prototype.startAnimation = function()
{
	window.requestAnimationFrame(function(time) { output.animationFrame(time); });
};

Output.prototype.animationFrame = function(frameTime)
{
	for (var n = 0 ; n < this.windows.length ; n++)
		this.windows[n].animationFrame(frameTime);

	this.redrawCanvas();
	this.startAnimation();
};

/** @export */
var output = new Output();
