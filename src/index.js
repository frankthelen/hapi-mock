const Boom = require('@hapi/boom');
const Path = require('path');
const jexl = require('jexl');
const { name } = require('../package.json');

const register = (server, {
  headerName = 'x-hapi-mock',
  baseDir = './mocks',
  validate = false,
}) => {
  server.ext('onPreAuth', async (request, h) => {
    const {
      route, headers, params, query, payload,
    } = request;
    const { method, path } = route;
    const mockIt = headers[headerName];
    if (!mockIt) { // do not mock
      return h.continue;
    }
    if (validate) {
      const auth = await validate(request);
      if (!auth || !auth.isValid) {
        return Boom.unauthorized('mocks not authorized');
      }
    }
    const routeOptions = route.settings.plugins[name];
    if (!routeOptions) { // no mocks available
      return Boom.badRequest('no mocks for this route');
    }
    try {
      const { file = './cases' } = routeOptions;
      const location = Path.join(baseDir, file);
      const cases = require(location); // eslint-disable-line global-require, import/no-dynamic-require, max-len
      const context = {
        headers, params, query, payload, method, path,
      };
      const mock = cases.find(({ condition }, idx) => {
        try {
          return jexl.evalSync(condition, context);
        } catch (error) {
          throw new Error(`error in condition [${idx}]: ${error.message}`);
        }
      });
      if (!mock) {
        return Boom.badRequest('no matching mock found');
      }
      const {
        code = 200,
        type = 'text/plain',
        body = 'mocked!',
        headers: headersRes = {},
      } = mock;
      const response = h.response(body);
      response.type(type);
      response.code(code);
      response.header(headerName, true);
      Object.entries(headersRes).forEach(([key, value]) => {
        response.header(key, value);
      });
      response.takeover();
      return response;
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
