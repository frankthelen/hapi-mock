import * as Hapi from '@hapi/hapi';
import Boom from '@hapi/boom';

export const name = 'hapi-mock';

export const register = (server: Hapi.Server, {
  triggerByHeader = true,
  headerName = 'x-hapi-mock',
  continueIfNoneMatch: continueIfNoneMatchDefault = true,
}) => {
  server.ext('onPreAuth', async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { route, headers } = request;
    const mockIt = !triggerByHeader || !!headers[headerName];
    if (!mockIt) { // do not mock
      return h.continue;
    }
    const pluginConfigs = route.settings.plugins as Hapi.PluginSpecificConfiguration;
    const routeOptions = pluginConfigs['hapi-mock'];
    if (!routeOptions) { // do not mock
      return h.continue;
    }
    const {
      mocks = [],
      continueIfNoneMatch = continueIfNoneMatchDefault,
    } = routeOptions;
    try {
      const mock = mocks.find(({ condition = () => false, title = 'noname' }) => {
        try {
          return condition(request);
        } catch (error) {
          throw new Error(`error in condition "${title}": ${error.message}`);
        }
      });
      if (!mock) { // no matching mock found
        if (continueIfNoneMatch) {
          return h.continue;
        }
        return Boom.badData('no matching mock found');
      }
      const {
        title = 'noname',
        body, // can be undefined
        code = body ? 200 : 204,
        type = 'text/plain',
        headers: headersResponse = {},
      } = mock;
      const response = h.response(body);
      response.type(type);
      response.code(code);
      response.header(headerName, `${title}`);
      Object.entries(headersResponse).forEach(([key, value]) => {
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

export default {
  name, register,
};
