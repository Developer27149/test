// Promise.allSettled = function (promiseArr) {
//   const rejectHandler = reason => ({status: 'rejectd', reason});
//   const resolveHandler = value => ({status: 'resolved', value});
//   const covertPromises = promiseArr.map(p => Promise.resolve(p).then(resolveHandler, rejectHandler))
//   return Promise.all(covertPromises)
// }

// Promise.allSettled = (promiseArr) => {
//   return new Promise(resolve => {
//     const result = Promise.all(promiseArr.map(promiseItem => {
//       return Promise.resolve(promiseItem).then(
//         v => ({status: 'resolved', value: v}),
//         reason => ({status: 'rejected', reason})
//       )
//     }))
//     resolve(result)
//   })
// }

// Promise.allSettled([1,Promise.resolve(2), Promise.reject('error')]).then(data => {
//   data.forEach(item => {
//     console.log(item);
//   })
// })

// const demo = async () => {
//   return 1
// }
// console.log(demo());

// const r = Promise.resolve(
//   Promise.resolve(
//     Promise.reject(1)
//   )
// )
// Promise.reject(r).then(r => console.log(r)).catch(j => console.log(`j is ${j}`))
// Promise.resolve(Promise.resolve(Promise.reject(Promise.resolve(1)))).then(j => {
//   console.log(j);
// }, r => {
//   console.log(r);
// })
// const obj = {
//   name: 'o',
//   then() {
//     console.log('this is then', arguments);
//     arguments[0](1)
//   }
// }
// const p = new Promise((resolve, reject) => {
//   resolve(obj)
// })

// p.then((v) => {
//   console.log('resolve', v);
// }).catch((i) => {
//   console.log('reject', i)
// })
// console.log(Promise.resolve(Promise.reject(1)));

// new Promise((resolve ,reject) => resolve(1))
//   .then(() => {
//     console.log('1');
//   })
//   .then((v) => {
//     console.log('2', v);
//     throw new Error('my error')
//   })
//   .then(() => {
//     console.log('3');
//   })
//   .catch(err => {
//     console.log('catch any error');
//     return 4 // 或者 return Promise.resolve(4)
//   })
//   .then((v) => {
//     console.log('4', v);
//   })
//   .finally(() => {
//     console.log('finally');
//   })
//   .then(v => {
//     console.log(5, v);
//   })
// output

// const obj = {
//   name: 'o',
//   then() {
//     console.log('this is then', arguments);
//     arguments[0](1)
//     // return 1
//   }
// }
// async function f() {
//   let r = await obj;
//   console.log(r);
// }

// f()

// async function thisThrows() {
//   throw new Error("Thrown from thisThrows()");
// }

// async function run() {
//   try {
//       await thisThrows();
//   } catch (e) {
//       console.error(e);
//   } finally {
//       console.log('We do cleanup here');
//   }
// }

// run();

// function promisify(f, multiArgs = false){
//   return function(...args) {
//     return new Promise((resolve, reject) => {
//       function callback(err, ...results) {
//         err ? reject(err) : resolve(multiArgs ? results : results[0])
//       }
//       args.push(callback)
//       f.call(this, ...args)
//     })
//   }
// }

// const fs = require('fs')
// const fsPromise = promisify(fs.readdir)
// fsPromise('.').then(r => {
//   console.log('resolve', r);
// }).catch(r => {
//   console.log('reject', r);
// })