/* global resources */

var Font = function() {
	this.characterWidth    = new Uint8Array(256);
	this.characterBaseLine = new Uint8Array(256);
	this.characterDescend  = new Uint8Array(256);
	this.characterAdvance  = new Uint8Array(256);
	this.characterRectX    = new Uint16Array(256);
	this.characterRectY    = new Uint16Array(256);
	this.characterOffsetX  = new Int8Array(256);
	this.image = null;
	this.lineHeight = 16;
	this.kernings = {};
	this.encoding = 'ISO8859-1';
};

Font.prototype.charAdvance = function(c) {
	return this.characterAdvance[c];
};
Font.prototype.charBaseLine = function(c) {
	return this.characterBaseLine[c];
};
Font.prototype.charDescend = function(c) {
	return this.characterDescend[c];
};
Font.prototype.charOffsetX = function(c) {
	return this.characterOffsetX[c];
};
Font.prototype.charRectX = function(c) {
	return this.characterRectX[c];
};
Font.prototype.charRectY = function(c) {
	return this.characterRectY[c];
};
Font.prototype.charRectWidth = function(c) {
	return this.characterWidth[c];
};
Font.prototype.charRectHeight = function(c) {
	return this.characterBaseLine[c] + this.characterDescend[c];
};

Font.prototype.loadBitfontMakerData = function(data)
{
	this.image = document.createElement('canvas');
	this.image.width  = 256;
	this.image.height = 256;
	var ctx = this.image.getContext('2d');
	var id  = ctx.createImageData(256, 256);
	var od  = id.data;
	var characterWidth = new Uint8Array(256);
	var marginTop = 16;
	var key, c, y;
	for (key in data) {
		c = key|0;
		if (c <= 0 || c > 255)
			continue;
		for (y = 0 ; y < marginTop ; y++)
			if (data[key][y])
				marginTop = y;
	}
	for (key in data) {
		c = key|0;
		if (c <= 0 || c > 255)
			continue;
		var characterData = data[key];
		var cx = (c/16|0) * 16;
		var cy = (c%16) * 16;
		var i  = marginTop;
		characterWidth[c] = 0;
		for (y = cy; y < cy+16 ; y++) {
			var line = characterData[i++];
			var mask = 1;
			var offset = 4*cx + 1024*y;
			for (var x = 0; x < 16 ; x++) {
				if ((line & mask) !== 0 && characterWidth[c] < x+1)
					characterWidth[c] = x+1;
				var color = (line & mask) === 0 ? 0 : 255;
				od[offset++] = color;
				od[offset++] = color;
				od[offset++] = color;
				od[offset++] = color;
				mask <<= 1;
			}
		}
		this.characterRectX[c] = cx;
		this.characterRectY[c] = cy;
		this.characterWidth[c] = characterWidth[c];
	}

	for (c = 0 ; c < 256 ; c++) {
		if (!data[c])
			continue;
		this.characterBaseLine[c] = 11 - marginTop;
		this.characterDescend[c]  = 4;
		this.characterAdvance[c]  = characterWidth[c]-1;
		this.characterOffsetX[c]  = -2;
	}
	this.characterAdvance[32] = 4;
	ctx.putImageData(id, 0, 0);
	this.lineHeight = 14 - marginTop;
	this.encoding = 'ISO8859-1';
};

