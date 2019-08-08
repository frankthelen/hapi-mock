module.exports = [{
  condition: 'params.id == "4711"',
  code: 418,
}, {
  condition: 'headers["x-mock-case"] == 13',
  body: 'case 13',
}];
