'use strict';
/**
 * Twitch Bot Class
 * NOTE: Designed for use with NodeJS and JavaScript Version ES5 and up
 * This Class sets functionality of Twitch Bots
 * @author-Web luki4fun.net
 * @author-Twitch 0x4C554B49
 * @copyright 2019 luki4fun.net
 * @version 1.0.0
 */
const Bot = require('./Bot.js');
const tmi = require('tmi.js');              // http://tmi.twitch.tv/group/user/goldgoblin/chatters
const Twitch = require('twitch-js');        // https://twitch-devs.github.io/twitch-js/docs/getting-started
const prefix = ("[Twitch] [%s] ").magenta;

const sprintf = require('sprintf-js').sprintf,
    vsprintf = require('sprintf-js').vsprintf;
const in_array = require('in_array');
const request = require('request');

/**
 *
 */
class TwitchBot extends Bot{
    /**
     *
     * @param ADMIN
     * @param login
     * @param oAuthKey
     * @param channels
     * @param games
     * @param twitchAPI
     * @param viewer_min
     * @param isMaster
     */
    constructor (ADMIN, login, oAuthKey, channels, games, twitchAPI, viewer_min = 50, isMaster = false){
        super(prefix, login);
        this.ADMIN = ADMIN;             // potential hardcoded SUPER ADMIN User
        this.oAuthKey = oAuthKey;
        this.channels = channels;
        this.defaultLurk = channels;
        this.isMaster = isMaster;       // can used to handle master & slave bots when multiple bots are located in one channel
        this.twitchAPI = twitchAPI;

        this.games = games;
        this.logHandler = {
            lastLogID: 0,
            newEntries: [],
            newMessages: []
        };

        this._bot = {};
        this.connectedChannel = [];
        this.tmpChannelList = [];
        this.dataCollector = [];
        this.tickRunning = false;
        this.tickDone = true;
        this.tickExit = false;
        this.allowExit = false; // allow exit in offline streams (bugging from time to time cause of Twitch IRC settings)
        this.autoJoin = false;  // adding games to the current list of overwatched games
        this.viewer_min = viewer_min;
    }

    /**
     *  connecting bot and starting backend ticks
     */
    connect(){
        console.log(sprintf(prefix, this._bot.username) + "Bot connected");
        if(!this.tickRunning){
            this.tick("update_channel", 60000);
            this.startedTime = this.getCurTime();
        }
    }

    /**
     *  sending Messages
     * @param channel
     * @param message
     * @returns {Promise<void>}
     */
    async say(channel, message){
        this._bot.say(channel, message);
    }
    /**
     *  getting and hanling of chat messages
     * @param channel
     * @param user
     * @param message
     */
    chat(channel, user, message){
        let _channel = channel.substr(1, channel.length); // removing the '#' from channel name
        let _self = this;
        let sender;

        if (message.toLowerCase().includes(_self.login.toLowerCase())) {
            console.log(" => " + "MESSAGE".green + " AT " + channel.yellow + " FROM @" + user.username.yellow + ": " + message.red);
        }

        if(user.username === this.ADMIN && this.isMaster) {
            sender = "!login";
            if (message === sender) {
                this._bot.say(channel, 'Login as: ' + this.login);
            }
            sender = "!info";
            if (message.includes(sender)) {
                let ch = message.split(" ")[1];
                if (ch === undefined) {
                    ch = _channel;
                }
                console.log(ch);
                this.twitchAPI.getUser(ch).then(data => {
                    console.log(data);
                }).catch(error => {
                    console.log(error);
                });
            }
            sender = "!tellConnected";
            if (message === sender) {
                console.log(this.connectedChannel);
            }
           sender = "!disconnect";
            if (message === sender) {
                this._bot.disconnect();
                this.tickExit = true;
                console.log("[" + this.login + "]" + " " + "disconnected ".red);
            }
            sender = "!isconnectedto";
            if (message.includes(sender)) {
                let username = message.split(" ")[1];
                if (in_array(username, this.connectedChannel))
                    console.log("[" + this.login + "]" + " " + "IS connected ".green + "to the channel " + username.yellow);
                else
                    console.log("[" + this.login + "]" + " " + "IS NOT connected ".red + "to the channel " + username.yellow);
            }
            sender = "!join";
            if (message.includes(sender)) {
                let username = message.split(" ")[1];
                console.log("[" + this.login + "]" + " " + " joining ".green + "to the channel " + username.yellow);
                let newChannel = [username];
                this.channelConnect(newChannel);
            }
            sender = "!tellGames";
            if (sender === message){
                for(let i in this.games){
                    console.log("[" + this.login + "]" + " plays " + this.games[i].red);
                }
            }
            sender = "!switchExitMode";
            if (sender === message){
                this.allowExit = !this.allowExit;
            }
        }
        if(user.username === this.ADMIN) {
            sender = "!doReconnect";
            if (message === sender) {
                this.doReconnect();
            }
            sender = "!ping";
            if (message === sender) {
                this._bot.say(channel, "pong!");
            }
        }
    }

