import * as hapiMock from '../..';

export default [{
  title: 'case 4711',
  condition: ({ params }) => params.id === '4711',
  code: 418,
  body: '4711',
}, {
  title: 'case foo',
  condition: ({ query }) => query.id === 'foo',
  type: 'application/json',
  body: {
    bar: true,
  },
}, {
  title: 'case missing condition',
}, {
  title: 'case 13',
  condition: ({ headers }) => headers['x-mock-case'] === '13',
  type: 'text/plain', // this is the default
  headers: {
    'x-mock-foo': 'bar',
  },
}] as hapiMock.MockCase[];
