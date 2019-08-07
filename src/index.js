const Boom = require('@hapi/boom');
const Path = require('path');
const { compile } = require('@networkteam/eel');
const { name } = require('../package.json');

const register = (server, {
  headerName = 'x-hapi-mock',
  baseDir = './mocks',
}) => {
  server.ext('onPreAuth', async (request, h) => {
    const {
      route, headers, params, query, payload,
    } = request;
    const { method, path } = route;
    const mockIt = headers[headerName];
    const routeOptions = route.settings.plugins[name];
    if (!mockIt) { // do not mock
      return h.continue;
    }
    if (!routeOptions) { // no mocks available
      return Boom.badRequest('no mocks for this route');
    }
    try {
      const { file = './cases' } = routeOptions;
      const location = Path.join(baseDir, file);
      const cases = require(location); // eslint-disable-line global-require, import/no-dynamic-require, max-len
      const mock = cases.find(({ condition }) => compile(condition)({
        headers, params, query, payload, method, path,
      }));
      if (!mock) {
        return Boom.badRequest('no matching mock found');
      }
      const {
        code = 200,
        type = 'text/plain',
        body = 'mocked',
      } = mock;
      return h
        .response(body)
        .type(type)
        .code(code)
        .header(headerName, true)
        .takeover();
    } catch (error) {
      server.log(['error'], error);
      return Boom.badImplementation(error.message);
    }
  });
};

module.exports = {
  name,
  register,
};
