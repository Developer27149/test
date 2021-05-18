function Y(executor) {
  if(executor === undefined) {
    throw new TypeError('You must give a executor function.')
  }
  if(typeof executor !== 'function') {
    throw new TypeError('Executor must be a function')
  }
  this.state = 'pending'
  this.value = undefined
  // 针对状态变更后需要异步调用的某些函数的规范定义，添加的数组属性
  this.consumers = []
  executor(this.resolve.bind(this), this.reject.bind(this))
}

Y.prototype.resolve = function(value) {
  if(this.state !== 'pending') return // 2.1.1.1, 2.1.3.1
  this.state = 'fulfilled' // 2.1.1.1
  this.value = value // 2.1.2.2
  this.broadcast()
}

Y.prototype.reject = function (reason) {
  if(this.state !== 'pending') return // 2.1.1.1, 2.1.3.1
  this.state = 'rejected' // 2.1.1.1
  this.value = reason // 2.1.3.2
  this.broadcast()
}

Y.prototype.then = function(onFulfilled, onRejected) {
  const consumer = new Y(function() {});
  // 2.2.1.1, 2.2.1.2
  consumer.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : undefined
  consumer.onRejected = typeof onRejected === 'function' ? onRejected : undefined
  this.consumers.push(consumer);
  this.broadcast();
  return consumer
}

Y.prototype.catch = function(onRejected) {
  return this.then(undefined, onRejected)
}

Y.prototype.broadcast = function() {
  // 2.2.5
  const promise = this;
  // 2.2.2.1, 2.2.2.2, 2.2.3.1, 2.2.3.2
  if(promise.state === 'pending') return;
  // 2.2.6.1, 2.2.6.2
  const callbackName = promise.state === 'fulfilled' ? 'onFulfilled' : 'onRejected'
  const resolver = promise.state === 'fulfilled' ? 'resolve' : 'reject'
  // 2.2.4
  setTimeout(
    function() {
      // 2.2.6.1, 2.2.6.2, 2.2.2.3, 2.2.3.3
      const arr = promise.consumers.splice(0)
      for (let i = 0; i < arr.length; i++) {
        try {
          const consumer = arr[i];
          const callback = consumer[callbackName]
          // 2.2.1.1, 2.2.1.2. 2.2.5
          if(callback) {
            // 2.2.7.1 暂时直接处理
            consumer.resolve(callback(promise.value))
          } else {
            // 2.2.7.3
            consumer[resolver](promise.value)
          }
        } catch (e) {
          // 2.2.7.2
          consumer.reject(e)
        }
      }
    }
  )
}

// const promise = new Y((resolve, reject) => {
//   console.log('start');
//   setTimeout(() => {
//     resolve('ok')
//   }, 10);
// })

// promise.then(r => {
//   console.log('resolve: ', r);
// }).catch((r) => {
//   console.log(`reject: ${r}`);
// })

// console.log('end');

const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'

class Yi {
  constructor(executor) {
    if(executor === undefined) {
      throw new TypeError('You must give a executor function.')
    }
    if(typeof executor !== 'function') {
      throw new TypeError('Executor must be a function')
    }
    this.state = PENDING
    this.value = undefined
    this.consumers = [] // 保存当前 promise then 方法中返回的 promise 实例
    function onFulfill(value) {
      if(this.state !== PENDING) return // 2.1.2.1, 2.1.3.1
      this.state = FULFILLED // 2.1.1.1
      this.value = value // 2.1.2.2
      this.broadcast()
    }

    function onReject(reason) {
      if(this.state !== PENDING) return // 2.1.2.1, 2.1.3.1
      this.state = REJECTED // 2.1.1.1
      this.value = reason // 2.1.3.2
      this.broadcast()
    }
    executor(onFulfill.bind(this), onReject.bind(this))
  }

  static resolve(value) {
    return new Yi(resolve => {
      resolve(value)
    })
  }

  static reject(reason) {
    return new Yi((_, reject) => {
      reject(reason)
    })
  }

