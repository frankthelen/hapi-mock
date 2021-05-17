import * as hapiMock from '../..';

export default [{
  title: 'case 4711',
  condition: ({ params }) => params.id.foo.bar === '4711',
  code: 418,
}, {
  title: 'case 13',
  condition: ({ headers }) => headers['x-mock-case'] === '13',
  body: 'case 13',
}] as hapiMock.MockCase[];
