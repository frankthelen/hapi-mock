const Path = require('path');
const Hapi = require('@hapi/hapi');
const hapiAuthBasic = require('@hapi/basic');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const hapiMock = require('../src/index');

chai.use(chaiAsPromised);
chai.use(sinonChai);

global.chai = chai;
global.sinon = sinon;
global.expect = chai.expect;
global.should = chai.should();

const validate = async (request, username) => {
  if (username === 'jim') {
    return {
      isValid: true,
      credentials: {
        username,
        scope: ['read'],
      },
    };
  }
  if (username === 'bob') {
    return {
      isValid: true,
      credentials: {
        username,
        scope: ['read', 'write'],
      },
    };
  }
  return {
    isValid: false,
  };
};

const listener = {
  errors: (request, event, tags) => { // eslint-disable-line no-unused-vars
    // console.log('####', event);
  },
  handlers: () => {},
};

const setup = async () => {
  const server = new Hapi.Server({
    port: 9004,
    // debug: {
    //   request: ['error'],
    // },
  });
  const route1 = {
    method: 'GET',
    path: '/test1/{id}',
    options: {
      auth: false,
    },
    handler: () => {
      listener.handlers();
      return 'ok';
    },
  };
  const route2 = {
    method: 'GET',
    path: '/test2/{id}',
    options: {
      auth: {
        access: {
          scope: ['read'],
        },
      },
      plugins: {
        'hapi-mock': {
          file: './cases',
        },
      },
    },
    handler: () => {
      listener.handlers();
      return 'ok';
    },
  };
  const mock = {
    plugin: hapiMock,
    options: {
      baseDir: Path.join(__dirname, 'mocks'),
    },
  };
  await server.register([hapiAuthBasic, mock]);
  server.auth.strategy('simple', 'basic', { validate });
  server.auth.default('simple');
  await server.route([route1, route2]);
  await server.start();
  return server;
};

describe('hapi-mock', async () => {
  let server;

  beforeEach(async () => {
    server = await setup();
    sinon.spy(listener, 'errors');
    sinon.spy(listener, 'handlers');
    server.events.on({ name: 'request', filter: { tags: ['error'] } }, listener.errors);
  });

  afterEach(async () => {
    listener.errors.restore();
    listener.handlers.restore();
    await server.stop();
  });

  it('should mock routes / condition by params', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/test2/4711',
      headers: {
        'x-hapi-mock': true,
      },
    });
    expect(res.statusCode).to.be.equal(418);
    expect(listener.handlers.called).to.equal(false);
  });

  it('should mock routes / condition by headers', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/test2/4712',
      headers: {
        'x-hapi-mock': true,
        'x-mock-case': 13,
      },
    });
    expect(res.payload).to.be.equal('case 13');
    expect(listener.handlers.called).to.equal(false);
  });

  it('should mock routes / no mock found', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/test2/4712',
      headers: {
        'x-hapi-mock': true,
      },
    });
    expect(res.statusCode).to.be.equal(400);
    expect(listener.handlers.called).to.equal(false);
  });
});
