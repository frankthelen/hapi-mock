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

This plugin provides a simple way to add mock behavior to Hapi endpoints.
It is *experimental* at this point of time.

v2 is going away from jexl expressions towards es6 conditions.
And it provides TypeScript support.

## Usage

### ES6

The plugin is *registered with the Hapi server* something like this:

```js
const Hapi = require('@hapi/hapi');
const hapiMock = require('hapi-mock');

// ...

const mock = {
  plugin: hapiMock,
  options: { // registration options
    triggerByHeader: true, // this is the default
    headerName: 'x-hapi-mock', // this is the default
  },
};

await server.register(mock);
```

Your *route configuration* might look like this
(referring to specific mock cases as a separate module):

```js
const myMocks = require('./my-mocks'); // separate module

server.route({
  method: 'GET',
  path: '/example/{id}',
  options: {
    // ...
    plugins: {
      'hapi-mock': { // add mock behavior to this endpoint
        mocks: myMocks,
      },
    },
  },
  // ...
});
```

The file `my-mocks.js` provides some mock cases, e.g.,

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

`condition` gets the Hapi request object as an input parameter
and returns true if the mock case is applicable.
There are response parameters `code` (default `200` or `204`),
`type` (default `text/plain`), `body` (default empty), and `headers` (default `{}`)
to specify the mock behavior. See below for details.

### TypeScript

Types for TypeScript are provided. A typical mock file looks like this:

```typescript
import * as hapiMock from 'hapi-mock';

export default [{
  title: 'case 4711',
  condition: ({ params }) => params.id === '4711',
  code: 418,
  body: '4711',
}, ...] as hapiMock.MockCase[];
```

## Options

### Register Options

In TypeScript it's `hapiMock.RegisterOptions`. Properties are:

* `triggerByHeader` (optional, `boolean`, default is `true`) -- When to apply mocks (provided that
an endpoint has mocks configured). If `true`, mocks are only applied when the request header
`x-hapi-mock` is set (any value). If `false` mocks are always applied.

* `headerName` (optional, `string`, default is `x-hapi-mock`) -- As request header, it must be set to
activate mocks (unless `triggerByHeader` is `false`). As response header, it tells which mock
case was actually applied (if any).

* `continueIfNoneMatch` (optional, `boolean`, default is `true`) -- What should be done
if mocks are configured with an endpoint but none is matching.
If `true`, the request is passed on.
If `false`, the response is status code 422 "Unprocessable Entity".

### Route Options

In TypeScript it's `hapiMock.RouteOptions`. Properties are:

* `mocks` (required, `Array`) -- List of mock cases for the respective endpoint.

* `continueIfNoneMatch` (optional, `boolean`, default is the register option
`continueIfNoneMatch` above) -- What should be done if mocks are configured
with an endpoint but none is matching.
If `true`, the request is passed on.
If `false`, the response is status code 422 "Unprocessable Entity".

### Mock Cases

In TypeScript it's `hapiMock.MockCase`. Properties are:

* `title` (required, `string`) -- A descriptive title of the mock case.

* `condition` (required, a function `(request: Hapi.Request) => boolean`) --
The condition when the mock case applies.

* `code` (optional, `number`, default is 200 or 204) -- The response's status code.

* `type` (optional, `string`, default is `text/plain`) -- The response's `content-type`.

* `body` (optional, `string` or any object) -- The response's body.

* `headers` (optional, an object) -- The response's specific headers.
