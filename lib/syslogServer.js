
/**
* module that handles the rst operations for log and it's statistics
*@module clav_app/syslogServer
*@requires express
*@requires dgrma
*@requires winston
*@requires module:clav_app/syslogContent
*@requires module:clav_app/restapi
*@requires module:clav_app/logdb
*@requires module:clav_app/statsdb
*/

const express = require('express');
const dgram = require('dgram');
const winston = require('winston');
const syslogContent = require('./syslogContent.js');
const restapi = require('./restapi.js');
const logdb = require('./logdb.js');
const statsdb = require('./statsdb.js');

const syslogApp = dgram.createSocket('udp4');
const restapiApp = express();

const clavAppLogger = winston.createLogger({
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
    new winston.transports.File({ filename: './clavApp.log' }),
  ],
});

module.exports = {

  logger: clavAppLogger,

  /**
  *parse the command line arguments passed to the node executable
  */
  CheckAndAssignArgs: args => new Promise((resolve, reject) => {
    let syslogPortArg = 514;
    let restPortArg = 515;

    args.forEach((val, index, array) => {
      switch (val) {
        case '-s':
          if (array.length >= index + 2) {
            syslogPortArg = array[index + 1];
          } else {
            reject(new Error('syslog port missing'));
          }
          break;
        case '-r':
          if (array.length >= index + 2) {
            restPortArg = array[index + 1];
          } else {
            reject(new Error('rest api port missing'));
          }
          break;
        case '-h':
          resolve({ showHelp: true });
          break;
        default:
          // ignore all other stuff
      }
    });
    resolve({
      restPort: restPortArg,
      syslogPort: syslogPortArg,
    });
  }),

  /**
  *starts the restapi and the syslogContent
  */
  Start: (syslogPort, restPort, callback) => Promise.all([
    logdb.Init(),
    statsdb.Init(),
  ])
    .then(() => Promise.all([
      module.exports.StartSyslogContent(syslogPort),
      module.exports.StartRestApi(restPort),
    ]))
    .then(callback)
    .catch((err) => {
      throw err;
    }),

  /**
  *stops the restapi and the syslogContent
  */
  Stop: (callback) => {
    clavAppLogger.info('shutting down restapi app');
    // more code to do the shutdown here

    clavAppLogger.info('shutting down syslogContent app');
    // more code to shutdown here

    callback();
  },

  /**
  *displays the help and usage
  *@param {object} err
  */
  DisplayHelp: (err) => {
    if (err) {
      clavAppLogger.error(err.message);
    }
    clavAppLogger.info('usage ::\n [-s <port>] [-r <port>] | -h');
  },

  /**
  *starts the the syslogContent
  *@param {number} [syslogPort=514] - port to listen the syslogContent
  */
  StartSyslogContent: syslogPort => new Promise((resolve) => {
    const syslogContentRouter = syslogContent({ logger: clavAppLogger }, logdb, statsdb);

    syslogApp.on('message', syslogContentRouter.HandleIncomingLogs);
    syslogApp.bind(syslogPort, 'localhost');

    syslogApp.on('listening', () => {
      clavAppLogger.info(`syslog app started on ${syslogPort}`);
      resolve();
    });
  }),

  /**
  *starts the restapi
  *@param {number} [restPort=515] - port to run the restapi
  */
  StartRestApi: restPort => new Promise((resolve) => {
    const restapiRouter = restapi({ logger: clavAppLogger }, logdb, statsdb);
    restapiApp.get('/logs', restapiRouter.FetchLogs, (req, res) => {
      clavAppLogger.info(`fetch /logs finished with ${res.statusCode}`);
    });
    restapiApp.get('/stats', restapiRouter.FetchStats, (req, res) => {
      clavAppLogger.info(`fetch /stats finished with ${res.statusCode}`);
    });

    restapiApp.listen(restPort, () => {
      clavAppLogger.info(`restapi app started on ${restPort}`);
      resolve();
    });
  }),
};
