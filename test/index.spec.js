const Path = require('path');
// const Hapi = require('@hapi/hapi');
const Joi = require('joi');
const hapiAuthBasic = require('@hapi/basic');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const hapiMock = require('..');

chai.use(chaiAsPromised);
chai.use(sinonChai);

global.chai = chai;
global.sinon = sinon;
global.expect = chai.expect;
global.should = chai.should();

const hapiVersions = ['hapi19', 'hapi20'];

hapiVersions.forEach((hapiVersion) => {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const Hapi = require(hapiVersion);

  describe(`${hapiVersion}`, async () => {
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

    const setup = async (pluginOptions = {}) => {
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
          validate: {
            params: {
              id: Joi.string().required(),
            },
          },
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
          auth: false,
          validate: {
            params: {
              id: Joi.string().required(),
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
      const route3 = {
        method: 'GET',
        path: '/test3/{id}',
        options: {
          auth: false,
          validate: {
            params: {
              id: Joi.string().required(),
            },
          },
          plugins: {
            'hapi-mock': {
              file: './faulty',
            },
          },
        },
        handler: () => {
          listener.handlers();
          return 'ok';
        },
      };
      const route4 = {
        method: 'GET',
        path: '/test4',
        options: {
          auth: false,
          validate: {
            query: {
              id: Joi.string().required(),
            },
          },
          plugins: {
            'hapi-mock': {
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
          ...pluginOptions,
        },
      };
      server.validator(Joi);
      await server.register([hapiAuthBasic, mock]);
      server.auth.strategy('simple', 'basic', { validate });
      server.auth.default('simple');
      await server.route([route1, route2, route3, route4]);
      await server.start();
      return server;
    };

    describe('hapi-mock / without auth', async () => {
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

      it('should not mock routes / no mocks for this route', async () => {
        const res = await server.inject({
          method: 'GET',
          url: '/test1/4711',
          headers: {
            'x-hapi-mock': true,
          },
        });
        expect(res.statusCode).to.be.equal(400);
        expect(JSON.parse(res.payload).message).to.be.equal('no mocks for this route');
        expect(listener.handlers.called).to.equal(false);
      });

      it('should not mock routes / pass on to real handler', async () => {
        const res = await server.inject({
          method: 'GET',
          url: '/test2/4711',
        });
        expect(res.statusCode).to.be.equal(200);
        expect(listener.handlers.calledOnce).to.equal(true);
      });

      it('should mock routes / find case by params', async () => {
        const res = await server.inject({
          method: 'GET',
          url: '/test2/4711',
          headers: {
            'x-hapi-mock': true,
          },
        });
        expect(res.statusCode).to.be.equal(418);
        expect(res.headers['content-type']).to.be.equal('text/plain; charset=utf-8');
        expect(res.payload).to.be.equal('mocked!');
        expect(listener.handlers.called).to.equal(false);
      });

      it('should mock routes / find case by headers / set header', async () => {
        const res = await server.inject({
          method: 'GET',
          url: '/test2/4712',
          headers: {
            'x-hapi-mock': true,
            'x-mock-case': 13,
          },
        });
        expect(res.statusCode).to.be.equal(200);
        expect(res.headers['content-type']).to.be.equal('text/plain; charset=utf-8');
        expect(res.payload).to.be.equal('case 13');
        expect(res.headers['x-mock-foo']).to.be.equal('bar');
        expect(listener.handlers.called).to.equal(false);
      });

      it('should mock routes / find case by query / json response', async () => {
        const res = await server.inject({
          method: 'GET',
          url: '/test4?id=foo',
          headers: {
            'x-hapi-mock': true,
          },
        });
        expect(res.statusCode).to.be.equal(200);
        expect(res.headers['content-type']).to.be.equal('application/json; charset=utf-8');
        expect(JSON.parse(res.payload)).to.be.deep.equal({ bar: true });
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
        expect(JSON.parse(res.payload).message).to.be.equal('no matching mock found');
        expect(listener.handlers.called).to.equal(false);
      });

      it('should detect and log faulty condition', async () => {
        const res = await server.inject({
          method: 'GET',
          url: '/test3/4711',
          headers: {
            'x-hapi-mock': true,
          },
        });
        expect(res.statusCode).to.be.equal(500);
        expect(listener.handlers.called).to.equal(false);
        expect(listener.errors.calledOnce).to.be.equals(true);
      });
    });

    describe('hapi-mock / with auth / false', async () => {
      let server;
      const pluginOptions = {
        validate: async () => ({ isValid: false }),
      };

      beforeEach(async () => {
        sinon.spy(listener, 'errors');
        sinon.spy(listener, 'handlers');
        sinon.spy(pluginOptions, 'validate');
        server = await setup(pluginOptions);
        server.events.on({ name: 'request', filter: { tags: ['error'] } }, listener.errors);
      });

      afterEach(async () => {
        listener.errors.restore();
        listener.handlers.restore();
        pluginOptions.validate.restore();
        await server.stop();
      });

      it('should protect mocking / false', async () => {
        const res = await server.inject({
          method: 'GET',
          url: '/test2/4711',
          headers: {
            'x-hapi-mock': true,
          },
        });
        expect(res.statusCode).to.be.equal(401);
        expect(JSON.parse(res.payload).message).to.be.equal('mocks not authorized');
        expect(listener.handlers.calledOnce).to.equal(false);
        expect(pluginOptions.validate.calledOnce).to.equal(true);
      });
    });

    describe('hapi-mock / with auth / true', async () => {
      let server;
      const pluginOptions = {
        validate: async () => ({ isValid: true }),
      };

      beforeEach(async () => {
        sinon.spy(listener, 'errors');
        sinon.spy(listener, 'handlers');
        sinon.spy(pluginOptions, 'validate');
        server = await setup(pluginOptions);
        server.events.on({ name: 'request', filter: { tags: ['error'] } }, listener.errors);
      });

      afterEach(async () => {
        listener.errors.restore();
        listener.handlers.restore();
        pluginOptions.validate.restore();
        await server.stop();
      });

      it('should protect mocking / true', async () => {
        const res = await server.inject({
          method: 'GET',
          url: '/test2/4711',
          headers: {
            'x-hapi-mock': true,
          },
        });
        expect(res.statusCode).to.be.equal(418);
        expect(listener.handlers.calledOnce).to.equal(false);
        expect(pluginOptions.validate.calledOnce).to.equal(true);
      });
    });
  });
});
