const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'
const nop = () => {}
const $undefined = undefined
const $function = "function"
const promiseState = Symbol("promiseState")
const promiseValue = Symbol("promiseValue")
const promiseConsumers = Symbol("promiseConsumers")

class Yo {
  constructor(executor) {
    if(executor === $undefined) {
      throw new TypeError("You have to give a executor param.")
    }
    if(typeof executor !== $function) {
      throw new TypeError("Executor must be a function.")
    }
    this[promiseState] = PENDING
    this[promiseValue] = $undefined
    this[promiseConsumers] = []
    try {
      executor(this.$_resolve.bind(this), this.$reject.bind(this))
    } catch (e) {
      this.$reject.bind(this)(e)
    }
  }

  static deferred() {
    const result = {}
    result.promise = new Yo((resolve, reject) => {
      result.resolve = resolve
      result.reject = reject
    })

    return result
  }

  $_resolve(x) {
    let hasCalled,then;
    // 2.3.1
    if(this === x) {
      throw new TypeError("Circular reference error, value is promise itself.")
    }
    // 2.3.2
    if(x instanceof Yo) {
      // 2.3.2.1, 2.3.2.2, 2.3.2.3
      x.then(this.$_resolve.bind(this), this.$reject.bind(this))
    } else if(x === Object(x)) {
      // 2.3.3
      try {
        // 2.3.3.1
        then = x.then;
        if(typeof then === $function) {
          // 2.3.3.3
          then.call(
            x,
            // first argument resolvePromise
            function(y) {
              if(hasCalled) return
              hasCalled = true
              // 2.3.3.3.1
              this.$_resolve(y)
            }.bind(this),
            // second argument is rejectPromise
            function (reasonY) {
              if(hasCalled) return
              hasCalled = true
              // 2.3.3.3.2
              this.$reject(reasonY)
            }.bind(this)
          )
        } else {
          // 2.3.3.4
          this.$resolve(x)
        }
      } catch (e) {
        // 2.3.3.2, 2.3.3.3.4
        if(hasCalled) return // 2.3.3.3.4.1
        this.$reject(e) // 2.3.3.3.4.2
      }
    } else {
      // 2.3.4
      this.$resolve(x)
    }
  }

  $resolve(value) {
    if(this[promiseState] !== PENDING) return // 2.1.2.1, 2.1.3.1
    this[promiseState] = FULFILLED // 2.1.1.1
    this[promiseValue] = value // 2.1.2.2
    this.broadcast()
  }

  $reject(reason) {
    if(this[promiseState] !== PENDING) return // 2.1.2.1, 2.1.3.1
    this[promiseState] = REJECTED // 2.1.1.1
    this[promiseValue] = reason // 2.1.3.2
    this.broadcast()
  }

  static reject(reason) {
    return new Yo((_, reject) => {
      reject(reason)
    })
  }

  static resolve(value) {
    return new Yo(resolve => {
      resolve(value)
    })
  }

  then(onFulfilled, onRejected) {
    const promise = new Yo(nop) // then 方法返回的新实例
    // 2.2.1.1
    promise.onFulfilled = typeof onFulfilled === $function ? onFulfilled : $undefined;
    // 2.2.1.2
    promise.onRejected = typeof onRejected === $function ? onRejected : $undefined;
    // 2.2.6.1, 2.2.6.2
    this[promiseConsumers].push(promise)
    this.broadcast()
    // 2.2.7
    return promise
  }

  catch(onRejected) {
    return this.then($undefined, onRejected)
  }

  broadcast() {
    const promise = this;
    // 2.2.2.1, .2.2.2.2, 2.2.3.1, 2.2.3.2
    if(this[promiseState] === PENDING) return
    // 2.2.6.1, 2.2.6.2, 2.2.2.3, 2.2.3.3
    const callbackName = promise[promiseState] === FULFILLED ? "onFulfilled" : "onRejected"
    const resolver = promise[promiseState] === FULFILLED ? "$_resolve" : "$reject"
    soon(
      function() {
        // 2.2.6.1, 2.2.6.2, 2.2.2.3, 2.2.3.3
        const consumers = promise[promiseConsumers].splice(0)
        for (let index = 0; index < consumers.length; index++) {
          const consumer = consumers[index];
          try {
            const callback = consumer[callbackName] // 获取 then 方法执行的时候传入的函数
            const value = promise[promiseValue]
            // 2.2.1.1, 2.2.1.2, 2.2.5 without context
            if(callback) {
              consumer['$_resolve'](callback(value))
            } else {
              // onFulfilled / onRejected 不是函数
              // 2.2.7.3, 2.2.7.4
              consumer[resolver](value)
            }
          } catch (e) {
            // 异常则设为 rejected
            consumer['$reject'](e)
          }
        }
      }
    )
  }
}

// soon function come from Zousan.js
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
        console.log(err)
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

module.exports = Yo
