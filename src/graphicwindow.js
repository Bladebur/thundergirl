/* global output */

var GraphicWindow = function(left, top, width, height, hiDPI)
{
	this.left = left;
	this.top = top;
	this.width = width;
	this.height = height;
	this.scrollScreens = 2;
	this.background = "";
	this.transparent = false;
	this.resolutionMultiplier = hiDPI ? 2 : 1;
	this.scaling = 1;
	this.baseX = 0;
	this.baseY = 0;

	// Animation properties
	this.lastFrameTime = 0;

	// Initialization
	// Foreground (destination canvas, of screen size)
	this.frontBuffer = document.createElement('canvas');
	this.frontBuffer.width = width * this.resolutionMultiplier;
	this.frontBuffer.height = height * this.resolutionMultiplier;
	this.frontBuffer.style.width = this.width + 'px';
	this.frontBuffer.style.height = this.height + 'px';
	this.frontBufferCtx = this.frontBuffer.getContext('2d');
	this.frontBuffer.setAttribute("name", width + "x" + height + " frontBuffer");
	output.setCanvasStyle(this.frontBuffer);

	// Background (output buffer in low resolution)
	this.screen = document.createElement('canvas');
	this.screen.width = this.width * this.resolutionMultiplier;
	this.screen.height = this.height * this.resolutionMultiplier;
	this.screenCtx = this.screen.getContext('2d');
	this.screenCtx.clearRect(0, 0, this.width, this.height);
	this.screenOffset = 0;
	this.screen.setAttribute("name", width + "x" + height + " screen");
	output.setCanvasStyle(this.screen);

	this.fadeOutTime = 0.5;
	this.fadeInRemaining = 0;
	this.fadeOutRemaining = 0;
	this.resizeCanvas(left, top, 1);
};

GraphicWindow.prototype.enableHiDPI = function()
{
	if (this.resolutionMultiplier != 2) {
		this.resolutionMultiplier = 2;
		this.screen.width = this.width * 2;
		this.screen.height = this.height * 2;
		this.screenCtx = this.screen.getContext('2d');
		this.screenCtx.clearRect(0, 0, this.width * 2, this.height * 2);
		this.resizeCanvas(this.baseX, this.baseY, this.scaling);
	}
};

GraphicWindow.prototype.resizeCanvas = function(x, y, scaling)
{
	this.baseX = x;
	this.baseY = y;
	this.scaling = scaling;

	this.frontBuffer.width = this.width * scaling * this.resolutionMultiplier;
	this.frontBuffer.height = this.height * scaling * this.resolutionMultiplier;
	this.frontBuffer.style.width = (this.width * scaling) + 'px';
	this.frontBuffer.style.height = (this.height * scaling) + 'px';
	this.frontBuffer.style.left = (this.left * scaling + x) + 'px';
	this.frontBuffer.style.top = (this.top * scaling + y) + 'px';
	this.frontBufferCtx = this.frontBuffer.getContext('2d');
	this.frontBufferCtx.setTransform (scaling, 0, 0, scaling, 0, 0);
	this.redrawCanvas();
};

GraphicWindow.prototype.clear = function(color)
{
	console.log("Clearing", this.width+"x"+this.height, "canvas with resolution multiplier", this.resolutionMultiplier);
	if (typeof(color) === 'undefined') {
		this.screenCtx.clearRect(0, 0, this.width * this.resolutionMultiplier, this.height * this.resolutionMultiplier);
		this.transparent = true;
	} else {
		this.screenCtx.fillStyle = color;
		this.screenCtx.fillRect(0, 0, this.width * this.resolutionMultiplier, this.height * this.resolutionMultiplier);
		this.transparent = false;
	}
	this.background = null;
	this.redrawCanvas();
};

GraphicWindow.prototype.drawBackground = function(url, x, y)
{
	if (this.background === url)
		return;
	this.background = url;

	this.drawImage(url, x, y);
};

GraphicWindow.prototype.drawImage = function(url, x, y)
{
	if (!x) x = 0;
	if (!y) y = 0;

	var image = new Image();
	var self = this;
	var size = self.resolutionMultiplier;
	image.onload = function() {
		self.screenCtx.drawImage(image, 0, 0, image.width * size, image.height * size,
			x, y, image.width * size, image.height * size);
		self.redrawCanvas();
	};
	image.src = url;
};

GraphicWindow.prototype.redrawCanvas = function()
{
	this.frontBufferCtx.clearRect(0, 0, this.width*this.resolutionMultiplier, this.height*this.resolutionMultiplier);
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
	var r = this.resolutionMultiplier;
	if (this.screenOffset < 0) {
		var topy = this.height*this.scrollScreens + this.screenOffset;
		lines = -this.screenOffset;
		this.frontBufferCtx.drawImage(this.screen, 0, topy * r, this.width * r, lines * r, 0, 0, this.width * r, lines * r);
		this.frontBufferCtx.drawImage(this.screen, 0, 0, this.width * r, (this.height - lines) * r, 0, lines * r, this.width * r, (this.height - lines)*r);
	} else if (this.screenOffset > this.height * (this.scrollScreens-1)) {
		lines = this.height * this.scrollScreens - this.screenOffset;
		this.frontBufferCtx.drawImage(this.screen, 0, this.screenOffset*r, this.width*r, lines*r, 0, 0, this.width*r, lines*r);
		this.frontBufferCtx.drawImage(this.screen, 0, 0, this.width*r, this.height*r - lines*r, 0, lines*r, this.width*r, (this.height - lines)*r);
	} else {
		this.frontBufferCtx.drawImage(this.screen, 0, this.screenOffset*r, this.width * r, this.height * r,
			0, 0, this.width * r, this.height * r);
	}
};

GraphicWindow.prototype.animationFrame = function(frameTime)
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

	if (mustRedraw)
		this.redrawCanvas();
};
