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
    try {
      executor(this.onFulfill.bind(this), this.onReject.bind(this))
    } catch (e) {
      this.onReject.bind(this)(e)
    }
  }

  onFulfill(x) {
    let wasCalled, then;
    // 2.3.1
    if(this === x) {
      throw new TypeError('Circular reference: promise value is promise itself')
    }
    // 2.3.2
    if(x instanceof Yi) {
      x.then(this.onFulfill.bind(this), this.onReject.bind(this))
    } else if(x === Object(x)) {
      // 2.3.3
      try {
        // 2.3.3.1
        then = x.then;
        if(typeof then === 'function') {
          // 2.3.3.3
          then.call(
            x,
            function resolve(y) {
              // 2.3.3.3.3 do not allow multiple calls
              if(wasCalled) return
              wasCalled = true
              // 2.3.3.3.1 recurse
              this.onFulfill(y)
            }.bind(this),
            function reject(reasonY) {
              if(wasCalled) return
              wasCalled = true
              this.onReject(reasonY)
            }.bind(this)
          )
        } else {
          // 2.3.3.4
          if(this.state !== PENDING) return
          this.state = FULFILLED
          this.value = x
          this.broadcast()
        }
      } catch (e) {
        if(wasCalled) return
        this.onReject(e)
      }
    } else {
      if(this.state !== PENDING) return
      this.state = FULFILLED
      this.value = x
      this.broadcast()
    }
  }

  onReject(reason) {
    if(this.state !== PENDING) return // 2.1.2.1, 2.1.3.1
    this.state = REJECTED // 2.1.1.1
    this.value = reason // 2.1.3.2
    this.broadcast()
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

  static deferred() {
    const result = {}
    result.promise = new Yi((resolve, reject) => {
      result.resolve = resolve
      result.reject = reject
    })
    return result
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
          try {
            const callback = consumer[callbackName];
            // 2.2.1.1, 2.2.1.2
            // 2.2.5 without context
            if(callback) {
              // 2.2.7.1 execute the Promise Resolution Produre
              consumer.onFulfill(callback(promise.value))
            } else {
              // 2.2.7.3
              consumer[resolver](promise.value)
            }
          } catch (e) {
            consumer.onReject(e)
          }
        }
      }
    )
  }

  then(onFulfilled, onRejected) {
    const promise = new Yi(nop)
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
Yi.error = typeof console !== 'undefined' ? console.error : nop

module.exports = Yi