Font.prototype.loadExtendedFont = function(byteArray) 
{			
	function _U32(byteArray, offset) {
		return   byteArray[offset]          |
				(byteArray[offset+1] << 8)  |
				(byteArray[offset+2] << 16) |
				(byteArray[offset+3] << 24);
	}
	function _U24(byteArray, offset) {
		return   byteArray[offset]          |
				(byteArray[offset+1] << 8)  |
				(byteArray[offset+2] << 16);
	}
	function _U16(byteArray, offset) {
		return   byteArray[offset]          |
				(byteArray[offset+1] << 8);
	}
	function _S8(byteArray, offset) {
		var c = byteArray[offset];
		return (c > 127 ? c-256 : c);
	}
	function uncompressGlyph(od, ptr, yinc, byteArray, off, width, height)
	{
		var mask = 0x80;

		function nextBit() {
			if (mask == 1) {
				mask = 0x80;
				off++;
			} else
				mask >>= 1;
		}

		for (var y = 0 ; y < height ; y++)
		{
			var linePtr = ptr;

			for (var x = 0 ; x < width ; x++)
			{
				if ((byteArray[off] & mask) === 0)
				{
					od[ptr++] = 0;
					od[ptr++] = 0;
					od[ptr++] = 0;
					od[ptr++] = 0;
				}
				else
				{
					nextBit();
					if ((byteArray[off] & mask) === 0)
					{
						od[ptr++] = 255;
						od[ptr++] = 255;
						od[ptr++] = 255;
						od[ptr++] = 255;						
					}
					else 
					{
						var color = 60;
						nextBit();
						if ((byteArray[off] & mask) !== 0)
							color += 80;
						nextBit();
						if ((byteArray[off] & mask) !== 0)
							color += 56;
						nextBit();
						if ((byteArray[off] & mask) !== 0)
							color += 28;
						od[ptr++] = 255;
						od[ptr++] = 255;
						od[ptr++] = 255;
						od[ptr++] = color;
					}
				}
				nextBit();
			}

			ptr = linePtr + yinc;
		}
	}

	// Read file header
	//var fileSize   = _U32(byteArray, 4);
	var glyphCount = _U32(byteArray, 8);
	var bufferSize = _U32(byteArray, 12);
	var kernings   = _U32(byteArray, 16);
	var lineHeight = _U32(byteArray, 20);
	//var baseLine   = _U32(byteArray, 24);

	// Calculate file offsets
	var bufferOffset  = 28;
	var kerningOffset = bufferOffset + bufferSize;
	var glyphsOffset  = kerningOffset + kernings*8;

	// Calculate image size
	var maxWidth = 0;
	var totalHeight = 0;
	var offset = glyphsOffset;
	var i;
	for (i = 0; i < glyphCount ; i++, offset += 12)
	{
		maxWidth = Math.max(maxWidth, byteArray[offset+7]);
		totalHeight += byteArray[offset+8];
	}
	var imageHeight = 256;
	var imageWidth = 128;
	var columns = (totalHeight/imageHeight) | 0;
	while (imageWidth < (columns+1)*maxWidth)
		imageWidth <<= 1;

	// Create the image
	this.image = document.createElement('canvas');
	this.image.width = imageWidth;
	this.image.height = imageHeight;
	var ctx = this.image.getContext('2d');
	var id  = ctx.createImageData(imageWidth, imageHeight);

	// Capture glyph data and draw into image data
	offset = glyphsOffset;
	var x = 0;
	var y = 0;
	var od = id.data;
	for (i = 0; i < glyphCount ; i++, offset += 12)
	{
		var code    = _U32(byteArray, offset);
		var bufoff  = _U24(byteArray, offset+4);
		var width   = byteArray[offset+7];
		var height  = byteArray[offset+8];
		var offsetx = _S8(byteArray, offset+9);
		var offsety = _S8(byteArray, offset+10);
		var advance = _S8(byteArray, offset+11);

		this.characterAdvance[code] = advance;

		if (code >= 0 && code < 256)
		{
			if (y + height > imageHeight) {
				y = 0;
				x += maxWidth;
			}

			this.characterBaseLine[code] = -offsety-1;
			this.characterDescend[code] = height - this.characterBaseLine[code];
			this.characterWidth[code] = width;
			this.characterRectX[code] = x;
			this.characterRectY[code] = y;
			this.characterOffsetX[code] = offsetx;

			var ptr = 4*imageWidth*y + 4*x;
			uncompressGlyph(od, ptr, 4*imageWidth, byteArray, bufoff+bufferOffset, width, height);

			y += height;
		}

		//console.log("Glyph " + code + " '" + String.fromCharCode(code) + "' :"+ width + "x" + height + " at " + bufoff + " x " + offsetx + " y " + offsety + " advance: " + advance);
	}

	// Unpack kerning pairs
	offset = kerningOffset;
	for (i = 0 ; i < kernings ; i++, offset += 8)
	{
		var left   = _U16(byteArray, offset);
		var right  = _U16(byteArray, offset+2);
		var adjust = _U32(byteArray, offset+4);

		if (!(left in this.kernings))
			this.kernings[left] = {};
		this.kernings[left][right] = adjust;
		console.log("Kerning '" + String.fromCharCode(left) + "/" + String.fromCharCode(right) + "': " + adjust);
	}

	ctx.putImageData(id, 0, 0);
	this.lineHeight = lineHeight;
};

Font.prototype.loadLegacyFont = function(characterData, characterWidth) 
{
	this.image = document.createElement('canvas');
	this.image.width  = 256;
	this.image.height = 256;
	var ctx = this.image.getContext('2d');
	var id  = ctx.createImageData(256, 256);
	var od  = id.data;
	var y, c, line;
	for (c = 0; c < 256; c++) {
		var cx = (c/16|0) * 16;
		var cy = (c%16) * 16;
		var cw = characterWidth[c];
		var i  = 16*c;
		for (y = cy; y < cy+16 ; y++) {
			line = characterData[i++];
			var mask = 0x01;
			var offset = 4*cx + 1024*y;
			for (var x = 0; x < cw ; x++) {
				var color = (line & mask) === 0 ? 0 : 255;
				od[offset++] = color;
				od[offset++] = color;
				od[offset++] = color;
				od[offset++] = color;
				mask <<= 1;
			}
		}
		this.characterRectX[c] = cx;
		this.characterRectY[c] = cy;
		this.characterWidth[c] = cw;
	}

	// Inspect the bottom of the 'A' character to find the current base line
	var baseLine = 15;
	for (y = 15 ; y >= 0 ; y--)
	{
		line = characterData[16*65 + y];
		if (line !== 0) {
			baseLine = y;
			break;
		}
	}
	for (c = 0 ; c < 256 ; c++) {
		this.characterBaseLine[c] = baseLine;
		this.characterDescend[c]  = 15-baseLine;
		this.characterAdvance[c]  = characterWidth[c];
		this.characterOffsetX[c]  = 0;
	}
	ctx.putImageData(id, 0, 0);
	this.lineHeight = 12;
	this.encoding = 'CP437';
};

/** @export */
var fonts = {};
fonts.load = function(name, url) 
{
	resources.loadBinary(url, function(byteArray) {
		console.log("Font " + name + " loaded from \"" + url + "\" (" + byteArray.length + " bytes)");
		var signature = "";
		var i, font;
		for (i = 0; i < 4; i++)
			signature += String.fromCharCode(byteArray[i]);
		if (signature == 'ADVC') {
			font = new Font();
			var characterWidth = new Uint8Array(256);
			var	characterData  = new Uint16Array(4096);
			for (i = 0; i < 4096; i++)
				characterData[i] = byteArray[5+2*i] * 256 + byteArray[4+2*i];
			for (i = 0; i < 256; i++)
				characterWidth[i] = byteArray[8196+i];
			font.loadLegacyFont(characterData, characterWidth);
			fonts[name] = font;
		} else if (signature == 'XTNF') {
			font = new Font();
			font.loadExtendedFont(byteArray);
			fonts[name] = font;
		}
	});
};
