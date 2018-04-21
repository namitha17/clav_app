
/**
* module that handles the rst operations for log and it's statistics
*@module clav_app/syslogContent
*@requires winston
*/
const winston = require('winston');

const unLoggedLogsLogger = winston.createLogger({
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
    new winston.transports.File({ filename: './UnLoggedLogs.log' }),
  ],
});

module.exports = (opt, logdb, statsdb) => {
  const bareMinimumFormat = /^<(\d+)>/;
  const entireLogRegex = /^<(\d+)>\[(.+?)\] EFW: (\S*): prio=(\d*) id=(\d*) rev=(\d*) event=(\S+)(\s.*)?$/i;
  const dateRegex = /(\d\d\d\d)-(\d\d)-(\d\d) (\d\d):(\d\d):(\d\d)/;
  const actionRegex = /^\saction=(\S+)\s(.*)$/i;
  const sysLogModule = {

    /**
    * check if the log matches the specified format
    *@param {string} log - the log to check
    *@returns {object} regex matched object array containing the matched  groups
    *@memberof module:clav_app/syslogContent
    */
    EntireLogMatch: entireLog => entireLog.match(entireLogRegex),

    /**
    * check if the date matches the specified format
    *@param {string} possibleDate - the date to check
    *@returns {object} regex matched object array containing the matched  groups
    *@memberof module:clav_app/syslogContent
    */
    CheckDate: possibleDate => possibleDate.match(dateRegex),

    /**
    * convert a format confirmed date into ISO format
    *@param {string} confirmedDate - the date to convert
    *@returns {object} regex matched object array containing the matched  groups
    *@memberof module:clav_app/syslogContent
    */
    ConvertDate2ISO: confirmedDate => `${confirmedDate[1]}-${confirmedDate[2]}-${confirmedDate[3]}T${confirmedDate[4]}:${confirmedDate[5]}:${confirmedDate[6]}Z`,

    /**
    *the handler for incoming logs via the db socket. parses, and stores the log in the logdb.
    * also updates the statdb with statistics
    *@param {buffer} msgBuffer - the request object coming from express
    *@param {object} remote - the response object coming from express
    *@memberof module:clav_app/syslogContent
    */
    HandleIncomingLogs: (msgBuffer, remote) => {
      const { logger } = opt;

      const msg = msgBuffer.toString();
      const partOfMessage = msg.substring(0, 10);
      const bareminMatch = msg.match(bareMinimumFormat);
      if (!bareminMatch) {
        logger.error(`the incoming message ${partOfMessage}... did not match the MINIMUM format requirement!`);
        unLoggedLogsLogger.info(msg);
        statsdb.StatPlusPlus('malformed');
        return;
      }

      const thisPri = bareminMatch[1];
      logger.info(`recieved new log ${thisPri}`);

      const extractedResults = sysLogModule.EntireLogMatch(msg);
      if (!extractedResults) {
        logger.error(`the incoming message ${partOfMessage}... did not match the ENTIRE expected format!`);
        unLoggedLogsLogger.info(msg);
        statsdb.StatPlusPlus('malformed');
        return;
      }
      const [notCaring, possiblePriNotCaring, possibleDate, // eslint-disable-line no-unused-vars
        possibleEfw, possiblePrioNotCaring, possibleIdNotCaring, // eslint-disable-line no-unused-vars, max-len
        possibleRevNotCaring, possibleEvent, allOtherActions] = extractedResults;// eslint-disable-line no-unused-vars, max-len

      // possiblePri checking below

      // date checking
      const dateConfirmation = sysLogModule.CheckDate(possibleDate);
      let confirmedDate;
      if (dateConfirmation) {
        confirmedDate = sysLogModule.ConvertDate2ISO(dateConfirmation);
      } else {
        logger.error(`the incoming message ${partOfMessage}... did not match the expected DATE format!`);
        unLoggedLogsLogger.info(msg);
        statsdb.StatPlusPlus('malformed');
        return;
      }

      // all other checks goes below
      // @todo
      const payload = sysLogModule.ConstructPayload(
        confirmedDate, remote.address, possibleEfw,
        possibleEvent, allOtherActions // eslint-disable-line comma-dangle
      );

      logdb.Insert(payload)
        .then(statsdb.StatPlusPlus('received'))
        .then(statsdb.TimeUpdate(payload.time));
      logger.info('processing of this log finished');
    },

    /**
    *this function constructus the payload structure, that will later be used to insert as
    * a single row into the logdb.
    * also updates the statdb with statistics
    *@param {date} date
    *@param {string} addr
    *@param {string} efw
    *@param {string} evt
    *@param {string} [allActions]
    *@memberof module:clav_app/syslogContent
    */
    ConstructPayload: (date, addr, efw, evt, allActions) => {
      const payload = {
        time: date,
        ip: addr,
        cat: efw.toLowerCase(),
        event: evt.toLowerCase(),
        unixtime: new Date(date).getTime() / 1000,
      };
      if (allActions) {
        const isActionsPresent = allActions.match(actionRegex);
        if (isActionsPresent) {
          payload.action = isActionsPresent[1].toLowerCase(); //eslint-disable-line
          payload.message = isActionsPresent[2];//eslint-disable-line
        } else {
          payload.message = allActions;//eslint-disable-line
        }
      }
      return payload;
    },
  };

  return sysLogModule;
};
