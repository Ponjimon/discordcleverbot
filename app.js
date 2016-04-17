var Cleverbot = require('cleverbot-node');
var DiscordClient = require('discord.io');
var fs = require('fs');

var DiscordCleverBot = function(opts) {
	this.opts = opts || {};
	if (!(opts.token)) {
			 throw "No credentials given. Aborting.";
	 }

	 this.clevbot = new Cleverbot;

	 this.messagePool = [];
	 this.sendingMessage = false;
	 this.connectedFirstTime = false;
	 this.open();

};

DiscordCleverBot.prototype.open = function(reconnected) {
	var self = this;

	this.bot = new DiscordClient({
			autorun: true,
			token: self.opts.token
	});

	this.bot.on('ready', function(rawEvent) {
		self.connectedFirstTime=true;
	    console.log(self.bot.username + " - (" + self.bot.id + ")");
			if(self.reconnectInterval) {
				clearInterval(self.reconnectInterval);
			}
			self.sendMessageInterval();
			if(self.opts.avatar) {
				self.bot.editUserInfo({
					avatar: fs.readFileSync(self.opts.avatar, 'base64')
				});
			}

			var startMessage = self.opts.startMessage || 'Hello world!';
			self.bot.getMessages({
				channel: self.opts.channelID,
				limit: 1
			}, function(error, messages) {
				if(error) console.log(error);
				if(messages.length > 0 && !self.opts.forceStart) {
					if(self.isWaitingFor(messages[0].author.id)) {
						console.log(self.bot.username + ' should start...');
						self.sendMessage(self.opts.channelID, messages[0].content);
					}
				}else if(self.opts.start || self.opts.forceStart){
					self.sendMessage(self.opts.channelID,startMessage, true);
				}
			});
	});

	this.bot.on('disconnected', function() {
		if(self.connectedFirstTime === false) {
			throw new Error('We got disconnected. Did you provide the correct token in the config?');
		}
		console.error(self.bot.username + ' got disconnected! D: Trying to reconnect...');
		self.reconnect();
	});

	this.bot.on('debug', function(rawEvent) {
		//console.log('------- DEBUG ' +  self.bot.username + '-------');
		//console.log(rawEvent);
	});

	this.bot.on('message', function(user, userID, channelID, message, rawEvent) {
		self.onmessage(user, userID, channelID, message, rawEvent);
	});
};

DiscordCleverBot.prototype.reconnect = function() {
	var self = this;
	clearInterval(self.idleInterval);
	this.reconnectInterval = setInterval(function() {
		console.log("Trying to reconnect " + self.bot.username + "...");
		self.open(true);
	},1000);
}

DiscordCleverBot.prototype.isWaitingFor = function(userID) {
	var waitFor = this.opts.waitFor;
	if(waitFor.indexOf(userID) > -1) return true;
	return false;
}

DiscordCleverBot.prototype.sendMessageInterval = function(channelID) {
	var self = this;
	this.idleInterval = setInterval(function() {
		console.log("Starting message interval for " + self.bot.username);
		self.bot.getMessages({
			channel: self.opts.channelID,
			limit: 1
		}, function(error, messages) {
			if(error) {
				console.log('ERROR: ' + error.message + ' (' + error.statusCode + ', ' + error.statusMessage + ')');
				console.log('Waiting for next tick...');
				return;
			}
			if(messages.length > 0) {
				if(self.isWaitingFor(messages[0].author.id)) {
					if((Date.now() - (new Date(messages[0].timestamp))) >= 60000) {
						console.log(self.bot.username + ' had delay >1m');
						self.sendMessage(self.opts.channelID, messages[0].content);
					}
				}
			}
		});
	},60000);
}

DiscordCleverBot.prototype.pickRandomMessage = function() {
	var randomIndex = Math.floor(Math.random() * ((this.messagePool.length-1) - 0 + 1) + 0);
	return { index: randomIndex, message: this.messagePool[randomIndex] };
}

DiscordCleverBot.prototype.onmessage = function(user, userID, channelID, message, rawEvent) {
	if(channelID == this.opts.channelID && this.bot.id != userID) {
		this.messagePool.push({ userID: userID, message: message });
		if(this.isWaitingFor(userID)) this.sendMessage(channelID, message);
	}
}

DiscordCleverBot.prototype.timeToRespond = function() {
		const low = 1000;
		const high = 5000;
    return Math.floor(Math.random() * (high - low + 1) + low);
}

DiscordCleverBot.prototype.sendMessage = function(channelID, message, sendDirectly) {
	this.sendingMessage = true;
	sendDirectly = sendDirectly || false;
	if(message !== undefined) {
		var randomMessage = {message: { message: message}};
	}else{
		var randomMessage = this.pickRandomMessage();
	}
	var self = this;
	self.messagePool = [];
	Cleverbot.prepare(function() {
		self.clevbot.write(randomMessage.message.message, function(response) {
			self.bot.simulateTyping(channelID, function() {
				setTimeout(function() {
					var messageToSend = '';
					sendDirectly ? messageToSend = message : messageToSend = response.message;
					self.bot.sendMessage({
						to: channelID,
						message: messageToSend,
						typing: true
					});

					self.sendingMessage = false;
				},self.timeToRespond());
			});
		});
	});
}

DiscordCleverBot.prototype.sendRandomMessage = function(channelID) {
	Cleverbot.prepare(function() {
		self.clevbot.write('Completely random', function(response) {
			self.bot.simulateTyping(channelID, function() {
				setTimeout(function() {
					self.bot.sendMessage({
						to: channelID,
						message: response.message,
						typing: true
					});

					self.sendingMessage = false;
				},self.timeToRespond());
			});
		});
	});
}

module.exports = DiscordCleverBot;
