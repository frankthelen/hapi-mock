# hapi-mock

Hapi server plugin for adding mock behavior to endpoints.

[![Build Status](https://travis-ci.org/frankthelen/hapi-mock.svg?branch=master)](https://travis-ci.org/frankthelen/hapi-mock)
[![Coverage Status](https://coveralls.io/repos/github/frankthelen/hapi-mock/badge.svg?branch=master)](https://coveralls.io/github/frankthelen/hapi-mock?branch=master)
[![node](https://img.shields.io/node/v/hapi-mock.svg)]()
[![code style](https://img.shields.io/badge/code_style-airbnb-brightgreen.svg)](https://github.com/airbnb/javascript)
[![Types](https://img.shields.io/npm/types/rools.svg)](https://www.npmjs.com/package/rools)
[![License Status](http://img.shields.io/npm/l/hapi-mock.svg)]()

Tested with Hapi 19/20 on Node 12/14/16.

## Install

```bash
npm install hapi-mock
```

## Purpose

This plugin provides a simple way to add mock behavior to endpoints.
It is *experimental* at this point of time.

v2 is going away from jexl expressions towards es6 conditions.
And it is rewritten in TypeScript.

## Usage (ES6)

Register the plugin with Hapi server like this:

```js
const Hapi = require('@hapi/hapi');
const hapiMock = require('hapi-mock');

// ...

const mock = {
  plugin: hapiMock,
  options: {
    triggerByHeader: true, // default
    headerName: 'x-hapi-mock', // default
  },
};

await server.register(mock);
```

Your route configuration may look like this:

```js
server.route({
  method: 'GET',
  path: '/example/{id}',
  options: {
    // ...
    plugins: {
      'hapi-mock': { // add mock behavior to this endpoint
        mocks: [{
          condition: ({ params }) => params.id === '4711',
          code: 418,
        }, ...],
      },
    },
  },
  handler: // ...
});
```

The `mocks` option can also refer to a separate module, e.g.,

```js
module.exports = [{
  condition: ({ params }) => params.id === '4711',
  code: 418,
}, {
  condition: ({ query }) => query.id === 'foo',
  type: 'application/json',
  body: {
    bar: 'qux',
  },
}, {
  condition: ({ headers }) => headers['x-mock-case'] === '13',
  code: 200, // this is the default
  type: 'text/plain', // this is the default
  body: 'case 13',
  headers: {
    'x-mock-foo': 'bar',
  },
}];
```

`condition` maps the Hapi request object to true for applying the mock case.
Response parameters of a mock can be `code` (default `200` or `204`),
`type` (default `text/plain`), `body` (default empty), and `headers` (default `{}`).

Have fun.

## Options

### Registration Options

`triggerByHeader` (optional, boolean, default `true`) -- When to apply mocks (provided that
an endpoint has mocks configured). If `true`, mocks are only applied when the request header
`x-hapi-mock` is set (any value). If `false` mocks are always applied.

`headerName` (optional, string, default `x-hapi-mock`) -- As request header, it must be set to
activate mocks (unless `triggerByHeader` is `false`). As response header, it tells which mock
case was applied (if any).

`continueIfNoneMatch` (optional, boolean, default `true`) -- What should be done
if mocks are configured but none is matching.
If `true`, the request is passed on.
If `false`, the response is status code 422 "Unprocessable Entity".

### Route Options

`mocks` (required, Array) -- List of mock cases for the respective endpoint.

`continueIfNoneMatch` (optional, boolean, default is registration option `continueIfNoneMatch`) --
What should be done if mocks are configured but none is matching.
If `true`, the request is passed on.
If `false`, the response is status code 422 "Unprocessable Entity".

### Mock Cases

`title` (required, string) -- A descriptive title of the mock case.

`condition` (required, function `(request: Hapi.Request) => boolean`) --
The condition when the mock case shall be applied.

`code` (optional, number, default 200 or 204) -- Status code.

`type` (optional, string, default `text/plain`) -- Response `content-type`.

`body` (optional, string or object) -- Response body.

`headers` (optional, object) -- Response headers.
