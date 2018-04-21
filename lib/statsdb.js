

/**
* module that handles entire statistics storing operations
*@requires nedb
*@module clav_app/statsdb
*/
const Nedb = require('nedb');

let db;

module.exports = {
  /**
  *property storing the mode that determines whether the "first" log time has to be recorded or not
  */
  INITIAL_MODE: true,

  /**
  *property storing the initial values of the statistics db
  */
  INITSTATS: [
    { key: 'received', value: 0 },
    { key: 'malformed', value: 0 },
    { key: 'first', value: '1900-01-01T00:00:00Z' },
    { key: 'last', value: '1900-01-01T00:00:00Z' },
  ],

  /**
  *initialises and loads the database. after loading, a check is done to see if the number of
  * statistics stored is in sync with the required ones (comparing it with INITSTATS array).
  * if a mismatch is found, then delete the entire db, and then rewrite it again with INITSTATS
  *@returns {Promise}
  */
  Init: () => new Promise((resolve, reject) => {
    db = new Nedb({ filename: './statsdb.json' });
    db.loadDatabase((err) => {
      if (err) {
        return reject(err);
      }

      module.exports.FetchAllStats()
        .then((allStats) => {
          if (!allStats || allStats.length !== module.exports.INITSTATS.length) {
            module.exports.InitialiseAllStats()
              .then(() => {
                resolve();
              })
              .catch((errInitialise) => {
                reject(errInitialise);
              });
          }
          return resolve();
        })
        .catch((errFetch) => {
          reject(errFetch);
        });

      return resolve();
    });
  }),

  /**
  * Insert a single statistics parameter into the databse
  *@returns {Promise}
  */
  InsertStats: (param, value) => new Promise((resolve, reject) => {
    const payload = {};
    payload[param] = value;
    db.insert(payload, (err) => {
      if (err) {
        return reject(err);
      }

      return resolve();
    });
  }),

  /**
  *fetches the entire list of statistics parameters defined in the db
  * later, the consumer will have to convert this into a more useful key-value array format
  *@returns {Promise}
  */
  FetchAllStats: () => new Promise((resolve, reject) => {
    db.find({}, (err, stats) => {
      if (err) {
        return reject(err);
      }

      return resolve(stats);
    });
  }),

  /**
  *delete and rewrite the entire db with INITSTATS
  *@returns {Promise}
  */
  InitialiseAllStats: () => module.exports.DeleteAllStats()
    .then(() => new Promise((resolve, reject) => {
      db.insert(module.exports.INITSTATS, (err) => {
        if (err) {
          return reject(err);
        }

        return resolve();
      });
    })),

  /**
  *deletes all rows in the db
  *@returns {Promise}
  */
  DeleteAllStats: () => new Promise((resolve, reject) => {
    db.remove({}, { multi: true }, (err) => {
      if (err) {
        return reject(err);
      }

      return resolve();
    });
  }),

  /**
  *increments the given statistics parameter by 1. used for recording "recieved"
  *and "malformed" params
  *@param {string} param - the name of the parameter to increment numerically by 1
  *@returns {Promise}
  */
  StatPlusPlus: param => new Promise((resolve, reject) => {
    db.find({ key: param }, (err, stat) => {
      if (err) {
        return reject(err);
      }
      if (stat.length !== 1) {
        return reject(new Error(`unexpected statsdb row for ${param} found!`));
      }
      return resolve(stat[0].value);
    });
  })
    .then(numStats => new Promise((resolve, reject) => {
      let newValue = Number(numStats);
      newValue += 1;
      db.update({ key: param }, { $set: { value: newValue } }, {}, (err) => {
        if (err) {
          return reject(err);
        }
        return resolve();
      });
    })),

  /**
  *updates the time statistics, as soon a imcoming log is processed successfully
  *"last" is always updated if sucessfull storing of a log
  *"first" is updated only if INITIAL_MODE is true
  *@param {date} time - the time parsed out from the incoming log
  *@returns {Promise}
  */
  TimeUpdate: time => new Promise((resolve, reject) => {
    const thingsToUpdate = ['last'];
    if (module.exports.INITIAL_MODE) {
      module.exports.INITIAL_MODE = false;
      thingsToUpdate.push('first');
    }
    db.update({ key: { $in: thingsToUpdate } }, { $set: { value: time } }, {}, (err) => {
      if (err) {
        return reject(err);
      }
      return resolve();
    });
  }),
};
