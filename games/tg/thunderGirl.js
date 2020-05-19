
// --------------------------------------------------------------------------------
// Thunder Girl
// --------------------------------------------------------------------------------

adventure.addModule({
	objects: {
		costume: {
			name: "[your] costume",
			description: "Thunder Girl's costume is a two-piece yellow swimsuit with a slightly reflective surface made by a flexible but strong material, complete with gloves, knee-high boots, mask, and cape. Despite the ammount of flesh showing, it is still pretty conservative at this day and age.",
			wearable: true,
			location: 'inventory',
			proper: true,
			worn: true
		},
		belt: {
			name: "[your] utility belt",
			description: "Thunder Girl's all-purpose utility belt is a solid black leather belt filled with a number of pouches designed to contain all kinds of crime-fighting equipment and tools.",
			wearable: true,
			worn: true,
			location: 'inventory',
			proper: true
		}
	},
	verbs: {
		'help': []
	},
	nouns: {
		'costume' : [ 'clothes', 'bikini', 'swimsuit' ],
		'pouches' : [ 'pouch', 'tool', 'tools' ],
		'gloves'  : [ 'glove' ],
		'cape'    : [ ],
		'boots'   : [ 'boot' ],
		'mask'    : [ ],
		'you'     : [ 'yourself' ],
		'me'      : [ 'myself', 'superheroine', 'heroine' ],
	},

	check: function(order, adventure) {
		switch (order.verb)
		{
			case 'remove':
				if (order.noun == 'costume' || order.noun == 'belt' || order.noun == 'mask' || order.noun == 'boots') {
					adventure.message("[You'd] rather leave [the object] alone.", order.object);
					return false;
				}
				break;
		}
		return true;
	},

	before: function(order, adventure) {
		switch (order.verb)
		{
			case 'drop':
			case 'remove':
			case 'break':
				var costumePart = (order.noun === 'gloves' || order.noun === 'cape' || 
								   order.noun === 'boots'  || order.noun === 'mask');
				if (costumePart) {
					order.noun = 'costume';
					order.object = adventure.findObject('costume');
				}
				break;
		}
		return NOACTION;
	},

	execute: function(order, adventure) {
		switch (order.verb)
		{
			case 'help':
				graphics.msgBgWindow.clear("#202010");
				graphics.msgBgWindow.fadeInRemaining = 0.1;
				graphics.msgWindow.print(adventure.parseMessage("<center>\n<font 1><yellow>How to play</yellow></font>\n</center>\nThe game is played with your keyboard: you type simple English instructions (such as 'escape' or 'pick up the key') and the computer will inform you of the result of your actions.\n\nMany simple verb/noun combinations are understood, but there are a few special commands you should know about:\n\n- <yellow>INVENTORY</yellow> or <yellow>I</yellow> will list any objects you are\n   currently carrying or wearing\n- <yellow>EXAMINE</yellow> or <yellow>EX</yellow> will give you more information\n   about a specific object or scenery\n- <yellow>EXITS</yellow> will list any exits from the current\n   location (such as 'north' or 'enter')\n<right>(More...)"));
				graphics.msgWindow.flush();
				adventure.waitForKey(function() {
					graphics.msgWindow.clear();
					graphics.msgWindow.print(adventure.parseMessage("<center>\n<font 1><yellow>How to play</yellow></font>\n</center>\nUseful commands (continued):\n\n</center>- <yellow>LOOK AROUND</yellow> or <yellow>L</yellow> will describe your current\n   location and surroundings\n- <yellow>SAVE</yellow> will store your progress in your browser.\n   Use <yellow>RESTORE</yellow> to go back to the saved position.\n\nRemember: your time is limited! Most actions, including examining objects or looking around, will consume a turn. Illogical actions the computer doesn't understand (such as typos) won't advance the current time, though. Always keep an eye at the current turn counter (at the top right of the screen) and hurry up!\n\nHave fun!"));
					graphics.msgWindow.flush();
					adventure.waitForKey(function() {
						graphics.msgBgWindow.clear();
						graphics.msgWindow.clear();
						adventure.message('Remember to examine everything for clues!');
						return NOTDONE;
					});
					return WAIT;
				});
				return WAIT;

			case 'examine':
				if (order.noun === 'me' || order.noun === 'you') {
					adventure.message("Clara Celestia, or, as [you are] more commonly known as, Thunder Girl. [You are] just a young and aspiring superheroine who pretends to rock the crime world with no powers or abilities other than a sharp mind, considerable resources, and growing fanbase.");
					return DONE;
				}
				if (adventure.isPresent('costume'))
				{
					if (order.noun === 'pouches' ||
						(order.preposition == 'into' && order.object.key === 'pouches'))			
					{
						if (adventure.player.location == 'buried-chained')
							return NOACTION;
						adventure.message("The pouches are empty. Looks like [your] captors took the precaution of removing all its useful contents.");
						return DONE;
					}
					switch (order.noun)
					{
						case 'gloves':
							adventure.message("The gloves are thin and flexible. They are designed for maximum mobility and comfort, comparable to the ones a doctor would wear.");
							return DONE;
						case 'cape':
							adventure.message("A middle-size plastic purple cape. [You] used to wear a longer one, but it was too prone to accidents and misuse by foes in a fight.");
							return DONE;
						case 'boots':
							adventure.message("A pair of solid leather boots, same color as the costume. No heels. Made for comfort and performance.");
							return DONE;
						case 'mask':
							adventure.message("The mask is a simple plastic decoration fixed with theathre glue and an almost invisible string. It won't fall away accidentally, and serves its purpose, although [you're] amazed nobody recognises [me] with it.");
							return DONE;
					}
				}
				break;
		}
		return NOACTION;
	}
});	

window.onload = function()
{		               
	fonts.load(0, "0.fnt");
	fonts.load(1, "1.fnt");
	fonts.load(2, "2.fnt");
	resources.onload(function()
	{
		(new Image()).src = 'Overlay1.png';
		(new Image()).src = 'Coffin06.jpg';

		adventure.thirdPerson = true;
		adventure.startGame();
		output.startAnimation();
	});
};