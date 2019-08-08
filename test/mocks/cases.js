module.exports = [{
  condition: 'params.id == "4711"',
  code: 418,
}, {
  condition: 'query.id == "foo"',
  type: 'application/json',
  body: {
    bar: true,
  },
}, {
  condition: 'headers["x-mock-case"] == 13',
  code: 200, // this is the default
  type: 'text/plain', // this is the default
  body: 'case 13',
  headers: {
    'x-mock-foo': 'bar',
  },
}];
