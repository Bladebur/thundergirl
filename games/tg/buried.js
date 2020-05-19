

// --------------------------------------------------------------------------------
// Buried
// --------------------------------------------------------------------------------

adventure.addModule({

	locations: {
		'buried-chained': {
			name: "Buried Alive",
			description: "Each passing minute weights on [your] breath, already heavy under the crushing pressure of heavy steel chains. A cruel gag muffles [your] voice. It's not as if screaming would help [me], though. Not while [you] remain captive in a padded coffin, well buried into the depths of the Earth."
		},
		'buried-nochains': {
			name: "Buried Alive",
			description: "Even without the pressure of chains, the air is now barely enough for survival as prolonged breaths bring little life to [your] lungs. Movement may now be possible in the constrained coffin, but there is probably one ton of soil and a closed lid over [your] head."
		},
		'buried-earth': {
			name: "Buried Alive",
			description: "[You] can't see. [You] can't breath. Tons of dirt and gravel crush [your] body from all directions, sparing neither limb nor inch."
		},
	},

	objects: {
		picklock: {
			name        : "picklock",
			location    : "destroyed",
			description : "This small picklock is [your] only friend right now. Good thing they didn't search through [your] costume too throughly."
		},
		handcuffs: {
			name        : "handcuffs",
			many        : true,
			seen        : true,
			wearable    : true,
			location    : "buried-nochains",
			description : "A pair of high-security, hinged steel handcuffs."
		}
	},

	convertibleNouns: {
		'picklock' : [ 'pick', 'lockpick' ],
		'lock'     : [ ]
	},

	verbs: {
		'struggle' : [],
		'escape'   : [],
		'unlock'   : [],
		'dig'      : [ 'harrow', 'plow', 'displace' ],
		'turn'     : [],
		'free'     : [],
		'pull'     : [],
		'push'     : []
	},

	synonyms: {
		'insert': 'put',
		'pat': 'examine',
		'tap': 'examine'
	},
	
	nouns: {
		'ropes'    : [ 'gag', 'bondage', 'predicament', 'ordeal', 'deathtrap' ],
		'chains'   : [ 'chain' ],
		'floor'    : [ 'earth', 'ground' ],
		'coffin'   : [ 'chest', 'burial', 'grave', 'trunk' ],
		'hands'    : [ 'hand' ],
		'handcuffs': [ 'cuffs', 'handcuff', 'cuff' ],
		'keyhole'  : [ ],
		'right'    : [ 'clockwise' ],
		'left'     : [ 'anticlockwise', 'anti-clockwise' ],
		'lid'      : [ 'top', 'cap', 'covering' ]
	},

	variables: {
		picklock_search_turns : 0,
		picklock_attempt      : 0,
		picklock_position     : 0,
		picklock_bolt         : false,
		picklock_in_glove     : false,
		picklock_found        : false,
		lid_punches           : 0,
		dig_turns             : 0,
		turns_buried          : 0,
		cuffs_open            : false,
		bare_hands_hint       : false
	},

	conditions: function(adventure) {
		return adventure.player.location === 'buried-chained' ||
			   adventure.player.location === 'buried-nochains' ||
			   adventure.player.location === 'buried-earth';
	},

	startGame: function(adventure) {
		adventure.player.location = 'buried-chained';
	},

	before: function(order, adventure) 
	{
		var picklock = adventure.findObject('picklock');

		// Limit all actions while buried

		if (adventure.player.location === 'buried-earth') {
			if (order.verb === 'up' || order.noun === 'up')
				order.verb = 'dig';
			if (order.verb && order.verb.match(/^(examine|drop|take|remove|wear|inventory)$/))
				order.verb = 'struggle';
			if (order.verb === 'look' && order.noun)
				order.verb = 'struggle';
		}

		if (order.verb === 'escape')
			order.verb = 'struggle';

		// Allow 'piclock/lockpick' both as noun and verb
		// Allow 'lock' as a verb but also synonym for 'keyhole'

		if (order.verb === 'picklock')
			order.verb = 'unlock';
		if (order.noun === 'keyhole')
			order.noun = 'lock';
		if (order.noun2 === 'keyhole')
			order.noun2 = 'lock';

		// Synonyms for chains/ropes/handcuffs

		if (order.verb === 'free' && (order.noun === 'hands' || order.noun === 'me'))
			order.verb = 'struggle';
		if (order.noun === 'ropes')
			order.noun = 'chains';
		if (order.verb && order.verb.match(/^(remove|push|pull)$/) && order.noun === 'chains')
			order.verb = 'struggle';
		if (order.verb === 'break' && order.noun === 'chains')
			order.verb = 'struggle';
		if (order.verb && order.verb.match(/^drop|take|break$/) && order.noun === 'handcuffs' && !adventure.variables.cuffs_open)
			order.verb = 'remove';
		if (order.verb === 'open' && order.noun === 'handcuffs')
			order.verb = 'unlock';
		if (order.verb === 'put' && order.noun === 'picklock' && order.noun2 === 'lock' && picklock.location === 'inventory') {
			order.verb = 'unlock';
			order.noun = 'handcuffs';
			order.object = adventure.findObject(order.noun);
		}
		if ((order.verb === 'open' || order.verb === 'unlock') && order.noun === 'lock') {
			order.verb = 'unlock';
			order.noun = 'handcuffs';
			order.object = adventure.findObject('handcuffs');
		}

		// Handling the picklock

		if (order.verbAsWritten && order.verbAsWritten.match(/^search|find$/) && order.noun === 'picklock' && picklock.location === adventure.player.location && !adventure.variables.picklock_in_glove) {
			order.noun = 'floor';
		}
		if (order.verb === 'pull' && order.noun === 'picklock') {
			order.verb = 'take';
		}
		if (!order.verb && (order.noun === 'left' || order.noun === 'right')) {
			order.verb = 'turn';
			order.noun2 = order.noun;
			order.noun = 'picklock';
		}

		// Coffin/lid synonyms

		if (order.verb === 'push' && order.noun === 'lid')
			order.verb = 'open';
		if (order.verb === 'open' && order.noun === 'lid')
			order.noun = 'coffin';
		if (order.verb === 'pull' && order.noun === 'out') {
			order.noun = order.noun2;
			order.nounAsWritten = order.noun2AsWritten;
			order.object = order.object2;
			order.noun2 = 'out';
			order.noun2AsWritten = 'out';
		}
		if ((order.verb === 'punch' || order.verb === 'break') &&
			(order.noun === 'lid' || order.noun === 'coffin')) {
			order.verb = 'break';
			order.noun = 'coffin';
		}
	},

	afterDescription: function(location, adventure) 
	{
		var picklock = adventure.findObject('picklock');
		if (location.key === 'buried-chained')
		{
			if (!adventure.variables.cuffs_open) 
				adventure.message("   [Your] hands, locked behind [your] back by metal handcuffs, are already getting numb.");
			if (adventure.findObject('picklock').location === location.key) {
				if (adventure.variables.picklock_in_glove)
					adventure.message("   [Your] picklock is safely hidden in [your] right glove.");
				else
					adventure.message("   [Your] picklock should be around, but [you] can't see it.");
			}
		}
	},

	responses: {
		"take chains": function(order, adventure) {
			if (adventure.player.location === 'buried-nochains') {
				adventure.message("[You] have no more use for the heavy and unwieldy chains.");
				return NOTDONE;
			} else {
				adventure.message("[You] can't do that.");
				return NOTDONE;
			}
		}
	},

	execute: function(order, adventure) {
		switch (order.verb)
		{
			case 'drop':
				if (order.object && order.object.key === 'picklock' && adventure.variables.picklock_attempt) 
					adventure.variables.picklock_attempt = 0;
				break;
				
			case 'dig':
				if (adventure.player.location === 'buried-earth') {
					switch (++adventure.variables.dig_turns) {
						case 1:
							adventure.message("[Your] chest is about to explode as [you] strain [yourself] fighting against the weight of the earth over [you]. Seems to take forever, but [your] position is changing. The earth is muddy and soft, having been recently digged.");
							break;
						case 2:
							adventure.message("As [you] tumble in the earth with excruciating efforts, [your] arms dig around and move up, followed slowly by the rest of [your] body. [You're] not even sure to make any sense of up and down, but [you] continue [your] progress.");
							break;
						case 3:
							adventure.message("One arm is free! [You're] sure to be touching air. And not a moment too soon. With a last-chance exertion, [you] wrestle against nature and pull [yourself] out of this fiendish grave, taking a deep breath as soon as [you] feel the freedom around [your] face.");
							adventure.waitForKey(function() {
								adventure.player.location = 'graveyard';
								adventure.message("");
								adventure.mess("<clear>");
								return adventure.describe();
							});
							return WAIT;
					}
					return DONE;
				}
				break;

			case 'struggle':
				if (adventure.player.location === 'buried-chained')
				{
					if (adventure.variables.cuffs_open) {
						adventure.message("With [your] hands free, [you] begin to fight the chains in order to free [yourself] out of its cold embrace. The tight space makes this operation much harder than [you] though, but after a few minutes, [you're] done.");
						adventure.player.location = 'buried-nochains';
						adventure.findLocation('buried-nochains').seen = true;
						var handcuffs = adventure.findObject('handcuffs');
						if (handcuffs.location === 'buried-chained')
							handcuffs.location = 'buried-nochains';
					} else {
						adventure.message("[You] struggle with all [your] might for a few minutes, but all attempts prove futile. Both chains and cuffs are more than a match for [your] dexterity and strength.");
					}
					return DONE;
				} else if (adventure.player.location === 'buried-earth') {
					adventure.message("In the depths of the Earth, there is nothing but darkness. [You] can barely move.");
					return NOTDONE;
				} else {
					adventure.message("The chains constrain [me] no more. Getting out of this deathtrap needs to be [your] only focus.");
					return NOTDONE;
				}
				break;

			case 'open':
				if (order.noun === 'coffin') {
					if (adventure.player.location === 'buried-nochains') {
						adventure.message("[You] push the lid with all [your] might, but it will not bulge an inch. There should be a ton of earth pressing it from the other side.");
						return DONE;
					}
					else {
						adventure.message("The heavy, crushing chains constrain all [your] movements. Trying to apply any kind of force to the coffin, from [your] current situation, is impossible.");
						return NOTDONE;
					}
				}
				break;

			case 'lock':
				if (order.noun === 'handcuffs') {
					if (adventure.variables.cuffs_open)
						adventure.message("That's not a good idea.");
					else
						adventure.message("Unfortunately, the handcuffs are already locked.");
					return NOTDONE;
				}
				break;

			case 'break':
				if (order.noun === 'coffin') {
					if (adventure.player.location === 'buried-nochains') {
						if (order.noun2 === 'handcuffs') {
							var handcuffsObject = adventure.findObject('handcuffs');
							if (handcuffsObject.location !== 'inventory') {
								adventure.message("[You] don't have the handcuffs.");
								return NOTDONE;
							}
							switch (++adventure.variables.lid_punches)
							{
								case 1:
									adventure.message("Using the handcuffs as some sort of primitive knuckles to protect [your] hand, [you] start punching at the lid.\n   The confined space prevents [you] from using full force, but after a few attempts some cracks start to form.");
									break;
								case 2:
								case 3:
									adventure.message("[You] continue with the exercise. The lid wood is cracking under the pressure.");
									break;
								case 4:
									adventure.mess("Finally, a huge crack splits the coffin lid and a ton of dirt and gravel invades [your] confined living space. [You] barely have a fraction of second to react and take a deep breath before being surrounded by the avalanche.\n   ");
									adventure.waitForKey(function() {
										adventure.player.location = 'buried-earth';
										adventure.findLocation('buried-earth').seen = true;
										adventure.findObject('picklock').location = 'destroyed';
										adventure.findObject('handcuffs').location = 'destroyed';
										adventure.variables.turns_buried = 32;
										adventure.describe();
										return DONE;
									});
									return WAIT;
							}
							return DONE;
						} // Handcuffs
						if (order.noun2 === 'chains') {
							adventure.message("The chains, while solid, are too heavy and cumbersome to be used that way.");
							return NOTDONE;
						}
						if (adventure.variables.bare_hands_hint)
							adventure.message("The wood is too strong for [your] bare hands. This is going nowhere.");
						else
							adventure.message("[You] punch the hard wood with [your] bare hands. The gloves are not designed for protection, though. [You're] hurting [yourself] without getting any advances.");
						adventure.variables.bare_hands_hint = true;
						return DONE;
					}
				} // NOCHAINS

				adventure.message("The heavy, crushing chains constrain all [your] movements. Trying to apply any kind of force to the coffin, from [your] current situation, is impossible.");
				return NOTDONE;

			case 'remove':
				if (order.noun === 'handcuffs' && adventure.player.location === 'buried-chained') {
					if (!adventure.variables.cuffs_open)
						adventure.message("The cuffs are solidly closed and locked.");
					else
						adventure.message("[You are] no longer wearing the handcuffs.");
					return NOTDONE;
				}
				if (order.noun === 'costume' && adventure.player.location === 'buried-chained') {
					adventure.message("That would be quite a feat, considering [your] current predicament.");
					return NOTDONE;
				}
				break;

			case 'take':
				if (order.noun === 'handcuffs' && adventure.player.location === 'buried-chained' && !adventure.variables.cuffs_open) {
					adventure.message("The cuffs are solidly closed and locked.");
					return NOTDONE;
				}
				if (order.object && order.object.key === 'picklock') {
					if (adventure.variables.picklock_in_glove) {
						adventure.message ("[You] slide [your] hand under the limited space allowed by the cuffs, slowly pulling out the picklock from its hidding place.");
						adventure.waitForKey(function() {
							adventure.message("   Damn! [You] lost it! At the last second, it slipped through from [your] fingers, falling to the floor of the coffin, under [your] body, but out of [your] sight.");
							adventure.variables.picklock_in_glove = false;
							adventure.findObject('picklock').location = adventure.player.location;
							return DONE;
						});
						return WAIT;
					} else if (order.object.location === adventure.player.location) {
						order.verb = 'examine';
						return this.execute(order, adventure);
					}
				}
				break;

			case 'examine':
				if (adventure.player.location === 'buried-chained') {
					if (order.noun === 'chains') {
						adventure.mess("The chains dig into [your] flesh with force. Unconfortable, although not painful yet, they are more than enough to prevent any movements. ");
						if (adventure.variables.cuffs_open)
							adventure.message("With [your] hands now free, [you] can probably get out of them easily.");
						else
							adventure.message("They seem to be connected to the handcuffs behind [your] back.");
						return DONE;
					}
					if (order.noun === 'lock') {
						if (adventure.variables.cuffs_open) {
							adventure.message("[You] already unlocked the handcuffs.");
							return NOTDONE;
						}
						if (adventure.findObject('picklock').location !== 'inventory') {
							adventure.message("The cuffs' keyhole has the size of a small pin, and can't be manipulated in any way at all, unless [you] have an appropiate tool in order to do so.");
							return DONE;
						}
						order.noun = 'handcuffs';
					}
					if (order.noun === 'handcuffs') {
						adventure.message("A hinged high-security model, digging painfully into [your] wrists. Picking their lock from [your] position could be extremely difficult, even with the proper tool.");
						return DONE;
					}
					if (order.noun === 'floor' && !adventure.variables.picklock_in_glove) {
						var picklock = adventure.findObject('picklock');
						if (picklock.location === 'buried-chained') {
							if (++adventure.variables.picklock_search_turns < 3) {
								adventure.message("[You] pat the floor carefully, searching for the missing picklock. A minute or two come to pass, with no luck yet.");
								return DONE;
							}
							adventure.message("Finally! [You] manage to find it by chance, just searching the floor with [your] fingers.\n   [You] now have the picklock.");
							picklock.location = 'inventory';
							picklock.hidden = false;
							adventure.variables.picklock_search_turns = 0;
							return DONE;
						}
					}
				}

				if (order.noun === 'coffin' || order.noun === 'floor') {
					adventure.message("The coffin is padded with comfortable lining, and just big enough for [me].");
					return DONE;
				}

				if (order.noun === 'lid') {
					adventure.message("The coffin's lid is solid cypress wood. It is not very thick, though, so it can probably break with enough force or persistence.");
					return DONE;
				}

				if (order.noun === 'chains') {
					adventure.message("Fortunately, the chains won't be a problem anymore.");
					return DONE;
				}

				if (order.noun === 'hands') {
					adventure.message("Those metal handcuffs have been digging severely into [your] wrists. It could have been much worse, but at least [you are] wearing gloves.");
					return DONE;
				}
				if (order.noun === 'pouches' ||
					(order.preposition == 'into' && order.object.key === 'pouches')) {
					adventure.message("Even from [your] current position, [you are] pretty sure the familiar weight of the belt's content is just not there. Looks like [your] captors took the precaution of removing all its useful contents.");
					return DONE;
				}
				if (order.object && order.object.key === 'picklock') {
					if (adventure.variables.picklock_in_glove) {
						adventure.message("Safely hidden in [your] right glove, out of sight for all but the trained eye. Even with [your] hands cuffed, [you] can probably pull it out of there safely.");
						return DONE;
					}
					if (order.object.location === 'buried-chained') {
						adventure.message("The picklock should be nearby, but [you] can't see it.");
						return NOTDONE;
					}
				}
				break;

			case 'unlock':
				if (order.object && order.object.key === 'handcuffs')
				{
					if (adventure.variables.cuffs_open) {
						adventure.message("The handcuffs are already unlocked.");
						return NOTDONE;
					}
					var picklockObject = adventure.findObject('picklock');
					if (picklockObject.location !== 'inventory') {
						adventure.message("[You] test the handcuffs and find them solidly locked. There is a small keyhole, barely in reach. [You are] not getting out of those without an appropiate tool.");
						return DONE;
					}
					if (adventure.variables.picklock_attempt === 0) {
						adventure.message("Stretching [your] hand, [you] carefully manage to insert the picklock into the keyhole. Now it is just a matter of turning it in the right direction, and some good hearing.");
						adventure.variables.picklock_attempt++;
						return DONE;
					}
					adventure.message("[You] should turn the lockpick in the right direction.");
					return NOTDONE;
				}
				break;

			case 'turn':
				if (order.noun === 'picklock') {
					if (adventure.variables.cuffs_open) {
						adventure.message("The handcuffs are already unlocked.");
						return NOTDONE;								
					}
					if (adventure.variables.picklock_attempt === 0) {
						adventure.message("What are [you] trying to do?");
						return NOTDONE;
					}
					if (order.noun2 !== 'right' && order.noun2 !== 'left') {
						adventure.message("In which direction?");
						return NOTDONE;
					}
					if (order.noun2 === 'right') {
						if (adventure.variables.picklock_position == 1) {
							adventure.message("[You] try to turn the picklock a bit more, but there is some resistance preventing that movement.");
							return DONE;
						}
						adventure.variables.picklock_position++;
						if (adventure.variables.picklock_position === 0 && adventure.variables.picklock_bolt) {
							adventure.message("Finally! The cuff mechanism opens with a click. The handcuffs, now opened, fall to the floor. [Your] hands are free.");
							adventure.variables.cuffs_open = true;
							adventure.findObject('handcuffs').location = adventure.player.location;
							return DONE;
						} else {
							adventure.message("[You] carefully turn the picklock a bit.");
							return DONE;
						}
					} else {
						if (adventure.variables.picklock_position == -2) {
							adventure.message("Tud! Something solid blocks the movement of the picklock in that direction.");
							return DONE;
						}
						adventure.variables.picklock_position--;
						if (adventure.variables.picklock_position == -2) {
							adventure.message("Click! There is a very faint sound as the lockpick contacts something loose.");
							adventure.variables.picklock_bolt = true;
							return DONE;
						}
						adventure.message("[You] carefully turn the picklock a bit.");
						return DONE;
					}
				}
				break;
		}
		return NOACTION;
	},

	after: function(order, adventure) {

		var player = adventure.player;
		var variables = adventure.variables;

		// Finding the picklock

		var picklock = adventure.findObject('picklock');
		if (picklock.location === 'buried-chained')
			picklock.hidden = true;
		else
			picklock.hidden = false;
		if (order.verb === 'examine' && order.noun === 'gloves') {
			if (picklock.location === "destroyed") {
				adventure.message("   That's it! [Your] picklock is still hidden safely under [your] right glove wrist, something [your] captors didn't notice. It is not easy, but [you] can probably take it even with [your] hands tied behind [your] back.");
				picklock.location = adventure.player.location;
				adventure.variables.picklock_in_glove = true;
				picklock.hidden = true;
			}
		}

		// Turns buried and death

		if (player.location == 'buried-earth' && variables.turns_buried < 23)
			variables.turns_buried = 23;
		if (player.location == 'graveyard')
			variables.turns_buried = 0;
		else switch (++variables.turns_buried)
		{
			case 3:
				adventure.message("   The atmosphere is uneasy. The air feels dry.");
				break;
			case 5:
				adventure.message("   By the way, [you] can't but notice the temperature has been increasing a little. [You are] sweating.");
				break;
			case 7:
				adventure.message("   The air is becoming drained and stale. The thumps of [your] breath are more frequent.");
				break;
			case 9:
				adventure.message("   [You] feel the disturbing feeling of a rancid atmosphere, with little oxygen already.");
				break;
			case 12:
				adventure.message("   [Your] body asks for more air, but the one around [you] is now dissatisfying, way too reused.");
				break;
			case 15:
				adventure.message("   [Your] lungs ache now with each inspiration, asking for more, and getting very little.");
				break;
			case 17:
				adventure.message("   What remains of air down here is becoming useless. [You] start feeling some unsteadyness.");
				break;
			case 19:
				adventure.message("   [Your] lungs are on fire. With barely any oxygen, [you] get [your] last gasp of air for the last time as [you] hold [your] breath for one last time.");
				break;
			case 26:
				adventure.message("   There is an excruciating pain in [your] lungs as they implore for some air, knowing there is none to take.");
				break;
			case 28:
				adventure.message("   [You are] now well past [your] limits. [You are] not going to last much longer.");
				break;
			case 30:
				adventure.message("   [You] feel dizzy. It's asphyxia. [You are] going to black out.");
				break;
			case 32:
				adventure.message("   [Your] entire body feels numb. [You] feel [your] life being drained, going away.");
				break;
			case 34:
				adventure.message("   Somehow, [you] still manage to go on. This is not going to end. Not yet.");
				break;
			case 36:
				adventure.message("   This is it. [You are] at the very limits of [your] human resistance. [Your] next action may be [your] last.");
				break;
			case 38:

				adventure.waitForKey(function() {
					adventure.message("\nIt is too late. After the remaining oxygen in [your] blood stream is consumed, [your] mind blacks out and [your] body falls to eternal slumber. [Your] last thoughts are with the many adventures that came and passed, and the many ones that still lurked in waiting.\n");
					adventure.mess("<center><color #f24>The legend of a superheroine will live forever.\nPress any key to restart.");
					adventure.waitForKey(function() {
						adventure.unserialize(adventure.initialState);
						adventure.mess("<clear><r>");
						adventure.restartGame();
					});
					return WAIT;
				});
				return WAIT;
		}
	}
});
