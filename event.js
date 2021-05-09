console.log('start');
setTimeout(() => console.log('a'))

Promise.resolve().then(() => {
  console.log('b');
}).then(() => {
  console.log('c');
})

setTimeout(() => console.log('d'))
Promise.resolve().then(() => console.log('e'))
console.log('end');
