'use strict';
/**
 * Bot main Class
 * NOTE: Designed for use with NodeJS and JavaScript Version ES5 and up
 * This Class sets global functionality for different bot types (Twitch, Discord, Mixer ...)
 * @author-Web luki4fun.net
 * @author-Twitch 0x4C554B49
 * @copyright 2019 luki4fun.net
 * @version 1.0.0
 */
const sprintf = require('sprintf-js').sprintf,
    vsprintf = require('sprintf-js').vsprintf;

class Bot {
    /**
     * @param prefix
     * @param login
     */
    constructor(prefix = "BOT", login = "none"){
        this.debug = false;
        this.login = login;
        this.prefix = prefix;
    }

    /**
     * the prefix defines the platform the bot is running at
     * @param prefix
     */
    setPrefix(prefix){
        this.prefix = prefix;
    }

    /**
     * get the current prefix
     * @returns {string}
     */
    getPrefix(){
        return this.prefix;
    }

    /**
     * switching boolean for debug information
     */
    switchDebug(){
        this.debug = !this.debug;
    }

    /**
     * set login/username for the bot account
     * @param login
     */
    setLogin(login){
        this.login = login;
    }

    /**
     * get login/username of the bot account
     * @returns {string}
     */
    getLogin(){
        return this.login;
    }

    /**
     * get the current Time as integer
     * @returns {number}
     */
    getCurTime(){
        return Math.floor(new Date() / 1000);
    }

    /**
     * sleep function
     * @param ms
     * @returns {Promise<unknown>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * generate hash sum of a specific String
     * @param str
     * @returns {number}
     */
    
    hashCode (str){
        var hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            let char = str.charCodeAt(i);
            hash = ((hash<<5)-hash)+char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }
}
module.exports = Bot;
