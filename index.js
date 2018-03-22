(function() {
  'use strict';

  const hemeraPlugin = require('hemera-plugin');

  /**
   * Hemera fastify plugin
   * @param {*} hemera
   * @param {*} opts
   * @param {*} done
   */
  const hemeraFastify = (hemera, opts, done) => {
    /**
     * Call fastify
     */
    const fastify = require('fastify')(opts.fastify || {});

    /**
     * Call a method before fastify listen to specific port
     */
    if (opts.beforeStart) {
      opts.beforeStart(fastify);
    }

    /**
     * getBasePattern
     * @param {*} request
     * @param {*} basePattern
     */
    const getBasePattern = (request, basePattern) => {
      let obj = {};

      if (typeof basePattern === 'function') {
        obj = basePattern(request) || {};
      } else {
        obj = basePattern || {};
      }

      return obj;
    };

    /**
     * The request handler
     * @param {*} req
     * @param {*} reply
     */
    const handler = (req, reply) => {
      const xRequestTraceId = req.headers['x-request-trace-id'];
      const xRequestSpanId = req.headers['x-request-span-id'];

      let pattern = getBasePattern(req, opts.pattern);
      if (req.query) {
        pattern = Object.assign(pattern, req.query);
      }
      // for tracing
      if (xRequestTraceId) {
        pattern.trace$ = pattern.trace$ || {};
        pattern.trace$.traceId = xRequestTraceId;
      }
      if (xRequestSpanId) {
        pattern.trace$ = pattern.trace$ || {};
        pattern.trace$.parentSpanId = xRequestSpanId;
      }

      // URL parameter
      if (req.params.topic) {
        pattern.topic = req.params.topic;
      }
      if (req.params.cmd) {
        pattern.cmd = req.params.cmd;
      }

      if (req.body) {
        pattern = Object.assign(pattern, req.body);
      }

      /**
       * Create a response
       */
      hemera.act(pattern, (error, result) => {
        if (error) {
          // remove blacklisted keys from error message
          opts.errors.propBlacklist.forEach(key => {
            delete error[key];
          });
          const statusCode = error.statusCode || 500;

          reply.type('application/json').code(statusCode);
          reply.send({
            error
          });
        } else {
          if (typeof result !== 'string') {
            reply.type('application/json').code(200);
          } else {
            reply.type('text/html').code(200);
          }

          reply.send(result);
        }
      });
    };

    /**
     * We have to set this route, because we do not want an Client Timeout error
     */
    fastify.get('/favicon.ico', (request, reply) => {
      reply.type('image/x-icon').code(204);
      reply.send();
    });

    /**
     * Create all routes
     */
    fastify.get('/', handler);
    fastify.post('/', handler);

    fastify.get('/:topic', handler);
    fastify.post('/:topic', handler);

    fastify.get('/:topic/:cmd', handler);
    fastify.post('/:topic/:cmd', handler);

    /**
     * Start server
     */
    fastify.listen(opts.port, opts.host, err => {
      if (err) {
        throw err;
      }

      hemera.log.info(`fastify is listening on ${opts.host}:${opts.port}`);
      done();
    });

    /**
     * Set decorator for hemera
     */
    hemera.decorate('fastify', fastify);

    /**
     * Gracefully shutdown
     */
    hemera.ext('onClose', (ctx, done) => {
      fastify.close();
      hemera.log.debug('Http server closed!');
      done();
    });
  };

  /**
   * Export plugin
   */
  module.exports = hemeraPlugin(hemeraFastify, {
    hemera: '>=5.0.0-rc.1',
    name: require('./package.json').name,
    fastify: {},
    options: {
      beforeStart() {},
      port: 3000,
      host: '127.0.0.1',
      errors: {
        propBlacklist: ['stack']
      },
      pattern: {}
    }
  });
})();
