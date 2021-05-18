import { Plugin, Request } from '@hapi/hapi';

declare module '@hapi/hapi' {
  // https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/hapi__hapi/index.d.ts#L97
  interface PluginSpecificConfiguration {
    'hapi-mock'?: hapiMock.RouteOptions;
  }
}

declare namespace hapiMock {

  interface RegisterOptions {
    /** When to apply mocks (provided that an endpoint has mocks configured).
     * If `true`, mocks are only applied when the request header `x-hapi-mock` is set (any value).
     * If `false` mocks are always applied.
     * Default is `true`.
     */
    triggerByHeader?: boolean;

    /** The default header name is `x-hapi-mock`.
     * As request header, it must be set to activate mocks (unless `triggerByHeader` is `false`).
     * As response header, it tells which mock case was applied (if any).
    */
    headerName?: string;

    /** What should be done if mocks are configured with an endpoint but none is matching.
     * If `true`, the request is passed on.
     * If `false`, the response is status code 422 "Unprocessable Entity".
     * Default is `true`. */
    continueIfNoneMatch?: boolean;
  }

  interface RouteOptions {
    /** List of mock cases for this endpoint. */
    mocks: MockCase[];

    /** What should be done if mocks are configured with an endpoint but none is matching.
     * If `true`, the request is passed on.
     * If `false`, the response is status code 422 "Unprocessable Entity".
     * Default is the registration option `continueIfNoneMatch`. */
     continueIfNoneMatch?: boolean;
  }

  interface MockCase {
    title: string;
    condition: (request: Request) => boolean;
    code?: number;
    type?: string;
    body?: string | any;
    headers?: Record<string, string>;
  }

}

// eslint-disable-next-line @typescript-eslint/no-redeclare
declare const hapiMock: Plugin<hapiMock.RegisterOptions>;

export = hapiMock;
