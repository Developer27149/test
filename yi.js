function Yi(executor) {
  this.state = 'pending'
  this.value = undefined
  this.consumers = []
  executor(this.resolve.bind(this), this.reject.bind(this))
}

Yi.prototype.fulfill = function(value) {
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

Yi.prototype.resolve = function (x) {
  let wasCalled,then;
  if(this === x) {
    throw new TypeError("Circular reference: promise value is promise itself.")
  }
  if(x instanceof Yi) {
    x.then(this.resolve.bind(this), this.reject.bind(this))
  } else if (x === Object(x)) {
    try {
      then = x.then
      if(typeof then === "function") {
        then.call(x, function resolve(y) {
          if(wasCalled) return
          wasCalled = true
          this.resolve(y)
        }.bind(this), function reject(reasonY) {
          if(wasCalled) return
          wasCalled = true
          this.reject(reasonY)
        }.bind(this))
      } else {
        this.fulfill(x)
      }
    } catch (e) {
      if(wasCalled) return
      this.reject(e)
    }
  } else {
    this.fulfill(x)
  }
}

const p = new Yi((res, rej) => {
  console.log('start');
  setTimeout(() => {
    console.log('start...');
    res(1)
  }, 100);
  console.log('start again');
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
