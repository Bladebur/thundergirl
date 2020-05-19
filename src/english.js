/* global adventure DONE NOTDONE WAIT ASK NOACTION isEmpty isSingle */

adventure.addModule({
	directions: {
		'north': 'n',
		'south': 's',
		'east': 'e',
		'west': 'w',
		'northeast': 'ne',
		'northwest': 'nw',
		'southeast': 'se',
		'southwest': 'sw',
		'up': [],
		'down': [],
		'enter': ['in', 'inside'],
		'leave': ['out', 'outside']
	},

	convertibleNouns: {
		'inventory': 'i',
		'exits': ['x']
	},

	prepositions: {
		'into': ['inside', 'in'],
		'on': ['over'],
		'under': [],
		'off': [],
		'at': []
	},

	exitNames: {
		'enter': 'inside',
		'leave': 'outside',
		'north': 'North',
		'south': 'South',
		'east': 'East',
		'west': 'West',
		'northeast': 'Northeast',
		'northwest': 'Northwest',
		'southeast': 'Southeast',
		'southwest': 'Southwest',
	},

	verbs: {
		'enter': [],
		'exit': ['leave'],
		'take': ['get','pick'],
		'drop': ['throw'],
		'wear': ['don'],
		'put': [],
		'remove': ['disrobe', 'unwear', 'doff'],
		'look': ['re-describe', 'l'],
		'quit': ['end', 'quitf'],
		'save': [],
		'load': ['restore'],
		'say': ['speak', 'talk', 'tell'],
		'open': [],
		'close': [],
		'punch': ['fight', 'strike', 'punch', 'kick', 'attack'],
		'restart': [],
		'break': ['destroy', 'split'],
		'pick': [],
		'examine': ['ex', 'check', 'read', 'search', 'find', 'scan', 'investigate', 'inspect'],
		'make': [],
		'sit': [],
		'lay': [ 'lie', 'crouch' ],
		'stand': []
	},

	// Won't affect pronouns
	specialNouns: {
		'all': ['everything'],
		'ram': [],
		'floor': []
	},

	pronouns: {
		'it': [],
		'them': []
	},

	conjunctions: {
		'and': [],
		'then': []
	},

	// ----------------------------------------------------------------------

	afterDescription: function(location, adventure) {
		if (adventure.player.sitting === true)
			adventure.message("   [You are] " + adventure.player.sittingMode + " down on the floor.");
		else if (adventure.player.sitting)
			adventure.message("   [You are] " + adventure.player.sittingMode + " down on [the object].", adventure.findObject(adventure.player.sitting));
	},

	before: function (order, adventure) {

		if (order.verbAsWritten === 'pick' && order.noun == 'up' && order.object2)
			order.object = order.object2;
		if (order.verbAsWritten === 'put' && order.preposition == 'on' && order.prepositionAfter === 'verb')
			order.verb = 'wear';
		if (order.verbAsWritten === 'put' && !order.noun2)
			order.verb = 'wear';
		if (order.verbAsWritten === 'take' && order.noun == 'off' && order.object2) {
			order.verb = 'remove';
			order.object = order.object2;
		}
		if (order.verbAsWritten == 'make' && order.noun == 'inventory')
			order.verb = 'inventory';
		if (order.verbAsWritten == 'x' && (order.noun || order.unknownWords))
			order.verb = 'examine';

		if (order.verb == 'enter') {
			order.direction = 'enter';
			order.directionAsWritten = order.verbAsWritten;
			order.verb = order.verbAsWritten = undefined;
		}
		if (order.verb == 'exit') {
			order.direction = 'leave';
			order.directionAsWritten = order.verbAsWritten;
			order.verb = order.verbAsWritten = undefined;
		}
		if (order.preposition == 'into' && (!order.noun && !order.verb && !order.unknownWords)) {
			order.direction = 'enter';
			order.directionAsWritten = order.prepositionAsWritten;
			order.preposition = order.prepositionAsWritten = undefined;
		}

		if (order.verb == 'sit' && order.direction == 'down') {
			order.direction = '';
		}
		if (order.verbAsWritten == 'get' && order.direction == 'up') {
			order.verb = 'stand';
			order.direction = '';
		}
	},

	execute: function (order, adventure) {
		var player = adventure.player;
		var here = adventure.findLocation(player.location);
		var object = order.object;
		var index, objects, result, savedMessage, sittingMode;

		if (order.direction && !order.verb) {
			if (order.direction in here.exits) {
				if (!adventure.check(order))
					return NOTDONE;
				var locationName = here.exits[order.direction];
				var location = adventure.findLocation(locationName);
				if (!location) {
					adventure.message("[You] can't go " + order.direction + ".");
					return NOTDONE;
				}
				if (adventure.player.sitting) {
					result = adventure.execute("stand up");
					if (result !== DONE)
						return result;
				}
				player.location = locationName;
				if (location.seen)
					adventure.mess("<font 1>" + (location.brief || location.name) + "</font>\n");
				else {
					result = adventure.describe(player.location);
					if (result)
						return result;
				}
				return DONE;
			}
			if (order.direction == 'up' && adventure.player.sitting)
				return adventure.execute("stand up");
			adventure.mess("[You] can't go that way. ");
			if (isEmpty(here.exits))
				adventure.message("There is no exit.");
			else if (isSingle(here.exits) == 1)
				adventure.message("[You] can only go [the options].", adventure.exitsFrom(here));
			else
				adventure.message("[You] can go [the options].", adventure.exitsFrom(here));
			return NOTDONE;
		}

		switch (order.verb) {
			case 'exits':
				var exits = adventure.exitsFrom(here);
				if (isEmpty(exits))
					adventure.message("There is no exit.");
				else if (isSingle(here.exits) == 1)
					adventure.message("[You] can only go [the options].", exits);
				else
					adventure.message("[You] can go [the options].", exits);
				return NOTDONE;

			case 'restart':
				adventure.askPrompt = "Are you sure? ";
				adventure.askCallback = function (text) {
					if (text.substring(0, 1).toLowerCase() == 'y') {
						adventure.unserialize(adventure.initialState);
						adventure.mess("<clear>");
						adventure.restartGame();
						return WAIT;
					}
					return NOTDONE;
				};
				return ASK;

			case 'load':
				var savedState = window.localStorage.getItem("savedState");
				if (!savedState)
					adventure.message("Your progress hasn't been saved yet.");
				else {
					adventure.unserialize(adventure.initialState);
					adventure.unserializeDifferences(savedState);
					adventure.mess("<clear>");
					result = adventure.describe(player.location);
					if (result)
						return result;
				}
				return NOTDONE;

			case 'save':
				var previousState = window.localStorage.getItem("savedState");
				if (previousState) {
					adventure.message("This will overwrite your previous save.");
					adventure.askPrompt = "Are you sure? ";
					adventure.askCallback = function (text) {
						if (text.substring(0, 1).toLowerCase() == 'y') {
							window.localStorage.setItem("savedState", adventure.serializeDifferences(adventure.initialState));
							adventure.message("Progress saved.");
						}
						return NOTDONE;
					};
					return ASK;
				} else {
					window.localStorage.setItem("savedState", adventure.serializeDifferences(adventure.initialState));
					adventure.message("Progress saved.");
					return NOTDONE;
				}
				break;

			case 'inventory':
				adventure.inventoryMode = true;
				var carrying = adventure.objects.filter(function (o) {
					return o.location === 'inventory' && !o.hidden && !o.worn;
				});
				var wearing = adventure.objects.filter(function (o) {
					return o.location === 'inventory' && !o.hidden && o.worn;
				});
				if (carrying.length === 0 && wearing.length === 0)
					adventure.message("[You are] not carrying anything.");
				if (carrying.length > 0)
					adventure.message("[You are] carrying [a list].", carrying);
				if (wearing.length > 0)
					adventure.message("[You are] wearing [a list].", wearing);
				adventure.inventoryMode = false;
				return DONE;

			case 'look':
				if (!order.noun) {
					result = adventure.describe(player.location);
					if (result)
						return result;
					return DONE;
				}
				if (order.noun == 'exits')
					return adventure.execute({ verb: 'exits' });
				return adventure.execute(order, { verb: 'examine' });

			case 'examine':
				if (object) {
					if (adventure.present(object)) {
						if (!adventure.check(order))
							return NOTDONE;
						if (object.description) {
							if (typeof(object.description) == "function") {
								var fullDescription = object.description.call(object, adventure);
								if (fullDescription)
									adventure.message(fullDescription);
							} else {
								adventure.message(object.description);
							}
						} else
							adventure.message("[The object] has nothing special.", object);
						return DONE;
					}
					if (object.seen) {
						adventure.message("[You] can't see [the object] here.", object);
						return NOTDONE;
					}
				}
				adventure.message("[You] can see nothing special.");
				return DONE;

			case 'drop':
				if (object) {
					if (object.location == 'inventory') {
						if (object.worn) {
							savedMessage = adventure.currentMessage;
							result = adventure.execute(order, { verb: 'remove' });
							if (result != DONE)
								return result;
							adventure.currentMessage = savedMessage;
						}
						if (!adventure.check(order)) {
							object.worn = false;
							return NOTDONE;
						}
						object.location = player.location;
						adventure.message("[You drop|I've dropped] [the object].", object);
						return DONE;
					}
					if (adventure.present(object)) {
						adventure.message("[You are] not carrying [the object].", object);
						return NOTDONE;
					}
				} else if (order.noun === 'all') {
					objects = adventure.objects.filter(function (o) {
						return o.location === 'inventory' && !o.worn && !o.hidden;
					});
					if (objects.length === 0) {
						adventure.message("[You are] not carrying anything.");
						return NOTDONE;
					}
					for (index in objects) {
						order.noun = objects[index].noun;
						order.adjective = objects[index].adjective;
						if (!adventure.check(order))
							return NOTDONE;
					}
					for (index in objects) {
						objects[index].location = player.location;
					}
					adventure.message("[You drop|I've dropped] [the list].", objects);
					return DONE;
				}
				adventure.message("[You are] not carrying that.");
				return NOTDONE;

			case 'take':
				if (object) {
					if (object.location == 'inventory') {
						adventure.message("[You are] already carrying [the object].", object);
						return NOTDONE;
					}
					if (adventure.present(object)) {
						if (object.scenery) {
							adventure.message("That's hardly something [you] can carry around.");
							return NOTDONE;
						}
						if (adventure.objects.filter(function (n) { return n.location === 'inventory'; })
							.length >= player.maxObjectsCarried) {
							adventure.message("[You are] carrying too many things.");
							return NOTDONE;
						}
						if (!adventure.check(order))
							return NOTDONE;
						adventure.message("[You] now have [the object].", object);
						object.location = 'inventory';
						return DONE;
					}
					adventure.message("[You] can't see that.");
					return NOTDONE;
				} else if (order.noun == 'all') {
					objects = adventure.objects.filter(function (o) { return o.location === player.location && !o.scenery && !o.hidden; });
					if (objects.length === 0) {
						adventure.message("[You] can see nothing suitable.");
						return NOTDONE;
					}
					if (adventure.objects.filter(function (n) { return n.location === 'inventory'; })
						.length + objects.length > player.maxObjectsCarried) {
						adventure.message("[You are] carrying too many things.");
						return NOTDONE;
					}
					for (index in objects) {
						order.noun = objects[index].noun;
						order.adjective = objects[index].adjective;
						if (!adventure.check(order))
							return NOTDONE;
					}
					for (index in objects) {
						var o = objects[index];
						o.location = 'inventory';
					}
					adventure.message("[You] now have [the list].", objects);
					return DONE;
				}

				if (order.noun || order.unknownWords)
					adventure.message("[You] can't pick up that.");
				else
					adventure.message("[You] can't see that.");
				return NOTDONE;

			case 'remove':
				if (object && object.location == 'inventory' && object.worn) {
					// Handle objects being worn
					if (!adventure.check(order))
						return NOTDONE;
					object.worn = false;
					adventure.message("[You] remove [the object].", object);
					return DONE;
				} else if (object && (object.location == 'inventory' || object.location === player.location)) {
					// Handle objects here or carried, but not being worn
					if (object.wearable)
						adventure.message("You are not wearing [the object].", object);
					else
						adventure.message("[You] can't wear [the object].", object);
					return NOTDONE;
				} else if (order.noun == 'clothes' || order.noun == 'all') {
					// Handle 'remove all' or 'remove clothes' special cases
					var list = adventure.objects.filter(function (o) {
						return o.location == 'inventory' && o.worn && !o.hidden;
					});
					if (list.length === 0) {
						// ...if not wearing anything
						adventure.message("[You are] not wearing anything.");
						return NOTDONE;
					}
					for (index in list) {
						order.noun = list[index].noun;
						order.adjective = list[index].adjective;
						order.object = list[index];
						// Check for every object before executing the order
						if (!adventure.check(order))
							return NOTDONE;
					}
					for (index in list)
						list[index].worn = false;
					adventure.message("[You] remove [the list].", list);
					return DONE;
				} else {
					// Show an error message for any other cases
					adventure.message("[You are] not wearing that.");
					return NOTDONE;
				}
				break;

			case 'wear':
				if (object && object.location == 'inventory' && object.wearable) {
					if (object.worn) {
						adventure.message("[You are] already wearing [the object].", object);
						return NOTDONE;
					}
					if (!adventure.check(order))
						return NOTDONE;
					object.worn = true;
					adventure.message("[You] put on [the object].", object);
					return DONE;
				} else if (object && adventure.inReach(object.location) && object.wearable) {
					savedMessage = adventure.currentMessage;
					result = adventure.execute(order, { verb: 'take' });
					if (result != DONE)
						return result;
					adventure.currentMessage = savedMessage;
					if (!adventure.check(order)) {
						object.location = player.location;
						return NOTDONE;
					}
					adventure.message("[You] put on [the object].", object);
					object.worn = true;
					return DONE;
				} else if (object && (object.location === 'inventory' || object.location === player.location)) {
					if (object.worn)
						adventure.message("[You are] already wearing [the object].", object);
					else
						adventure.message("[You] can't wear [the object].", object);
					return NOTDONE;
				} else if (order.noun == 'all') {
					objects = adventure.objects.filter(function (n) {
						return n.location === 'inventory' && n.wearable && !n.hidden;
					});
					if (objects.length === 0) {
						adventure.message("[You] can see nothing suitable.");
						return NOTDONE;
					}
					for (index in objects) {
						order.noun = objects[index].name;
						order.adjective = objects[index].adjective;
						if (!adventure.check(order))
							return NOTDONE;
					}
					for (index in objects)
						objects[index].worn = true;
					adventure.message("[You are] now wearing [the list].", objects);
					return DONE;
				} else {
					adventure.message("[You] can't wear that.");
					return NOTDONE;
				}
				break;

			case 'sit':
			case 'lay':
				sittingMode = (order.verb == 'sit' ? 'sitting' : 'laying');
				if (!order.noun && !order.unknownWords) {
					objects = adventure.objects.filter(function (n) {
						return n.location === adventure.player.location && (sittingMode == 'sitting' ? n.sitting : n.laying);
					});
					if (objects.length == 1) {
						order.noun = objects[0].noun;
						order.object = object = objects[0];
					}
				}
				if (!object && adventure.player.sitting && adventure.player.sitting !== true && adventure.findObject(adventure.player.sitting).laying)
					object = adventure.findObject(adventure.player.sitting);
				if (adventure.player.sitting) {
					if (((adventure.player.sitting === true && !object) || adventure.player.sitting == object.key) && adventure.player.sittingMode == sittingMode) {
						if (object)
							adventure.message("[You are] already " + sittingMode + " on [the object].", object);
						else
							adventure.message("[You are] already " + sittingMode + " down.");
						return NOTDONE;
					}
					if (!object || adventure.player.sitting != object.key) {
						result = adventure.execute("stand up");
						if (result !== DONE)
							return result;
						adventure.currentMessage = "";
					}
				}
				if (object && adventure.present(object)) {
					if (!object.sitting && sittingMode == 'sitting') {
						adventure.message("[The object] is not suitable for sitting.", object);
						return NOTDONE;
					}
					if (!object.laying && sittingMode == 'laying') {
						adventure.message("[The object] is not suitable for laying down.", object);
						return NOTDONE;
					}
					adventure.player.sitting = object.key;
					adventure.player.sittingMode = sittingMode;
					adventure.message("[You] " + (sittingMode == 'sitting' ? "sit":"lay down") + " on [the object].", object);
					return DONE;
				}
				if ((order.noun && order.noun != 'floor') || order.unknownWords) {
					console.log(order, object);
					adventure.message("That's not suitable for sitting.");
					return NOTDONE;
				}
				adventure.player.sitting = true;
				adventure.player.sittingMode = sittingMode;
				console.log(sittingMode);
				adventure.message("[You] " + (sittingMode == 'sitting' ? "sit":"lay") + " down on the floor.");
				return DONE;

			case 'stand':
				if (adventure.player.sitting) {
					adventure.player.sitting = null;
					adventure.message("[You] stand up.");
					return DONE;
				}
				adventure.message("[You are] already standing.");
				return DONE;
		}
		return NOACTION;
	}
});
