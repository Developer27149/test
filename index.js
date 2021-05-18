const bluebird = require('bluebird')
bluebird.resolve().then(() => {
  console.log(0);
  return bluebird.resolve(4)
}).then((r) => {
  console.log(r);
})

bluebird.resolve().then(() => {
  console.log(1);
}).then(() => {
  console.log(2);
})