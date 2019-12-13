'use strict';
/**
 * run as: node main.js
 * NOTE: Designed for use with NodeJS and JavaScript Version ES5 and up
 * @author-Web luki4fun.net
 * @author-Twitch 0x4C554B49
 * @copyright 2019 luki4fun.net
 * @version 1.0.0
 */
// lib init
const api = require('twitch.tv-api');       // https://dev.twitch.tv/docs/
require('async');
const colors = require('colors');
const TwitchBot = require('./ressources/TwitchBot.js');

/**
 * List of Twitch Streamers you ALWAYS wanna chat "lurk" even if they are offline
 * @type {Array}
 */
const twitch_lurk = [];

/**
 * List of Twitch Categories to start overwatching
 * @type {string[]}
 */
const twitch_join_games = [
    "World of Warcraft",
];

/**
 * Data to login your the bot with oauth key
 * Generate your oauth key here: https://twitchapps.com/tmi/
 * Admin defines the Twitch user whom the bot is answering to commands like "!ping"
 * @type {{channels: *, isMaster: boolean, games: *, oAuthKey: string, ADMIN: string, id: number, login: string}[]}
 */
const twitchBotAccounts = [
    { login: 'twitch_USERNAME_BOT', oAuthKey: 'oauth:',
        channels: twitch_lurk,
        games: twitch_join_games,
        isMaster: true,  ADMIN: 'twitch_USERNAME_BOT' },    //  Admin can be a different account example: login: '0x4c554b49Bot' - ADMIN: '0x4c554b49'
];

/**
 * Data to use Twitch API
 * Create your "app" and get the id and secret here: https://dev.twitch.tv/console/apps/create
 *      !!!! two factor authentication is needed here !!!!
 * @type {Twitch}
 */
const twitchAPI = new api({
    id: "_client-id_",
    secret: "_client-secret_"
});

/**
 * STOP EDITING HERE
 *
 * and RUN the bot :D
 */




/******************************
 *      TWITCH BOT INIT
 ******************************/
let _twitchBots = [];
twitchBotAccounts.forEach(function (bot) {
    _twitchBots.push(new TwitchBot(bot.ADMIN, bot.login, bot.oAuthKey, bot.channels, bot.games, twitchAPI, 50, bot.isMaster));
});
_twitchBots.forEach(function (bot, index) {
    setTimeout(function(){
        bot.run();  // KEKW
    }, index*60000);
});
/******************************
 *      GLOBAL Functions
 ******************************/
