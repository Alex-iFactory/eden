#!/usr/bin/env node

// Require environment
require('./lib/env');

// Require dependencies
const os      = require('os');
const cluster = require('cluster');
const winston = require('winston');

// Require local dependencies
const log    = require('lib/utilities/log');
const config = require('config');

/**
 * Create App class
 */
class App {
  /**
   * Construct App class
   */
  constructor() {
    // Bind private variables
    this._master = cluster.isMaster;
    this._logger = false;
    this._workers = {};

    // Bind public methods
    this.run = this.run.bind(this);
    this.exit = this.exit.bind(this);
    this.spawn = this.spawn.bind(this);
    this.logger = this.logger.bind(this);
    this.children = this.children.bind(this);

    // Build logger
    this.logger();

    // Spawn children
    if (this._master) {
      this.children();
    } else {
      this.run();
    }
  }

  /**
   * Runs Eden
   */
  run() {
    // Load eden
    const eden = require('eden'); // eslint-disable-line global-require

    // Log spawning threads
    this._logger.log('info', `Spawned new "${process.env.thread}" thread`, {
      class : 'Eden',
    });

    // Run single Eden instance
    eden.start({
      id     : process.env.id,
      port   : parseInt(process.env.port, 10),
      host   : process.env.host,
      logger : this._logger,
      thread : process.env.thread,
    });
  }

  /**
   * On cluster worker exit
   *
   * @param {object} worker
   */
  exit(worker) {
    // Set id
    const { id, thread } = worker.process.env;

    // Spawn new thread
    this.spawn(parseInt(id, 10), thread, (parseInt(config.get('port'), 10) + parseInt(id, 10)));
  }

  /**
   * Spawns new App thread
   *
   * @param {number} id
   * @param {String} thread
   * @param {number} port
   */
  spawn(id, thread, port = null) {
    // Clone environment and set thread id
    const env = {
      ...process.env,

      id,
      thread,
    };

    // Set if port
    if (port !== null) {
      env.port = port;
    }

    // Fork new thread
    this._workers[`${thread}:${id}`] = cluster.fork(env);
    this._workers[`${thread}:${id}`].process.env = env;
  }

  /**
   * Builds logger
   */
  logger() {
    // Set logger
    this._logger = winston.createLogger({
      level      : config.get('logLevel') || 'info',
      format     : log,
      transports : [
        new winston.transports.Console(),
      ],
    });
  }

  /**
   * Spawns child processes
   */
  children() {
    // Log running Eden
    this._logger.log('info', 'Running Eden', {
      class : 'Eden',
    });

    // Set process name
    try {
      // Set process name
      process.title = `edenjs - ${config.get('domain')} - master`;
    } catch (e) { /* */ }

    // spawn threads
    (config.get('threads') || ['front', 'back']).forEach((thread) => {
      // check count
      for (let i = 0; i < (config.get('count') || 1); i += 1) {
        this.spawn(i, thread, (config.get('router') || thread === 'front') ? (parseInt(config.get('port'), 10) + i) : null);
      }
    });

    // On cluster exit
    cluster.on('exit', this.exit);
  }
}

/**
 * Export Eden App class
 *
 * @type {App}
 */
module.exports = App;