    /**
     * try to reconnect
     * @returns {Promise<void>}
     */
    async doReconnect(){
        let connectedChannel = this.connectedChannel;
        for(let i in connectedChannel){
            if(!in_array(connectedChannel[i], this.defaultLurk)) {
                this.channelDC(connectedChannel[i]);
            }
        }
    }
    /**
     * disconnect from channel
     * @param channel
     */
    async channelDC(channel){
        this._bot.part(channel);
        let element = this.connectedChannel.indexOf(channel);
        if (element !== undefined && element !== -1) {
            this.connectedChannel.splice(element, 1);
            console.log("[" + this.login + "]" + " NOTICE: Exited Channel " + channel.yellow +
                "[ " + this.dataCollector[channel]['data']['stream_type'] + " - " + this.dataCollector[channel]['data']['viewer_count'] + " ]");
        }
    }
    /**
     * connect to channel list
     * @param channelList
     */
    channelConnect(channelList){
        Promise.all(channelList.map(channel => this._bot.join(channel))).then(
            _channel => {
                /** no output here! **/
            }).catch(
            err => {
                /**
                 * output has no relevant data
                 * console.log("[" + _self.login + "] " + err);
                 */
            });

    }

    /**
     * refresh channels
     * exit / adding channels
     */
    async channelRefresh(){
        let _self = this;
        // remove offline stream
        this.connectedChannel.forEach(function(channel){
            if(!in_array("#" + channel, _self.defaultLurk) && _self.dataCollector[channel] !== undefined) {
                if (!in_array(channel, _self.tmpChannelList)) {
                    if (_self.dataCollector[channel]['counter']['exit'] > 24) {  // 2h => 24*300.000 timeout | 24*5min
                        if (_self.allowExit) {
                            _self.channelDC(channel);
                        }
                    }
                    _self.dataCollector[channel]['counter']['exit']++;
                } else {
                    _self.dataCollector[channel]['counter']['exit'] = 0;
                }
            }
        });
        // add missing stream
        let newChannel = [];
        this.tmpChannelList.forEach(function(channel, index){
            if(_self.dataCollector[channel]['counter'] === undefined || _self.dataCollector[channel]['counter']['exit'] === undefined){
                console.log(channel);
            }
            if(!in_array(channel, _self.connectedChannel)) {
                _self.dataCollector[channel]['counter']['exit'] = 0;
                newChannel.push(channel);
            } else {
                if(_self.dataCollector[channel]['data']['reconnect_time'] <= _self.getCurTime()){
                    newChannel.push(channel);
                    _self.dataCollector[channel]['data']['reconnect_time'] = _self.getCurTime()+(60*(1/2)*1000);
                }
            }
        });

        if(newChannel.length > 0){
            this.channelConnect(newChannel);
        }
        this.tickDone = true;
    }

    /**
     * backend tick handler
     * @param type
     * @param ratio
     * @param tickNo
     * @returns {Promise<void>}
     */
    async tick(type, ratio = 6000, tickNo = 0){
        let _self = this;
        if(this.tickExit){
            console.log("Tick Exit (" + tickNo + ")");
        } else {
            this.tickRunning = true;
            if (this.tickDone || true) {
                this.tickDone = false;
                switch (type) {
                    case "update_channel":
                        if (tickNo === 0) {
                            ratio = 10000;
                        } else if (tickNo === 1) {
                            ratio = 300000;
                        } else {
                            ratio = 600000;
                        }

                        this.channelRefresh();
                        this.tmpChannelList = [];

                        for (let id in this.games) {
                            this.refresh(this.games[id]);
                        }
                        break;
                    default:
                        console.log("Tick Error on " + type + " at ratio " + ratio);
                }
            }
            setTimeout(function () {
                tickNo++;
                _self.tick(type, ratio, tickNo);
            }, ratio);
        }
    }