  broadcast() {
    const promise = this
    // 2.2.2.1, 2.2.2.2, 2.2.3.1, 2.2.3.2
    if(promise.state === PENDING) return;
    // 2.2.6.1, 2.2.6.2
    const callbackName = promise.state === FULFILLED ? 'onFulfilled' : 'onRejected'
    const resolver = promise.state === FULFILLED ? 'onFulfill' : 'onReject'
    // 2.2.4 onFulfilled or onRejected must be called asynchronously
    soon(
      function() {
        // 2.2.6.1, 2.2.6.2, 2.2.2.3, 2.2.3.3
        const consumers = promise.consumers.splice(0)
        for (let index = 0; index < consumers.length; index++) {
          const consumer = consumers[index];
          console.log(consumer);
          try {
            const callback = consumer[callbackName];
            // 2.2.1.1, 2.2.1.2
            // 2.2.5 without context
            if(callback) {
              // 2.2.7.1
              consumer.resolve(callback(promise.value))
            } else {
              // 2.2.7.3
              consumer[resolver](promise.value)
            }
          } catch (e) {
            // console.log('here', e);
            consumer.onReject(e)
          }
        }
      }
    )
  }

  then(onFulfilled, onRejected) {
    const promise = new Yi(() => {})
    // 2.2.1.1
    promise.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : undefined
    // 2.2.1.2
    promise.onRejected = typeof onRejected === 'function' ? onRejected : undefined
    // 2.2.6.1, 2.2.6.2
    this.consumers.push(promise)
    this.broadcast()
    // 2.2.7
    return promise
  }

  catch(onRejected) {
    return this.then(undefined, onRejected)
  }
}

const soon = (() => {
  const fq = [],  // function queue
    // avoid using shift() by maintaining a start pointer
    // and remove items in chunks of 1024 (bufferSize)
    bufferSize = 1024
  let fqStart = 0
  function callQueue() {
    while(fq.length - fqStart) {
      try {
        fq[fqStart]()
      } catch (err) {
        Yi.error(err)
        // console.log(err, 'is err');
      }
      fq[fqStart++] = undefined // increase start pointer and dereference function just called
      if(fqStart === bufferSize) {
        fq.splice(0, bufferSize)
        fqStart = 0
      }
    }
  }
  // run the callQueue function asyncrhonously as fast as possible
  // 执行此函数，返回的函数赋值给 cqYield
  const cqYield = (() => {
    // 返回一个函数并且执行
    // This is the fastest way browsers have to yield processing
    if(typeof MutationObserver !== 'undefined')
    {
      // first, create a div not attached to DOM to "observe"
      const dd = document.createElement("div")
      const mo = new MutationObserver(callQueue)
      mo.observe(dd, { attributes: true })

      return function() { dd.setAttribute("a",0) } // trigger callback to
    }

    // if No MutationObserver - this is the next best thing for Node
    if(typeof process !== 'undefined' && typeof process.nextTick === "function")
      return function() { process.nextTick(callQueue) }

    // if No MutationObserver - this is the next best thing for MSIE
    if(typeof setImmediate !== _undefinedString)
      return function() { setImmediate(callQueue) }

    // final fallback - shouldn't be used for much except very old browsers
    return function() { setTimeout(callQueue,0) }
  })()

  // this is the function that will be assigned to soon
  // it take the function to call and examines all arguments
  return fn => {
    fq.push(fn) // push the function and any remaining arguments along with context
    if((fq.length - fqStart) === 1) { // upon addubg our first entry, keck off the callback
      cqYield()
    }
  }
})()

// If we have a console, use it for our errors and warnings, else do nothing (either/both can be overwritten)
const nop = () => { }
Yi.warn = typeof console !== 'undefined' ? console.warn : nop
Yi.error = typeof console !== 'undefined' ? console.error : nop

const p = new Yi((res, rej) => {
  console.log('start');
  rej(1)
})
p.then(res => {
  console.log(`resolve: ${res}`);
}).catch(r => {
  console.log(`reject: ${r}`);
})
console.log('end');

// console.log(p);