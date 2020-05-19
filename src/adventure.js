
var DONE     = 0;
var NOTDONE  = 1;
var WAIT     = 2;
var ASK      = 3;
var NOACTION = -1;

function isEmpty(obj) {
	for (var i in obj)
		return false;
	return true;
}

function isSingle(obj) {
	var count = 0;
	for (var i in obj)
		if (i !== null)
			count++;
	return count == 1;
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/** @export @constructor */
var AdventureObject = function(key, p) {
	this.reset = function() {
		this.key                = key;
		this.many               = false;
		this.wearable           = false;
		this.worn               = false;
		this.scenery            = false;
		this.seen               = false;
		this.name               = '';
		this.description        = null;
		this.proper             = false;
		this.hidden             = false;
		this.noun               = null;
		this.adjective          = null;
		this.printLocationNames = false;
		this.exitNames          = {};

		if (p) {
			for (var k in p)
				this[k] = p[k];
		}
	};
	this.reset();
};

AdventureObject.prototype.fullName = function(inventoryMode) {
	var name = this.name;
	var details = inventoryMode ? (this.inventoryDetails || this.details) : this.details;
	if (typeof(details) == "function")
		details = details.call(this);
	if (details)
		name += " (" + details + ")";
	return name;
};

AdventureObject.prototype.reset = function() {
	var defaultObject = new AdventureObject();
	for (var k in defaultObject)
		this[k] = k;
};

/** @export @constructor */
var Order = function() {
	this.verb = "";
	this.verbAsWritten = "";
	this.verb2 = "";
	this.verb2AsWritten = "";
	this.adjective = "";
	this.adjectiveAsWritten = "";
	this.noun = "";
	this.nounAsWritten = "";
	this.noun2 = "";
	this.noun2AsWritten = "";
	this.adverb = "";
	this.adverbAsWritten = "";
	this.preposition = "";
	this.prepositionAsWritten = "";
	this.prepositionAfter = "";
	this.conjuntion = "";
	this.conjuntionAsWritten = "";
	this.quotedText = "";
	this.remainingText = "";
	this.unknownWords = 0;
	this.object = null;
};

/** @export @constructor */
var AdventureLocation = function(key, p) {
	this.reset = function() {
		this.key         = key;
		this.description = '';
		this.name        = '';
		this.exits       = {};
		this.seen        = false;

		if (p) {
			for (var k in p)
				this[k] = p[k];
		}
	};
	this.reset();
};

/** @export @constructor */
var AdventureCharacter = function() {
	this.maxObjectsCarried = 99;
	this.inventory = [];
	this.location = 'destroyed';
	this.sitting = '';
};

/** @export @constructor */
var Adventure = function() {
	this.modules        = [];
	this.vocabulary     = {};
	this.synonyms       = {};
	this.order          = null;
	this.remainingText  = "";
	this.currentMessage = "";
	this.objects        = [];
	this.locations      = [];
	this.areas          = {};
	this.variables      = {};
	this.player         = new AdventureCharacter();
	this.initialState   = null;
	this.askPrompt      = "";
	this.askCallback    = null;
	this.textWindow     = null;
	this.currentOrder   = null;
	this.waitOrder      = null;
	this.askOrder       = null;
	this.thirdPerson    = true;
};

Adventure.prototype.addWordsFrom = function(module)
{
	if (module.verbs)
		this.addWords('verb', module.verbs);
	if (module.convertibleNouns)
		this.addWords('convertibleNoun', module.convertibleNouns);
	if (module.directions)
		this.addWords('direction', module.directions);
	if (module.specialNouns)
		this.addWords('specialNoun', module.specialNouns);
	if (module.nouns)
		this.addWords('noun', module.nouns);
	if (module.prepositions)
		this.addWords('preposition', module.prepositions);
	if (module.conjunctions)
		this.addWords('conjunction', module.conjunctions);
	if (module.adjectives)
		this.addWords('adjective', module.adjectives);
	if (module.adverbs)
		this.addWords('adverb', module.adverbs);
	if (module.pronouns)
		this.addWords('pronoun', module.pronouns);
	if (module.responses)
		this.addResponseWords(module.responses);
	if (module.synonyms) {
		for (var word in module.synonyms)
			this.synonyms[word] = module.synonyms[word];
	}
};

Adventure.prototype.addModule = function(module)
{
	this.modules.push(module);
	module.adventure = this;

	// Add vocabulary to our own, register synonyms
	this.addWordsFrom(module);

	if (module.areas)
		this.addAreas(module.areas);
	if (module.locations)
		this.addLocations(module.locations);
	if (module.objects)
		this.addObjects(module.objects);

	var v;
	if (module.variables) {
		for (v in module.variables)
			this.variables[v] = module.variables[v];
	}
	if (module.exitNames) {
		if (!this.exitNames)
			this.exitNames = {};
		for (v in module.exitNames)
			this.exitNames[v] = module.exitNames[v];
	}
};

Adventure.prototype.addWords = function(type, words)
{
	if (typeof(words) == 'undefined')
		return;
	for (var word in words)
	{
		var contents = words[word];
		if (!(word in this.vocabulary))
			this.vocabulary[word] = type;
		if (typeof(contents) == 'string') {
			if (contents !== "")
				this.synonyms[contents] = word;
		} else for (var n = 0 ; n < contents.length ; n++) {
			this.synonyms[contents[n]] = word;
		}
	}
};

Adventure.prototype.serialize = function()
{
	return JSON.stringify({
		objects:   this.objects,
		locations: this.locations,
		player:    this.player,
		variables: this.variables
	});
};

Adventure.prototype.serializeDifferences = function(state)
{
	function differents(objects, originals) {
		var list = {};
		var fromKeys = false;
		if (!originals) {
			console.log("WARNING: no originals");
			return [];
		}
		if (Array.isArray(originals)) {
			fromKeys = true;
		}
		for (var objectKey in objects) {
			if (objectKey in originals) {
				var current = objects[objectKey];
				var previous = null;
				if (fromKeys) {
					objectKey = current.key;
					for (var previousObjectKey in originals) {
						if (originals[previousObjectKey].key === objectKey) {
							previous = originals[previousObjectKey];
							break;
						}
					}
					if (previous === null) {
						console.log("WARNING: object " + objectKey + " not in originals");
						continue;
					}
				} else {
					previous = originals[objectKey];
				}
				if (typeof(current) === 'object') {
					var differences = {};
					var different = false;
					for (var key in current) {
						if (typeof(current[key]) === 'object')
							continue;
						if (typeof(previous[key]) === 'undefined' || previous[key] !== current[key]) {
							differences[key] = current[key];
							different = true;
						}
					}
					if (different)
						list[objectKey] = differences;
				} else if (current !== previous) {
					list[objectKey] = current;
				}
			} else {
				list[objectKey] = objects[objectKey];
			}
		}
		return list;
	}

	state = JSON.parse(state);
	var differences = {
		objects: 	differents(this.objects, state.objects),
		locations:  differents(this.locations, state.locations),
		player:     differents(this.player, state.player),
		variables:  differents(this.variables, state.variables)
	};
	return JSON.stringify(differences);
};

Adventure.prototype.unserialize = function(state)
{
	function updateFrom(object, source) {
		if (source === null)
			return object;
		if (typeof(source) === "object") {
			/*
			if (typeof(object.reset) === "function")
				object.reset();
			*/
			for (var key in source)
				object[key] = updateFrom(object[key], source[key]);
			return object;
		} else {
			return source;
		}
	}
	state = JSON.parse(state);
	if (!state)
		return NOTDONE;
	if (state.objects)
		this.objects = updateFrom(this.objects, state.objects);
	if (state.player)
		this.player = updateFrom(this.player, state.player);
	if (state.locations)
		this.locations = updateFrom(this.locations, state.locations);
	if (state.variables)
		this.variables = updateFrom(this.variables, state.variables);
};

Adventure.prototype.unserializeDifferences = function(state)
{
	function dictToArray(dict, originals) {
		var list = [];
		var num;
		for (num in originals)
			list.push(null);
		for (var key in dict)
			for (num in originals)
				if (originals[num].key === key)
					list[num] = dict[key];
		return list;
	}

	state = JSON.parse(state);
	this.unserialize(JSON.stringify({
		objects: 	dictToArray(state.objects, this.objects),
		locations:  dictToArray(state.locations, this.locations),
		player:     state.player,
		variables:  state.variables
	}));
};

Adventure.prototype.addAreas = function(list)
{
	for (var key in list) {
		this.areas[key] = list[key];
		this.addWordsFrom(list[key]);
	}
};

Adventure.prototype.addLocations = function(list)
{
	for (var key in list) {
		this.locations.push(new AdventureLocation(key, list[key]));
		this.addWordsFrom(list[key]);
	}
};

Adventure.prototype.addObjects = function(list)
{
	for (var key in list)
	{
		var object = new AdventureObject(key, list[key]);
		if (!object.name)
			object.name = key;
		if (!object.noun) {
			var words = object.name.split(" ");
			var firstAdjective = 0;
			if (object.proper)
				firstAdjective = 1;
			for (var n = firstAdjective ; n < words.length-1 ; n++) {
				if (!(words[n] in this.vocabulary)) {
					this.vocabulary[words[n]] = 'adjective';
					object.adjective = words[n];
				}
			}
			var noun = words[words.length-1];
			if (!(noun in this.vocabulary))
				this.vocabulary[noun] = 'noun';
			object.noun = noun;
		}
		this.objects.push(object);
	}
};

Adventure.prototype.exitsFrom = function(location)
{
	var list = [];
	if (!location.exits)
		return list;
	for (var exit in location.exits) {
		var name = exit;
		if (location.exitNames && location.exitNames[name])
			name = location.exitNames[name];
		if (this.exitNames && this.exitNames[name])
			name = this.exitNames[name];
		if (location.directions && location.directions[exit])
			name = name + " (" + location.directions[exit] + ")";
		list.push({
			name: name,
			proper: true
		});
	}
	return list;
};

Adventure.prototype.parsedProperObjectName = function(object)
{
	var text = "";
	var from = 0;
	for (var n = 0 ; n < object.name.length ; n++)
	{
		if (object.name.charAt(n) == '[')
		{
			text += object.name.substring(from, n);
			from = n+1;
			while (n < object.name.length && object.name.charAt(n) != ']')
				n++;
			var code = object.name.substring(from, n);
			switch (code)
			{
				case "your":
				case "yours":
					if (!this.thirdPerson)
						text += "my";
					else
						text += code;
					break;
				default:
					text += code;
					break;
			}
			from = n+1;
			continue;
		}
	}
	return text + object.name.substring(from, object.name.length);
};

Adventure.prototype.parseMessageCode = function (code, object)
{
	if (object && typeof(object) == "string")
		object = { name: object, fullName: function() { return this.name; } };
	if (!object)
		object = { name: 'that', fullName: function() { return this.name; }, proper: true };

	var result = "";
	var separator = " and ";
	switch (code)
	{
		case "You":
		case "you":
			if (!this.thirdPerson)
				result += "I";
			else
				result += code;
			break;

		case "me":
			if (!this.thirdPerson)
				result += code;
			else
				result += "you";
			break;

		case "Me":
			if (!this.thirdPerson)
				result += code;
			else
				result += "You";
			break;

		case "Your":
			if (!this.thirdPerson)
				result += "My";
			else
				result += code;
			break;

		case "your":
			if (!this.thirdPerson)
				result += "my";
			else
				result += code;
			break;

		case "yourself":
			if (!this.thirdPerson)
				result += "myself";
			else
				result += code;
			break;

		case "yours":
			if (!this.thirdPerson)
				result += "mine";
			else
				result += code;
			break;

		case "Yours":
			if (!this.thirdPerson)
				result += "Mine";
			else
				result += code;
			break;

		case "You'd":
		case "you'd":
			if (!this.thirdPerson)
				result += "I'd";
			else
				result += code;
			break;

		case "You're":
		case "you're":
			if (!this.thirdPerson)
				result += "I'm";
			else
				result += code;
			break;

		case "You were":
		case "you were":
			if (!this.thirdPerson)
				result += "I was";
			else
				result += code;
			break;

		case "You are":
		case "you are":
			if (!this.thirdPerson)
				result += "I am";
			else
				result += code;
			break;

		case "the options":
			separator = " or ";

		/* falls through */
		case "list":
		case "a list":
		case "the list":
		case "List":
		case "A list":
		case "The list":
			var pre = code.replace(" list", " object").replace(" options", " object");
			for (var n = 0 ; n < object.length ; n++)
			{
				result += this.parseMessageCode(pre, object[n]);
				pre = pre.toLowerCase();
				if (n < object.length-2)
					result += ", ";
				else if (n < object.length-1)
					result += separator;
			}
			break;

		case "object":
			if (object.proper)
				result += this.parsedProperObjectName(object);
			else
				result += object.fullName(this.inventoryMode);
			object.seen = true;
			break;

		case "A object":
		case "An object":
			if (!object.seen)
			{
				if (object.proper)
					result += capitalizeFirstLetter(this.parsedProperObjectName(object));
				else if (object.many)
					result += capitalizeFirstLetter(object.fullName(this.inventoryMode));
				else if (object.name.substring(0, 1).match(/[aeiou]/i))
					result += "An " + object.fullName(this.inventoryMode);
				else
					result += "A " + object.fullName(this.inventoryMode);
				object.seen = true;
				break;
			}

		/* falls through */
		case "The object":
			if (object.proper)
				result += capitalizeFirstLetter(this.parsedProperObjectName(object));
			else
				result += "The " + object.fullName(this.inventoryMode);
			object.seen = true;
			break;

		case "a object":
		case "an object":
			if (!object.seen)
			{
				if (object.proper)
					result += this.parsedProperObjectName(object);
				else if (object.many)
					result += object.fullName(this.inventoryMode);
				else if (object.name.substring(0, 1).match(/[aeiou]/i))
					result += "an " + object.fullName(this.inventoryMode);
				else
					result += "a " + object.fullName(this.inventoryMode);
				object.seen = true;
				break;
			}

		/* falls through */
		case "the object":
			if (object.proper)
				result += this.parsedProperObjectName(object);
			else
				result += "the " + object.fullName(this.inventoryMode);
			object.seen = true;
			break;

		default:
			if (code.match(/^[Yy]ou.*\|/)) {
				var personSplit = code.split("|");
				if (this.thirdPerson)
					result += personSplit[0];
				else
					result += personSplit[1];
			} else {
				console.log("Unknown special message code \"" + code + "\"");
			}
			break;
	}

	return result;
};

Adventure.prototype.processMessage = function(text)
{
	var previousMessage = this.currentMessage;
	this.currentMessage = "";
	this.mess(text);
	var result = this.currentMessage;
	this.currentMessage = previousMessage;
	return result;
};

Adventure.prototype.parseMessage = function(text, object)
{
	var from = 0;
	var result = "";
	for (var n = 0 ; n < text.length ; n++)
	{
		if (text.charAt(n) == '[')
		{
			result += text.substring(from, n);
			from = n+1;
			while (n < text.length && text.charAt(n) != ']')
				n++;
			result += this.parseMessageCode(text.substring(from, n), object);
			from = n+1;
			continue;
		}
	}
	result += text.substring(from);
	return result;
};

/** @param {string} text
 *  @param {Object=} object */
Adventure.prototype.mess = function(text, object)
{
	var textToAdd = this.parseMessage(text, object);
	if (this.currentMessage && this.currentMessage.slice(-1) == '\n' && !textToAdd.match(/^[ <]/))
		this.currentMessage += "   ";
	this.currentMessage += textToAdd;
};

Adventure.prototype.waitForKey = function(callback)
{
	if (!this.textWindow)
		return;

	var adventure = this;
	this.waitOrder = this.currentOrder;
	this.textWindow.print(this.currentMessage);
	this.currentMessage = "";
	this.textWindow.waitForKey(function() {
		var result = DONE;
		if (callback)
			result = callback();
		if (result != WAIT) {
			adventure.textWindow.print(adventure.currentMessage);
			adventure.currentMessage = "";
			adventure.resolveTurn(adventure.waitOrder, result);
			adventure.waitOrder = null;
			adventure.textWindow.print("\n");
			adventure.textWindow.startInput();
		}
	});
};

/** @param {Object=} object */
Adventure.prototype.message = function(text, object)
{
	return this.mess(text + "\n", object);
};

Adventure.prototype.findLocation = function(key)
{
	for (var index in this.locations)
		if (this.locations[index].key === key)
			return this.locations[index];
	return null;
};

Adventure.prototype.objectsHere = function()
{
	var result = [];
	for (var index in this.objects) {
		var object = this.objects[index];
		if (object.location == 'inventory' || this.inReach(object.location))
			result.push(object);
	}
	return result;
};

Adventure.prototype.inReach = function(location)
{
	if (typeof(location) === 'object')
		location = location.key;
	if (location === 'inventory')
		return true;
	if (location === this.player.location)
		return true;
	var here = this.findLocation(this.player.location);
	if (location === here.reach)
		return true;
	if (typeof(here.reach) === 'function')
		if (here.reach(location, this))
			return true;
	if (typeof(here.reach) === 'object') {
		for (var key in here.reach)
			if (here.reach[key] === location)
				return true;
	}
	return false;
};

Adventure.prototype.present = function(object)
{
	if (object.location === 'inventory')
		return true;
	return this.inReach(object.location);
};

Adventure.prototype.findObject = function(key)
{
	for (var index in this.objects)
		if (this.objects[index].key === key)
			return this.objects[index];
	return null;
};

Adventure.prototype.objectsAt = function(location)
{
	if (typeof(location) === "object")
		location = location.key;
	return this.objects.filter(function(o) { return o.location === location; });
};

Adventure.prototype.isPresent = function(object)
{
	if (typeof(object) == 'string')
		object = this.findObject(object);
	if (object && (object.location === this.player.location || object.location === 'inventory'))
		return true;
	else
		return false;
};

Adventure.prototype.describe = function(location)
{
	if (!location)
		location = this.player.location;
	if (typeof(location) == 'string')
		location = this.findLocation(location);

	var index, module;
	for (index = this.modules.length-1 ; index >= 0 ; index--)
	{
		module = this.modules[index];
		if (module.conditions && !module.conditions(this))
			continue;
		if (module.beforeDescription)
		{
			if (module.beforeDescription(location, this) === NOTDONE)
				return NOTDONE;
		}
	}

	if (!location.seen && this.printLocationNames)
		this.message("<b>[object]</b>", location);
	location.seen = true;
	this.message(location.description);
	var here = this.player.location;
	var objectsHere = this.objects.filter(function(n) { return n.location === here && !n.hidden; });
	if (objectsHere.length > 0)
		this.message("   [You] can see [a list] here.", objectsHere);

	var result = DONE;
	for (index = this.modules.length-1 ; index >= 0 ; index--)
	{
		module = this.modules[index];
		if (module.conditions && !module.conditions(this))
			continue;
		if (module.afterDescription)
			result = module.afterDescription(location, this) || result;
	}
	return DONE;
};

Adventure.prototype.setTextWindow = function(textWindow) {
	var adventure = this;
	this.textWindow = textWindow;
	this.textWindow.oninput = function(text) {
		adventure.processInputText(text);
	};
};

Adventure.prototype.restartGame = function()
{
	var status = NOACTION;
	for (var index = 0 ; index < this.modules.length ; index++)
	{
		var module = this.modules[index];
		if (module.startGame) {
			var moduleStatus = module.startGame(this);
			if (typeof(moduleStatus) === 'undefined')
				continue;
			if (moduleStatus !== NOACTION && status === NOACTION)
				status = moduleStatus;
		}
	}

	if (this.textWindow.waitingForKey === false && status != WAIT) {
		this.describe(this.player.location);
		this.textWindow.print(this.currentMessage);
		this.currentMessage = "";
		this.textWindow.print("\n");
		this.textWindow.startInput();
	}
};

Adventure.prototype.flushStart = function()
{
	this.describe(this.player.location);
	this.textWindow.print(this.currentMessage);
	this.currentMessage = "";
	this.textWindow.print("\n");
	this.textWindow.startInput();
};

Adventure.prototype.startGame = function()
{
	for (var index = 0 ; index < this.modules.length ; index++)
	{
		var module = this.modules[index];
		if (module.initialize)
			module.initialize(this);
	}
	this.initialState = this.serialize();
	this.restartGame();
};

Adventure.prototype.processInputText = function(text)
{
	var result     = this.execute(text);
	var textWindow = this.textWindow;

	textWindow.print(this.currentMessage);
	this.currentMessage = "";

	switch (result)
	{
		case NOACTION:
			textWindow.print(this.processMessage("[You] can't do that.\n"));
			textWindow.print("\n");
			textWindow.startInput();
			break;
		case WAIT:
			break;
		case ASK:
			var previousPrompt = textWindow.inputPrompt;
			var previousPromptFinal = textWindow.inputPromptFinal;
			var adventure = this;
			textWindow.inputPrompt = '<r>' + this.askPrompt;
			textWindow.inputPromptFinal = '<r>' + this.askPrompt;
			textWindow.startInput(function(text) {
				var result = DONE;
				if (adventure.askCallback)
					result = adventure.askCallback(text);
				textWindow.print(adventure.currentMessage);
				adventure.currentMessage = "";
				adventure.resolveTurn(adventure.askOrder, result);
				if (result === DONE || result === NOTDONE) {
					textWindow.print("\n");
					textWindow.startInput();
				}
				textWindow.inputPrompt = previousPrompt;
				textWindow.inputPromptFinal = previousPromptFinal;
			});
			break;
		default:
			textWindow.print("\n");
			textWindow.startInput();
			break;
	}
};

Adventure.prototype.parse = function(text)
{
	var order = new Order();
	var from = 0;
	var lastKind = null;
	var nounIsSpecial = false;
	var noun = "";

	text = text.toLowerCase() + ' ';

	for (var n = 0 ; n < text.length ; n++)
	{
		var c = text.charAt(n);

		if (c == '"' || c == '\'')
		{
			from = n+1;
			while (n < text.length-1)
			{
				var next = text.charAt(++n);
				if (next == c)
					break;
			}
			order.quotedText = text.substring(from, n);
			from = n+1;
			continue;
		}
		else if (c.match(/[ .,;:?]/))
		{
			if (from == n) {
				from++;
			} else {

				var word = text.substring(from, n);
				from = n+1;

				var asWritten = word;
				if (word in this.synonyms)
					word = this.synonyms[word];
				if (!(word in this.vocabulary)) {
					console.log("Word '" + word + "' not in vocabulary; ignored");
					if (!order.unknownWords)
						order.unknownWords = 0;
					order.unknownWords++;
					lastKind = null;
					continue;
				}

				switch (this.vocabulary[word])
				{
					case 'conjuntion':
						order.conjuntion = word;
						order.conjuntionAsWritten = asWritten;
						order.remainingText = text.substring(n+1);
						break;

					case 'direction':
						order.direction = word;
						order.directionAsWritten = asWritten;
						order.remainingText = text.substring(n+1);
						break;

					case 'verb':
						if (order.verb && !order.verb2) {
							order.verb2 = word;
							order.verb2AsWritten = asWritten;
						} else if (!order.verb) {
							order.verb = word;
							order.verbAsWritten = asWritten;
						}
						break;

					case 'pronoun':
						if (order.noun && !order.noun2) {
							order.noun2 = this.lastNoun;
							order.noun2AsWritten = this.lastNounAsWritten;
						} else if (!order.noun) {
							order.noun = this.lastNoun;
							order.nounAsWritten = this.lastNounAsWritten;
						}
						break;

					case 'convertibleNoun':
						if (!order.verb) {
							order.verb = word;
							order.verbAsWritten = asWritten;
						} else if (order.noun && !order.noun2) {
							order.noun2 = word;
							order.noun2AsWritten = asWritten;
						} else if (!order.noun) {
							order.noun = word;
							order.nounAsWritten = asWritten;
							nounIsSpecial = true;
						}
						break;

					case 'noun':
						if (order.noun && !order.noun2) {
							order.noun2 = word;
							order.noun2AsWritten = asWritten;
						} else if (!order.noun) {
							order.noun = word;
							order.nounAsWritten = asWritten;
						}
						break;

					case 'specialNoun':
						if (order.noun && !order.noun2) {
							order.noun2 = word;
							order.noun2AsWritten = asWritten;
						} else if (!order.noun) {
							nounIsSpecial = true;
							order.noun = word;
							order.nounAsWritten = asWritten;
						}
						break;

					case 'preposition':
						if (!order.preposition) {
							order.preposition = word;
							order.prepositionAsWritten = asWritten;
							order.prepositionAfter = lastKind;
						}
						break;

					case 'adverb':
						if (!order.adverb) {
							order.adverb = word;
							order.adverbAsWritten = asWritten;
						}
						break;

					case 'adjective':
						if (order.noun2) {
							if (!order.adjective2) {
								order.adjective2 = word;
								order.adjective2AsWritten = asWritten;
							}
						} else if (order.noun && lastKind == 'noun') {
							if (!order.adjective) {
								order.adjective = word;
								order.adjectiveAsWritten = asWritten;
							}
						} else if (order.noun) {
							if (!order.adjective2) {
								order.adjective2 = word;
								order.adjective2AsWritten = asWritten;
							}
						} else {
							if (!order.adjective) {
								order.adjective = word;
								order.adjectiveAsWritten = asWritten;
							}
						}
						break;
				}
				if (order.conjuntion)
					break;
				lastKind = this.vocabulary[word];
			}

			if (order.adjective2 && !order.noun2) {
				order.adjective = order.adjective2;
				order.adjectiveAsWritten = order.adjective2AsWritten;
				order.adjective2 = "";
				order.adjective2AsWritten = "";
			}

			if (c == '.' || c == ',' || c == ';' || c == ':')
			{
				if (!isEmpty(order))
				{
					order.remainingText = text.substring(n+1);
					break;
				}
			}
		}
	}

	if (order.noun && nounIsSpecial === false) {
		this.lastNoun = order.noun;
		this.lastNounAsWritten = order.nounAsWritten;
	}
	if (order.noun)
		order.object = this.findObjectByNoun(order.noun, order.adjective);
	if (order.noun2)
		order.object2 = this.findObjectByNoun(order.noun2, order.adjective2);
	return order;
};

Adventure.prototype.findObjectByNoun = function(noun, adjective)
{
	var candidates = [];
	for (var key in this.objects)
	{
		var object = this.objects[key];
		if (object.noun == noun)
			candidates.push(object);
	}
	if (candidates.length == 1)
		return candidates[0];
	if (adjective !== null && candidates.length > 1)
	{
		var matches = [];
		for (var n = 0 ; n < candidates.length ; n++)
			if (candidates[n].adjective == adjective)
				matches.push(candidates[n]);
		if (matches.length == 1)
			return matches[0];
		if (matches.length > 1)
			return matches;
	}
	if (candidates.length > 1)
		return candidates;
	return null;
};

Adventure.prototype.check = function(order)
{
	for (var index = this.modules.length-1 ; index >= 0 ; index--)
	{
		var module = this.modules[index];
		if (module.conditions && !module.conditions(this))
			continue;
		if (module.check && !module.check(order, this))
			return false;
	}
	return true;
};

Adventure.prototype.resolveTurn = function(order, result)
{
	var afterResult, index;
	if (result === DONE)
	{
		for (index = this.modules.length-1 ; index >= 0 ; index--)
		{
			var module = this.modules[index];
			if (module.conditions && !module.conditions(this))
				continue;
			if (module.after) {
				afterResult = module.after(order, this);
				if (afterResult !== null && afterResult !== undefined && afterResult !== DONE) {
					result = afterResult;
					break;
				}
			}
			if (module.afterTurn) {
				afterResult = module.afterTurn(order, this);
				if (afterResult !== null && afterResult !== undefined && afterResult !== DONE) {
					result = afterResult;
					break;
				}
			}
		}
	}
	if (result === DONE)
	{
		var objectsHere = this.objectsHere();
		for (index in objectsHere)
		{
			if (objectsHere[index].afterTurn) {
				afterResult = objectsHere[index].afterTurn(order, this);
				if (afterResult !== null && afterResult !== undefined && afterResult !== DONE) {
					result = afterResult;
					break;
				}
			}
		}
	}
	if (result === DONE)
	{
		if (order && order.remainingText) {
			result = this.execute(order.remainingText);
			if (result != NOACTION)
				return result;
		}
		return DONE;
	}
	else if (result === NOTDONE)
	{
		return NOTDONE;
	}
	else if (result == WAIT)
	{
		this.waitOrder = order;
		this.remainingText = order.remainingText;
		return WAIT;
	}
	else if (result == ASK)
	{
		this.askOrder = order;
		this.remainingText = order.remainingText;
		return ASK;
	}

	console.log("Invalid turn result: " + result);
	return NOTDONE;
};

Adventure.prototype.addResponseWords = function(responses)
{
	for (var key in responses) {
		var parts = key.split(",");
		for (var p = 0 ; p < parts.length ; p++) {
			var words = parts[p].trim().split(" ");
			for (var n = 0 ; n < words.length ; n++) {
				if (this.synonyms[words[n]])
					continue;
				if (words[n] === '*' || words[n] === '_')
					continue;
				if (!(words[n] in this.vocabulary))
					this.vocabulary[words[n]] = n > 0 ? 'noun':'verb';
				else if (n === 0 && this.vocabulary[words[n]] == 'noun')
					this.vocabulary[words[n]] = 'convertibleNoun';
			}
		}
	}
};

Adventure.prototype.checkResponses = function(object, order)
{
	if (this.skipResponses)
		return NOACTION;

	var result = NOACTION;
	var nouns = [ order.noun, order.noun2 ];
	var key;
	if (object.responses) {
		for (key in object.responses) {
			var parts = key.split(",");
			for (var p = 0 ; p < parts.length ; p++) {
				var words = parts[p].trim().split(" ");
				if (words.length < 1)
					continue;
				for (var n = 0 ; n < words.length ; n++)
					if (this.synonyms[words[n]])
						words[n] = this.synonyms[words[n]];
				if (words[0] !== '*' && words[0] !== '_' && words[0] !== order.verb && words[0] !== order.direction)
					continue;
				var matches = true;
				var noun = 0;
				for (var i = 1 ; i < words.length ; i++) {
					if (words[i] !== '*' && words[i] !== '_' && (words[i] !== nouns[noun] && words[i] !== order.preposition))
						matches = false;
					if (words[i] === '_' || words[i] === '*' || words[i] === nouns[noun])
						noun++;
				}
				if (!matches)
					continue;
				switch (typeof(object.responses[key])) {
					case "string":
						result = DONE;
						if (object.responses[key].charAt(0) == '*') {
							this.message(object.responses[key].substring(1));
							result = NOTDONE;
						} else if (object.responses[key].charAt(0) == '>') {
							result = this.execute(order, object.responses[key].substring(1));
						} else if (object.responses[key].charAt(0) == '!') {
							var savedMessages = this.currentMessage;
							this.skipResponses = true;
							result = this.execute(order);
							this.skipResponses = false;
							if (result == DONE) {
								this.currentMessage = savedMessages;
								this.message(object.responses[key].substring(1));
							}
						} else {
							this.message(object.responses[key]);
						}
						break;
					case "object":
						this.message(object.responses[key][0]);
						result = object.responses[key][1];
						if (result == undefined)
							result = NOACTION;
						break;
					case "function":
						result = object.responses[key].call(object, order, this);
						if (result == undefined)
							result = NOACTION;
						break;
				}
				if (result != NOACTION)
					return result;
			}
		}
	}
	var areas = object.areas;
	var area;
	if (!areas && object.area)
		areas = object.area;
	if (areas) {
		if (typeof(areas) === "string") {
			area = this.areas[areas];
			if (area) {
				result = this.checkResponses(area, order);
				if (result != NOACTION)
					return result;
			}
		} else {
			for (key in areas) {
				area = this.areas[areas[key]];
				if (!area)
					continue;
				result = this.checkResponses(area, order);
				if (result != NOACTION)
					return result;
			}
		}
	}
	return NOACTION;
};

/** @param {Object=} changes */
Adventure.prototype.execute = function(text, changes)
{
	var result, index, module, key;
	var order = (typeof(text) == "string" ? this.parse(text) : text);
	if (changes) {
		if (typeof(changes) == "string") {
			var newOrder = this.parse(changes);
			for (key in newOrder)
				if (newOrder[key])
					order[key] = newOrder[key];
		} else {
			for (key in changes)
				order[key] = changes[key];
		}
	}
	if (isEmpty(order))
		return NOACTION;

	this.currentOrder = order;
	result = NOACTION;

	for (index = this.modules.length-1 ; index >= 0 ; index--)
	{
		module = this.modules[index];
		if (module.conditions && !module.conditions(this))
			continue;
		if (module.before)
		{
			result = module.before(order, this);
			if (result === undefined || result === null)
				result = NOACTION;
			if (result === NOTDONE)
				return NOTDONE;
		}
	}

	var location = this.findLocation(this.player.location);
	if (location && location.before) {
		result = location.before(order, this);
		if (result === undefined || result === null)
			result = NOACTION;
		if (result === NOTDONE)
			return result;
	}

	if (order.object && this.present(order.object))
	{
		if (order.object.before) {
			result = order.object.before(order, this);
			if (result === undefined || result === null)
				result = NOACTION;
			if (result === NOTDONE)
				return result;
		}
		if (order.object.execute)
			result = order.object.execute(order, this);
		if (result === NOACTION)
			result = this.checkResponses(order.object, order);
		if (result !== NOACTION)
			return this.resolveTurn(order, result);
	}

	if (location) {
		if (location.execute)
			result = location.execute(order, this);
		if (result === NOACTION)
			result = this.checkResponses(location, order);
		if (result !== NOACTION)
			return this.resolveTurn(order, result);
	}

	for (index = this.modules.length-1 ; index >= 0 ; index--)
	{
		module = this.modules[index];
		if (module.conditions && !module.conditions(this))
			continue;

		result = NOACTION;
		if (module.execute)
			result = module.execute(order, this);
		if (result === NOACTION && module.responses)
			result = this.checkResponses(module, order);
		if (result !== NOACTION)
			return this.resolveTurn(order, result);
	}
	this.remainingText = order.remainingText;
	return NOACTION;
};

/** @export */
var adventure = new Adventure();

var LRPlugin;
window.LiveReloadPluginAT = LRPlugin = (function() {
	LRPlugin.identifier = 'at';
	LRPlugin.version = '1.0';
	LRPlugin.prototype.reload = function(path, options) {
		window.localStorage.setItem("livereloadState", adventure.serializeDifferences(adventure.initialState));
		return false;
	};
});
