
/**
* module that handles entire log storing operations
*@requires nedb
*@module clav_app/logdb
*/

const Nedb = require('nedb');

let db;

module.exports = {

  /**
  *initialises and loads the database
  */
  Init: () => new Promise((resolve, reject) => {
    db = new Nedb({ filename: './logdb.json' });
    db.loadDatabase((err) => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  }),

  /**
  *fetches rows from the logdb based on the filters prescribed
  *@param {object} filter - nedb compatible filtering object
  *@param {object} [orderby] - nedb compatible object for sorting
  *@param {number} [limit=unlimited] - skim number of rows to return
  *@returns {Promise} a promised array of rows
  */
  Select: (filter, orderby, limit) => new Promise((resolve, reject) => {
    db.find(filter).sort(orderby).limit(limit).exec((err, logs) => {
      if (err) {
        reject(err);
      }

      resolve(logs);
    });
  }),

  /**
  *inserts rows into the logdb
  *@param {object} logs - a rwo to insert
  *@returns {Promise} a promised array of newly inserted rows
  */
  Insert: logs => new Promise((resolve, reject) => {
    db.insert(logs, (err, newLog) => {
      if (err) {
        reject(err);
      }

      resolve(newLog);
    });
  }),

};
