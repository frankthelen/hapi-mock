# hapi-mock

Hapi server plugin for mocking endpoints.

[![Build Status](https://travis-ci.org/frankthelen/hapi-mock.svg?branch=master)](https://travis-ci.org/frankthelen/hapi-mock)
[![Coverage Status](https://coveralls.io/repos/github/frankthelen/hapi-mock/badge.svg?branch=master)](https://coveralls.io/github/frankthelen/hapi-mock?branch=master)
[![node](https://img.shields.io/node/v/hapi-mock.svg)]()
[![code style](https://img.shields.io/badge/code_style-airbnb-brightgreen.svg)](https://github.com/airbnb/javascript)
[![License Status](http://img.shields.io/npm/l/hapi-mock.svg)]()

Tested with

* Hapi 20 on Node 12/14/15
* Hapi 19 on Node 12/14/15

## Install

```bash
npm install hapi-mock
```

## Purpose

This plugin provides a simple way to mock your HAPI endpoints.
It is *experimental* at this point of time.

## Usage

Register the plugin with Hapi server like this:
```js
const Hapi = require('@hapi/hapi');
const hapiMock = require('hapi-mock');

const server = new Hapi.Server({
  port: 3000,
});

const mock = {
  plugin: hapiMock,
  options: {
    baseDir: Path.join(__dirname, 'mocks'),
    validate: async (request) => ({ isValid: true }), // optional auth for mocks
  },
};

const provision = async () => {
  await server.register([mock]);
  // ...
  await server.start();
};

provision();
```

Your route configuration may look like this:
```js
server.route({
  method: 'GET',
  path: '/example/{id}',
  options: {
    // ...
    plugins: {
      'hapi-mock': { // activate mocking for this endpoint
        file: './cases', // JS module relative to `baseDir`
      },
    },
  },
  handler: async (request, h) => {
    // ...
  }
});
```

The `file` option refers to a JS module (e.g., `cases.js`) containing your mock cases, e.g.,
```js
module.exports = [{
  condition: 'params.id == "4711"',
  code: 418,
}, {
  condition: 'query.id == "foo"',
  type: 'application/json',
  body: {
    bar: true,
  },
}, {
  condition: 'headers["x-mock-case"] == 13',
  code: 200, // this is the default
  type: 'text/plain', // this is the default
  body: 'case 13',
  headers: {
    'x-mock-foo': 'bar',
  },
}];
```

`condition` is an expression that may refer to HAPI's route parameters `headers`, `params`, `query`, `payload`, `method` (lowercase), and `path`. The usual operators are supported (`==`, `&&`, `||`, etc.).
Response parameters of a mock can be `code` (default `200`), `type` (default `text/plain`), `body` (default `mocked!`), and `headers` (default `{}`).

And finally, you need to set the HTTP header `x-hapi-mock: true` to a request to have a route use mocking rather than its real handler implementation.

You don't want to use this plug-in in production, of course.
Have fun.
