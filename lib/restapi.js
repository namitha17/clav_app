
/**
* module that handles the rst operations for log and it's statistics
*@module clav_app/restapi
*/
module.exports = (opt, logdb, statsdb) => {
  const HTTP_BAD_REQUEST = 400;
  const HTTP_INTERNAL_SERVER_ERROR = 500;
  const HTTP_OK = 200;
  const ISODATEFORMAT = /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\dZ$/;
  const IPADDRFORMAT = /^((?:(?:25[0-5])|(?:2[0-4][0-9])|(?:1[0-9][0-9])|(?:[1-9][0-9])|(?:[0-9]))\.){3}((?:(?:25[0-5])|(?:2[0-4][0-9])|(?:1[0-9][0-9])|(?:[1-9][0-9])|(?:[0-9])))$/;

  const restApiMOdule = {

    /**
    *Check whther the ip is in a correct formata
    *@param {string} ip - the ip to check
    *@returns {object} regex matched object array containing the matched  groups
    *@memberof module:clav_app/restapi
    */
    CheckIP: ip => ip.match(IPADDRFORMAT),

    /**
    *Parses the query from the url to a nedb compatible filter format
    *@param {object} query - the incoming query object, can be the express req.query object too
    *@param {number} [query.num=20] - the number of rows to limit
    *@param {date} [query.startTime=no filtering] - the startTime of the logs,
    *                                                   filters by greater than
    *@param {date} [query.endTime=no filtering] - the endTime of the logs, filters by less than
    *@param {string} [query.ip=no filtering] - the ip address (dot format) for filtering logs
    *@param {string} [query.cat=no filtering] - the category for filtering logs
    *@param {string} [query.event=no filtering] - the event for filtering logs
    *@param {string} [query.action=no filtering] - the action for filtering logs
    *@returns {object} filter object with nedb compatible filter format,
                      the limit parameter will have to be removed before applying the filter
    *@memberof module:clav_app/restapi
    */
    QueryParse2Filter: (query) => {
      let { num, startTime, endTime, ip, cat, event, action } = query;  //eslint-disable-line
      const filter = {};

      if (num && isNaN(num)) throw new Error('num parameter should be a number');//eslint-disable-line
      if (!num) {
        num = 20;
      }

      filter.limit = num;

      if (startTime && !startTime.match(ISODATEFORMAT)) throw new Error('startDate should be in ISO format!');
      if (startTime) {
        if (!filter.unixtime) filter.unixtime = {};
        filter.unixtime.$gt = new Date(startTime).getTime() / 1000;
      }

      if (endTime && !endTime.match(ISODATEFORMAT)) throw new Error('endTime should be in ISO format!');
      if (endTime) {
        if (!filter.unixtime) filter.unixtime = {};
        filter.unixtime.$lt = new Date(endTime).getTime() / 1000;
      }

      if (ip && !restApiMOdule.CheckIP(ip)) throw new Error('ip should be in valid format!');
      if (ip) {
        filter.ip = ip;
      }

      if (cat && !cat.match(/\S+/)) throw new Error('cat should be in valid format!');
      if (cat) {
        filter.cat = cat.toLowerCase();
      }

      if (event && !event.match(/\S+/)) throw new Error('event should be in valid format!');
      if (event) {
        filter.event = event.toLowerCase();
      }

      if (action && !action.match(/\S+/)) throw new Error('action should be in valid format!');
      if (action) {
        filter.action = action.toLowerCase();
      }

      return filter;  //eslint-disable-line
    },

    /**
    *Route handler for /logs, fetches the list of logs based on the url parameters passed
    *@param {string} req - the request object coming from express
    *@param {string} res - the response object coming from express
    *@param {string} req - the callback function for other middlewares
    *@memberof module:clav_app/restapi
    */
    FetchLogs: (req, res, next) => {  //eslint-disable-line
      let filter = {};

      try {
        filter = restApiMOdule.QueryParse2Filter(req.query);
      } catch (err) {
        res.status(HTTP_BAD_REQUEST).send({ err: err.message });
        return next();
      }
      const { limit } = filter;
      delete filter.limit;
      logdb.Select(filter, { time: -1 }, limit)
        .then((logs) => {
          res.status(HTTP_OK).send(logs);
          return next();
        })
        .catch((err) => {
          res.status(HTTP_INTERNAL_SERVER_ERROR).send({ err: err.message });
          return next();
        });
    },

    /**
    *Route handler for /stats, fetches the statistics of the logs stored
    *@param {string} req - the request object coming from express
    *@param {string} res - the response object coming from express
    *@param {string} req - the callback function for other middlewares
    *@memberof module:clav_app/restapi
    */
    FetchStats: (req, res, next) => {
      statsdb.FetchAllStats()
        .then((allStats) => {
          if (!allStats || allStats.length !== statsdb.INITSTATS.length) {
            res.status(HTTP_INTERNAL_SERVER_ERROR).send({ err: 'Could not fetch all statistics' });
            return next();
          }
          const result = {};
          allStats.forEach((stat) => {
            result[stat.key] = stat.value;
          });
          res.status(HTTP_OK).send(result);
          return next();
        })
        .catch((err) => {
          res.status(HTTP_INTERNAL_SERVER_ERROR).send({ err: err.message });
          return next();
        });
    },
  };

  return restApiMOdule;
};
