// function Yi(executor) {
//   this._state = 'pending'
//   this._value = undefined
//   // a list of clients that need to be notified when a state change
//   // event occurs
//   // These event-consumers are the promises that are returned by the calls to the then method
//   this.consumers = []
//   executor(this.resolve.bind(this), this.reject.bind(this))
// }

// /**
//  * 按照状态，执行微任务
//  */
// Yi.prototype.broadcase = function() {
//   const promise = this;
//   // called after promise is resolved
//   if(this.state === 'pending') return
//   // 2.2.6.1, 2.2.6.2 all respective callbacks must execute
//   const callbackName = this.state === 'fulfilled' ? 'onfulfilled': 'onRejected';
//   const resolver = this.state === 'fulfilled' ? 'resolve' : 'reject'
//   setTimeout(function() {
//     // 2.2.2.3, 2.2.3.3 called only once
//     promise.consumers.splice(0).forEach(function(consumer) {
//       try {
//         const callback = consumer[callbackName]
//         if(callback) {
//           // 2.2.7.1 for now,we simply fufill the promise
//           consumer.resolve(callback(promise.value))
//         } else {
//           consumer[resolver](promise.value)
//         }
//       } catch (e) {
//         consumer.reject(e)
//       }
//     })
//   })
// }

// // 2.1.1.1 provide only two ways to transition
// Yi.prototype.resolve = function(value) {
//   if(this._state !== 'pending') return // cannot transition anymore
//   this._state = 'fulfilled'
//   this._value = value
//   this.broadcase()
// }

// Yi.prototype.reject = function(reason) {
//   if(this._state !== 'pending') return // cannot transition anymore
//   this._state = 'rejected'
//   this._value = reason
//   this.broadcase()
// }

// Yi.prototype.then = function(onFulfilled, onRejected) {
//   let consumer = new Yi(function() {})
//   // 2.2.1.1 ignore onFulfilled if not a function
//   consumer.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null
//   // 2.2.1.2 onRejected too
//   consumer.onRejected = typeof onRejected === 'function' ? onRejected : null
//   // 2.2.6.1, 2.2.6.2 .then() may be called multiple times on the same promise
//   this.consumers.push(consumer)
//   // It might ne that the promise was already resolved...
//   this.broadcase()
//   // 2.2.7 then() must rturn a promise
//   return consumer
// }

// Yi.prototype.catch = function(onRejected) {
//   let consumer = new Yi(function() {})
//   consumer.onRejected = onRejected
//   this.consumers.push(consumer)
//   this.broadcase()
//   return consumer
// }

// const y = new Yi(res => res(1))
// console.log(y);
// const p = new Yi((res, reject) => {
//   console.log('start');
//   // setTimeout(res, 100, 'resolve it')
//   res('this')
// })
// console.log(p);
// p.then(r => {
//   console.log(`resove: ${r}`);
// }).catch(r => {
//   console.log(`reject: ${r}`);
// })
// console.log('end');

function Yi(executor) {
  this.state = 'pending'
  this.value = undefined
  this.consumers = []
  executor(this.resolve.bind(this), this.reject.bind(this))
}

Yi.prototype.resolve = function(value) {
  if(this.state !== 'pending') return
  this.state = 'fulfilled'
  this.value = value
  this.broadcast()
}

Yi.prototype.reject = function(reason) {
  if(this.state !== 'pending') return
  this.state = 'rejected'
  this.value = reason
  this.broadcast()
}

Yi.prototype.then = function(onFulfilled, onRejected) {
  const promise = new Yi(function() {})
  promise.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : undefined
  promise.onRejected = typeof onRejected === 'function' ? onRejected : undefined
  this.consumers.push(promise)
  this.broadcast()
  return promise
}

Yi.prototype.broadcast = function() {
  const promise = this;
  // called after promise is resolved
  if(promise.state === 'pending') return

  const callbackType = promise.state === 'fulfilled' ? 'onFulfilled' : 'onRejected'
  const resolveOrReject = promise.state === 'fulfilled' ? 'resolve' : 'reject'
  if(promise.consumers.length >= 0) {
    setTimeout(() => {
      promise.consumers.splice(0).forEach(consumer => {
        try {
          const callback = consumer[callbackType]
          // 如果 promise 具有 onFulfilled 或者 onRejected 方法，在 then 方法执行的时候添加的
          if(callback) {
            consumer.resolve(callback(promise.value))
          } else {
            // 状态转为 settled
            consumer[resolveOrReject](promise.value)
          }
        } catch (e) {
          consumer.reject(e)
        }
      })
    }, 0);
  }
}

Yi.prototype.catch = function(onRejected) {
  return this.then(undefined, onRejected)
}

const p = new Yi((res, rej) => {
  console.log('start');
  rej(1)
  // res(1)
  // setTimeout(() => {
  //   res(1)
  // }, 100);
})
p
.then(() => {
  console.log(1);
})
.then(r => {
  console.log(2);
  throw new Error('bad')
}).catch(r => {
  console.log(3);
  console.log(`reject: ${r}`);
})
