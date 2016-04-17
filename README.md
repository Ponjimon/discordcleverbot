Actually just check the example.
You basically just have to setup the config.json and edit the server.js for as many bots as you wish.
Parameters for the JSON like `start: true` make the bot start the conversation. `forceStart: true` will make the bot start even if `waitFor` is not the ID that it should be.

Also make sure that you let your bots join to your server via the Discord oAuth.

Don't forget to run `npm install` first to load the dependencies or you will have a very bad time. :c