# Hemera-fastify

[![npm](https://img.shields.io/npm/v/hemera-fastify.svg?maxAge=3600)](https://www.npmjs.com/package/hemera-fastify)

Copied from [hemera-web](https://github.com/hemerajs/hemera/tree/master/packages/hemera-web) and switched from express 4 to fastify.
Also I've kicked out some dependencies.

> Under development


## Example

```javascript
const Hemera = require('nats-hemera');
const HemeraJoi = require('hemera-joi');
const hemeraWeb = require('../hemera-fastify/index');
const nats = require('nats').connect({
  url: 'nats://0.0.0.0:4222'
});
const hemera = new Hemera(nats, {
  logLevel: 'info'
});
const CustomError = hemera.createError('CustomError');

hemera.use(hemeraWeb, {
  // set fastify config
  fastify: {},
  beforeStart(fastify) {
    // Add own content parser
    fastify.addContentTypeParser('text/html', (req, done) => {
      var body = '';
      req.on('data', data => {
        body += data;
      });
      req.on('end', () => {
        try {
          done(null, body);
        } catch (e) {
          done(e);
        }
      });
      req.on('error', done);
    });
  },
  port: 3000,
  host: '127.0.0.1',
  pattern: {
    topic: 'math',
    cmd: 'add'
  }
});

const start = async () => {
  try {
    // establish connection and bootstrap hemera
    await hemera.ready();

    hemera.add(
      {
        topic: 'math',
        cmd: 'add'
      },
      (req, cb) => {
        cb(null, `<h1>${parseInt(req.a) + parseInt(req.b)}</h1>`);

        // cb(null, {
        //     result: parseInt(req.a) + parseInt(req.b)
        // });

        // const error = new CustomError()
        // error.statusCode = 404
        // cb(error)
      }
    );
    hemera.log.info('service listening');
  } catch (err) {
    hemera.log.error(err);
    process.exit(1);
  }
};
start();
```
