/**
* Main file kicking off the restapi and the syslogContent via the syslogServer module
*@requires clav_app/syslogServer
*@module clav_app
*/

const syslogServer = require('./lib/syslogServer.js');

/**
* call back function after syslog server has started
*/
function sysLogServerStarted() {
  syslogServer.logger.info("all started");
}

/**
* call back function after syslog server has stopped
*/
function sysLogServerStopped() {
  syslogServer.logger.info("shutdown complete");
  process.exit(0);
}

/**
* Block that handles cntrl-c (interrupt) signal
* after this event fires, the shutdown signal is passed on to the stop method of syslogServer
*@function on_SIGINT
*/
process.on('SIGINT', () => {
  syslogServer.logger.info("shutdown signal recieved");
  syslogServer.Stop(sysLogServerStopped);
});

syslogServer.CheckAndAssignArgs(process.argv)
  .then((parsedArgs) => {
    if (parsedArgs.showHelp) {
      syslogServer.DisplayHelp();
      process.exit(0);
    }
    return syslogServer.Start(parsedArgs.syslogPort, parsedArgs.restPort, sysLogServerStarted);
  })
  .catch((err) => {
    syslogServer.DisplayHelp(err);
    process.exit(255);
  });