    /**
     * get and add streams by given game/category
     * @param game
     * @returns {Promise<void>}
     */
    async refresh(game){
        let _self = this;
        this.twitchAPI.getUsersByGame(game).then(data => {
            if(data.streams !== undefined) {
                data.streams.forEach(function (stream) {
                    let blacklist = ["0x4c554b49"];
                    if(in_array(stream.channel.name, blacklist)){

                    } else {
                        if (stream.viewers >= _self.viewer_min && stream.stream_type === 'live') {
                            _self.tmpChannelList.push(stream.channel.name);
                            // init stream
                            if (_self.dataCollector[stream.channel.name] === undefined) {
                                _self.initDefaults(stream.channel.name);
                            } else {
                                // change game
                                if (_self.dataCollector[stream.channel.name]['data']['current_game_name'] !== stream.channel.game.toLowerCase()) {
                                    console.log("[" + _self.login + "]" + " NOTICE: Channel " + stream.channel.name.yellow + " NOW PLAYING " + stream.channel.game.red);
                                }
                            }
                        }
                        if (_self.dataCollector[stream.channel.name] !== undefined) {
                            // update stream info
                            _self.dataCollector[stream.channel.name]['data']['current_game_name'] = stream.channel.game.toLowerCase();

                            _self.dataCollector[stream.channel.name]['data']['current_game_name'] = stream.channel.game.toLowerCase();
                            _self.dataCollector[stream.channel.name]['data']['viewer_count'] = stream.viewers;
                            _self.dataCollector[stream.channel.name]['data']['stream_type'] = stream.stream_type;
                            _self.dataCollector[stream.channel.name]['data']['reconnect_time'] = _self.getCurTime() + (60 * (1 / 2) * 1000);
                            if (!in_array(stream.channel.game, _self.games) && stream.channel.game !== "" && _self.autoJoin) {
                                _self.games.push(stream.channel.game);
                                console.log("[" + _self.login + "]" + " NOTICE: Adding " + stream.channel.game.red);
                            }
                        }
                    }
                });
            }
        }).catch(error => {
            console.log("[" + this.login + "]" + " NOTICE: REFRESH ERROR ON " + game.yellow);
        });
    }

    /**
     * init data collector for given channel
     * @param channel
     */
    initDefaults(channel){
        this.dataCollector[channel] = [];
        this.dataCollector[channel]['data'] = [];
        this.dataCollector[channel]['timer'] = [];
        this.dataCollector[channel]['user'] = [];
        this.dataCollector[channel]['counter'] = [];
        this.dataCollector[channel]['counter']['msg'] = [];
        this.dataCollector[channel]['counter']['exit'] = 0;
    }
    /**
     * async run the bot
     * @returns {Promise<void>}
     */
    async run(){
        let _self = this;
        this._bot = new Twitch.client({
             options: { debug: false, clientId: this.login },
             connection: { cluster: "aws", reconnect: true },
             identity: { username: this.login, password: this.oAuthKey },
             channels: this.channels
        });
        this._bot.connect();

        this._bot.on('connected', function () {
            _self.connect();
        });
        this._bot.on('chat', function (channel, user, message, self) {
            _self.chat(channel, user, message);
        });
        this._bot.on('join', function(channel){
            let _channel = channel.substr(1, channel.length); // removing the '#' from channel name
            if(!in_array(_channel, _self.connectedChannel)){
                _self.connectedChannel.push(_channel);
                _self.initDefaults(_channel);
                console.log("[" + _self.login + "]" + " NOTICE: Join Channel " + channel.yellow + "");
            }
        });
    }

    /**
     *
     * @returns {*}
     */
    getAdmin(){
        return this.ADMIN;
    }

    /**
     *
     * @returns {Array}
     */
    getNewEntries(){
        let newEntries = this.logHandler.newEntries;
        this.logHandler.newEntries = [];
        return newEntries;
    }

    /**
     *
     * @returns {Array}
     */
    getNewMessages(){
        let newMessages = this.logHandler.newMessages;
        this.logHandler.newMessages = [];
        return newMessages;
    }
}
module.exports = TwitchBot;
