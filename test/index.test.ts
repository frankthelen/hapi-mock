import * as Hapi from '@hapi/hapi';
import hapiMock from '..';

import cases from './mocks/cases';
import catchall from './mocks/catchall';
import faulty from './mocks/faulty';

describe('hapi-mock', () => {
  const handlerSpy = jest.fn();
  const errorSpy = jest.fn();

  const setup = async (pluginOptions: hapiMock.RegisterOptions = {}) => {
    const server = new Hapi.Server({
      port: 9004,
    });
    const route1: Hapi.ServerRoute = {
      method: 'GET',
      path: '/test1/{id}',
      handler: () => {
        handlerSpy();
        return 'ok1';
      },
    };
    const route2: Hapi.ServerRoute = {
      method: 'GET',
      path: '/test2/{id}',
      options: {
        plugins: {
          'hapi-mock': {
            mocks: cases,
          },
        },
      },
      handler: () => {
        handlerSpy();
        return 'ok2';
      },
    };
    const route3: Hapi.ServerRoute = {
      method: 'GET',
      path: '/test3/{id}',
      options: {
        plugins: {
          'hapi-mock': {
            mocks: faulty,
          },
        },
      },
      handler: () => {
        handlerSpy();
        return 'ok3';
      },
    };
    const route4: Hapi.ServerRoute = {
      method: 'GET',
      path: '/test4',
      options: {
        plugins: {
          'hapi-mock': {
            mocks: catchall,
          },
        },
      },
      handler: () => {
        handlerSpy();
        return 'ok4';
      },
    };
    const mock = {
      plugin: hapiMock,
      options: pluginOptions,
    };
    await server.register(mock);
    server.route([route1, route2, route3, route4]);
    server.events.on({ name: 'request', filter: { tags: ['error'] } }, errorSpy);
    await server.start();
    return server;
  };

  describe('with default settings', () => {
    let server: Hapi.Server;

    beforeEach(async () => {
      server = await setup();
    });

    afterEach(async () => {
      await server.stop();
    });

    it('should not mock / pass on to real handler / no header', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/test1/4711',
      });
      expect(response.statusCode).toEqual(200);
      expect(response.payload).toEqual('ok1');
      expect(response.headers['x-hapi-mock']).toBeUndefined();
      expect(handlerSpy).toHaveBeenCalled();
    });

    it('should not mock / pass on to real handler / no mocks configured', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/test1/4711',
        headers: {
          'x-hapi-mock': 'true',
        },
      });
      expect(response.statusCode).toEqual(200);
      expect(response.payload).toEqual('ok1');
      expect(response.headers['x-hapi-mock']).toBeUndefined();
      expect(handlerSpy).toHaveBeenCalled();
    });

    it('should not mock / pass on to real handler / no mocks found', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/test2/foobar',
        headers: {
          'x-hapi-mock': 'true',
        },
      });
      expect(response.statusCode).toEqual(200);
      expect(response.payload).toEqual('ok2');
      expect(response.headers['x-hapi-mock']).toBeUndefined();
      expect(handlerSpy).toHaveBeenCalled();
    });

    it('should mock / find case by params', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/test2/4711',
        headers: {
          'x-hapi-mock': 'true',
        },
      });
      expect(response.statusCode).toEqual(418);
      expect(response.headers['content-type']).toEqual('text/plain; charset=utf-8');
      expect(response.payload).toEqual('4711');
      expect(response.headers['x-hapi-mock']).toEqual('case 4711');
      expect(handlerSpy).not.toHaveBeenCalled();
    });

    it('should mock / find case by headers / set header', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/test2/4712',
        headers: {
          'x-hapi-mock': 'true',
          'x-mock-case': '13',
        },
      });
      expect(response.statusCode).toEqual(204);
      expect(response.headers['content-type']).toEqual('text/plain; charset=utf-8');
      expect(response.payload).toEqual(''); // no body defined
      expect(response.headers['x-mock-foo']).toEqual('bar');
      expect(response.headers['x-hapi-mock']).toEqual('case 13');
      expect(handlerSpy).not.toHaveBeenCalled();
    });

    it('should mock / find case by query / json response', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/test4?id=foo',
        headers: {
          'x-hapi-mock': 'true',
        },
      });
      expect(response.statusCode).toEqual(200);
      expect(response.headers['content-type']).toEqual('application/json; charset=utf-8');
      expect(JSON.parse(response.payload)).toEqual(expect.objectContaining({
        bar: true,
      }));
      expect(response.headers['x-hapi-mock']).toEqual('case foo');
      expect(handlerSpy).not.toHaveBeenCalled();
    });

    it('should mock / catch all', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/test4?id=bar',
        headers: {
          'x-hapi-mock': 'true',
        },
      });
      expect(response.statusCode).toEqual(419);
      expect(handlerSpy).not.toHaveBeenCalled();
    });

    it('should detect and log faulty condition', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/test3/4711',
        headers: {
          'x-hapi-mock': 'true',
        },
      });
      expect(response.statusCode).toEqual(500);
      expect(handlerSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('with `triggerByHeader: false`', () => {
    let server: Hapi.Server;

    beforeEach(async () => {
      server = await setup({
        triggerByHeader: false,
      });
    });

    afterEach(async () => {
      await server.stop();
    });

    it('should mock', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/test2/4711',
      });
      expect(response.statusCode).toEqual(418);
      expect(response.headers['content-type']).toEqual('text/plain; charset=utf-8');
      expect(response.payload).toEqual('4711');
      expect(handlerSpy).not.toHaveBeenCalled();
    });
  });

  describe('with `continueIfNoneMatch: false`', () => {
    let server: Hapi.Server;

    beforeEach(async () => {
      server = await setup({
        continueIfNoneMatch: false,
      });
    });

    afterEach(async () => {
      await server.stop();
    });

    it('should respond error', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/test2/foobar',
        headers: {
          'x-hapi-mock': 'true',
        },
      });
      expect(response.statusCode).toEqual(422);
      expect(handlerSpy).not.toHaveBeenCalled();
    });
  });
});
