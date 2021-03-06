//Discord.io: https://izy521.gitbooks.io/discord-io/content/

var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
var funk = require('./funksjoner.js');
var kommando = require('./kommandoer.js');
var lyder = require('./lyder.js');
var konvert = require('./konverteringer.js');
var meldingsAnimasjon = require('./meldingsAnimasjon.js');
var reminders = [];
var roblxActive = [];
var messageCode = {};
var checkReminders = setInterval(function() { reminders = funk.checkLastReminder(reminders, bot, logger); }, 1000); //Sjekker hvert sekund om noen påminnelser må gjennomføres
var checkActive = setInterval(function() { funk.checkActive(bot, logger)}, 1800000); //Hver halvtime skrives det til logg om bot er aktiv
var checkRoblx = setInterval(function() { roblxActive = funk.checkroblx(bot, roblxActive) }, 5000);
var startupTime = new Date().getTime();


//configure loggersettings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, { colorize: true });
logger.level = 'debug';

//initialize Discord bot
var bot = new Discord.Client({ token: auth.token, autorun: true });

bot.on('ready', function (evt) {
    logger.info('Connected');
    try {
        funk.readReminders(logger, function(remindere) {
            logger.info('Antall lagrede påminnelser: ' + remindere.length);
            reminders = remindere;
        });

    } catch (e) {
        logger.info('Kunne ikke hente reminders');
        logger.info(e);
    }
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});

bot.on('message', function (user, userID, chID, message, evt) {
    try {
        var serverID = bot.channels[chID].guild_id;
    } catch (e) {
        if (userID != bot.id) {
          bot.sendMessage({to: chID, message: '...'});
        }
    }

    //Diverse kommandoer
    if (message.substring(0, 1) == '?' && userID != bot.id) {
        try {
            res = kommando.kommando(user, userID, chID, message, serverID, bot, logger, reminders, roblxActive, startupTime, messageCode, evt);
            reminders = res[0];
            roblxActive = res[1];
            messageCode = res[2];
        } catch (e) {
            bot.sendMessage({ to: chID, message: e });
        }
    }
    //Hvis lyder skal spilles av
    else if (message.substring(0, 1) == '+' && userID != bot.id) {
        try {
            lyder.lyder(user, userID, chID, message, serverID, bot, logger);
        } catch (e) {
            bot.sendMessage({ to: chID, message: 'error.exe launched - failed to execute order 66' });
        }

    }
    //Hvis botten har sendt en melding og skal oppdatere den:
    else if (message.substring(0,1) == "^" && userID == bot.id) {
        var messageID = evt.d.id;
        meldingsAnimasjon.handleAnimation(bot, messageID, chID, message, funk.animateMessage)
    }

    else if (message.substring(0,6) == "Pong? " && userID == bot.id) {
      var code = message.substring(6);
      var newTime = (new Date()).getTime();
      bot.editMessage({channelID: chID, messageID: evt.d.id, message: "Pong? " + ((Math.ceil(newTime - messageCode[code])) / 1000) + " sec"});
    }

    for (var i = 0; i < roblxActive.length; i++) {
        if (roblxActive[0][i] == chID && userID != bot.id) {
            funk.roblxify(userID, chID, message, bot, evt, logger);
        }
    }

    //Ser etter enheter å konvertere
    if (userID != bot.id) {
        var args = message.split(' ');
        //Går gjennom teksten på jakt etter tall
        for (var i = 0; i < (args.length - 1); i++) {
            //Blir et tall funnet, sjekker den ordet etter for enhetstype
            if (funk.isNumeric(args[i])) {
                konvert.konverter(chID, bot, args, i);
            }
        }
        var nynorsk = '# Offentleg Samferdselsbodskap frå Språkrådet #';
        for (var i = 0; i < args.length; i++) {
            switch (args[i].toLowerCase().replace(/[-,._'^*'()[\]{}]/g, '')) {
				case 'vekje':
					nynorsk += '\nvekje = veit ikkje';
					break;
                case 'korkje':
                    nynorsk += '\nkorkje = hverken';
                    break;
                case 'kjærleik':
                    nynorsk += '\nkjærleik = kjærlighet';
                    break;
                case 'hugleik':
                    nynorsk += '\nhugleik = fantasi';
                    break;
                case 'røyndom':
                    nynorsk += '\nrøyndom = virkelighet';
                    break;
                case 'olboge':
                    nynorsk += '\nolboge = albue';
                    break;
                case 'åtak':
                    nynorsk += '\nåtak = angrep';
                    break;
                case 'byrja':
                    nynorsk += '\nbyrja = begynne';
                    break;
                case 'hjå':
                    nynorsk += '\nhjå = hos';
                    break;
                case 'kvensleis':
                case 'kvenleis':
                    nynorsk += '\n' + args[i].toLowerCase().replace(/[-,._'^*'()[\]{}]/g, '') + ' = hva / hvem / når / hvor / hvorfor / hvordan';
                    break;
                case '@everyone':
                    nynorsk = '';
                    try {
                        var navn = bot.users[userID].username
                        funk.noterEveryone(userID, navn, serverID);
                    } catch (e) {
                        bot.sendMessage({ to: 406104320745013259, message: 'Feil ?noterEveryone' + e });
                    }
                    break;
            }
        }
    if (nynorsk.length > 50) {
        bot.sendMessage({to: chID, message: nynorsk});
    }
    }
});

//Hvis bot-en disconnectes, vil den prøve å reconnecte
bot.on('disconnect', function (errMsg, code) {
    bot.connect();
});
