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

const promise = new Y((resolve, reject) => {
  console.log('start');
  setTimeout(() => {
    resolve('ok')
  }, 10);
})

promise.then(r => {
  console.log('resolve: ', r);
}).catch((r) => {
  console.log(`reject: ${r}`);
})

console.log('end');