adventure.addModule({
	locations: {
		'graveyard': {
			name: "Graveyard",
			description: "[You] stand in a small hill in the middle of the Cleeve Grounds, a small graveyard not far away from Millennium City's port. The city's skyline reflection dominates the midnight skies, a world apart from the lifeless nature around barrows and graves.\n   The disturbed tomb that was meant to be [yours] lies at [your] feet. The tombstone looks like a recent work.",
			exits: {
				'south': 'ending'
			},
			responses: {
				"ex graves": "Every other grave looks old and decayed, and the facility itself seems to be largely abandoned to oblivion and rust. The old graveyard has been full for a long time and is rarely visited.",
				"ex city": "The imposing hulks of iron and steel and their countless eyes have never felt so unwelcoming.",
				"ex tombstone": "It's obviously new, and unmarked.",
				"ex water": "Far below, the waters look calm and cold.",
				"dig, down": "That's a place [you are] not going back to.",
				"exits": "You can just leave the cementery.",
				"leave": ">south"
			},
			synonyms: {
				"tomb": "tombstone",
				"skyline": "city",
				"buildings": "city",
				"sky": "city",
				"port": "water",
				"waters": "water",
				"barrows": "graves",
				"graveyard": "graves",
				"ground": "graves",
				"floor": "graves",
				"tombs": "graves"
			}
		},
		'ending': {
			name: "",
			description: "Time to leave this damn place.\n   Now, [you are] going to find whoever did this to [me], and put him (or her?) behind bars, forever.\n   [You] have nothing but a few clues, but [your] list of enemies is finite, especially the ones demented enough to execute this kind of schema.\n   But first things first..."
		}
	},

	afterDescription: function() {
		if (adventure.player.location == 'ending') {
			adventure.waitForKey(function() {
				adventure.message("<clear><center>\n<font 1><white>Congratulations!</white></font>\n\nYou've reached the ending of Thunder Girl's first escape. Stay tuned for more adventures!\n\n<yellow><font 1>Press any key to restart</font></yellow>\n</center>");
				adventure.waitForKey(function() {
					adventure.unserialize(adventure.initialState);
					adventure.mess("<clear>");
					adventure.restartGame();
				});
				return WAIT;
			});
			return WAIT;
		}
	}
});