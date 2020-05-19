
var graphics = {

	variables: {
		turns: 0,
		gameStarted: false
	},

	initialize: function(adventure) {
		output.screenWidth = 480;
		output.screenHeight = 316;
		output.initialize();
		this.textWindow    = output.createTextWindow(output.screenWidth/2-146, 174, 292, output.screenHeight-174);
		this.graphicWindow = output.createGraphicWindow(output.screenWidth/2-200, 16, 400, 150);
		this.overlayWindow = output.createGraphicWindow(0, 16, output.screenWidth, output.screenHeight-16);
		this.statusWindow  = output.createTextWindow(output.screenWidth/2, 0, output.screenWidth/2, 16);
		this.titleWindow   = output.createTextWindow(0, 0, output.screenWidth/2, 16);
		this.msgBgWindow   = output.createGraphicWindow((output.screenWidth-300)/2, (output.screenHeight-240)/2, 300, 240);
		this.msgWindow     = output.createTextWindow((output.screenWidth-260)/2, (output.screenHeight-240)/2, 260, 240);

		adventure.setTextWindow(this.textWindow);	
		this.textWindow.inputPrompt = "<r><yellow>> ";
	},

	startGame: function(adventure) {
		var welcomeMessage = 
			"<center><font 1><yellow>\nPerils of Thunder Girl 1\n</yellow><color #666>1.0</color>\n<left><r>\n" + 
			"[You] wake up. [Your] eyes are open, but there is only darkness. [Your] body is constrained, cold metal blocking almost any movement. [You're] lying, face up, hands hurting behind [your] back. There is barely any room to move, and none to stand.\n" +
			"   [You] try to recall [your] last moments, but they are imprecise: an abandoned carnival, the faint smell of an almost odorless gas...\n   Somebody prepared an elaborated trap specifically for [me]. And, if [your] impression of [your] surroundings is correct, [you] better find some way out fast or this could be the end of one particular little superheroine.\n\n" +
			"<center><color #666><font 1>F1<font 0> Scanlines      <font 1>F2<font 0> Person      <font 1>F10<font 0> Fullscreen\n\n";

		// Add live reloading support
		var livereloadState = window.localStorage.getItem("livereloadState");
		if (livereloadState)
		{
			adventure.unserialize(adventure.initialState);
			adventure.unserializeDifferences(livereloadState);
			window.localStorage.removeItem("livereloadState");
			this.overlayWindow.drawBackground('Overlay1.png', 0, 0);
			return;
		}

		this.msgBgWindow.clear("#202010");
		this.textWindow.clear();
		this.graphicWindow.clear();
		this.overlayWindow.clear();
		this.msgWindow.clear();
		this.statusWindow.clear();
		this.titleWindow.clear();
		this.msgWindow.print(adventure.parseMessage(welcomeMessage));

		var self = this;
		adventure.variables.gameStarted = false;

		this.textWindow.keyDown = function(event) {
			var keyCode = event.keyCode;
			if (keyCode == 113 /* F2 */ && adventure.variables.gameStarted === false) {
				adventure.thirdPerson = !adventure.thirdPerson;
				if (self.msgWindow.empty() === false) {
					self.msgWindow.clear();
					self.msgWindow.print(adventure.parseMessage(welcomeMessage));
					self.msgWindow.flush();
				}
			}
			TextWindow.prototype.keyDown.call(this, event);
		};

		this.msgBgWindow.fadeInRemaining = 0.5;
		this.msgWindow.fadeInRemaining = 0.5;
		this.textWindow.waitForKey(function() {
			self.msgBgWindow.clear();
			self.overlayWindow.drawBackground('Overlay1.png', 0, 0);
			self.redraw();
			self.graphicWindow.fadeInRemaining = 0.5;
			self.textWindow.fadeInRemaining = 0.5;
			self.overlayWindow.fadeInRemaining = 0.25;
			self.statusWindow.fadeInRemaining = 0.5;
			self.titleWindow.fadeInRemaining = 0.5;
			self.msgWindow.clear();
			self.textWindow.clear();
			adventure.variables.gameStarted = true;
			adventure.flushStart();
		});
		return WAIT;
	},

	after: function(order, adventure) {
		adventure.variables.turns++;
		this.redraw();
	},

	afterDescription: function() {
		this.redraw();
	},

	redraw: function() {
		this.statusWindow.clear();
		this.statusWindow.print("<right>Turns: " + adventure.variables.turns + "\0");
		this.statusWindow.flush();

		var location = adventure.player.location;
		location = adventure.findLocation(location);
		if (location) {
			this.titleWindow.clear();
			this.titleWindow.print("<left><b>" + location.name + "</b>");
			this.titleWindow.flush();
		}

		switch (adventure.player.location) {
			case 'buried-chained':
				this.graphicWindow.drawBackground('Coffin06.jpg');
				break;
			case 'buried-nochains':
				this.graphicWindow.drawBackground('Coffin07.jpg');
				break;
			case 'buried-earth':
				this.graphicWindow.drawBackground('earth.jpg');
				break;
			case 'graveyard':
				this.graphicWindow.drawBackground('graveyard.jpg');
				break;
		}
	},
};

adventure.addModule(graphics);