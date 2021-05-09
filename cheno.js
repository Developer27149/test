// [cheno/promise.js at develop · listenlin/cheno](https://github.com/listenlin/cheno/blob/develop/src/promise.js)

const PromiseValue = Symbol('PromiseValue')
const PromiseState = Symbol('PromiseState')

const onFulfillMap = new Map(); // 存储某个 promise 的 fulfilled 状态的监听函数
const onRejectMap = new Map(); // 存储某个 promise 的 rejected 状态的监听函数

// 当前的 promise 作为 key，下一个链式 promise 对象为 value
const nextPromiseMap = new Map();

/**
 * 执行 promise 某个状态的监听器
 * @param  {Promise} promise - 需要执行回调的 Promise 实例
 * @param  {any} value - 结果值或者异常原因值
 * @param  {boolean} status - true = fulfilled, false = rejected
 */
const executeCallback = (promise, value, status) => {
  // 根据状态来设置监听函数来源，Map 对象的 key 是当前 promise 实例
  const onCallbackMap = states ? onFulfillMap : onRejectMap;
  // 其状态监听函数可以不止一个
  const callbacks = onCallbackMap.get(promise)
  // 根据当前 promise 获取下一个 promise 列表，下一个 promise 是状态 settled 之后产生的
  const nextPromises = nextPromiseMap.get(promise)
  // 提前将执行过的回调函数丢弃，清空队列
  onCallbackMap.set(promise, []) // 清空此 promise 的回调， 以免回调中注册的被丢弃
  nextPromiseMap.set(promise, [])

  callbacks.forEach((cb, index) => {
    let isFulfill = status
    if(typeof cb === 'function') {
      try {
        cbvalue = cb.call(undefined, value)
        isFulfill = true
      } catch (error) {
        cbvalue = error
        isFulfill = false
      }
    }
    const nextPromise = nextPromises[index]
    // 更改下一个 promise 的状态
    if(nextPromise instanceof Promise) {
      (isFulfill ? resolve : reject).call(nextPromise, cbvalue)
    }
  })
}

const delayFunc = ( () => {
  // 区分 browser 和 node 环境, 针对 browser 环境做 polyfill
  if(typeof window !== 'undefined') {
    // Firefox 和 chrome 早期版本带有前缀
    const MutationObserver = window.MutationObserver || window.WebkitMutationObserver || window.MozMutationObserver;
    // 使用 MutationObserver 来实现 nextTick
    if(typeof MutationObserver !== 'undefined') {
      let counter = 1,
        callbasks = [];
      const observer = new MutationObserver(() => {
        const copys = callbacks.splice(0)
        // 执行每一个回调函数，并且传入参数10421
        copys.forEach(([fn, ...params]) => {
          if(typeof fn === 'function') {
            fn.apply(undefined, params)
          }
        });
      });

      const textNode = document.createTextNode(counter)
      observer.observe(textNode, {characterData: true})
      // 返回的函数用于执行微任务
      return (...p) => {
        // 将此函数接收到的回调函数压入队列中，并且修改 DOM 的数据，引发 MutationOberver 回调，执行微任务
        callbasks.push(p);
        counter = (counter + 1) % 2
        textNode.data = counter
      }
    }
  }

  // 第二个判断，使用 browserify 自动导入的 process.nextTick
  if(typeof process !== 'undefined' && process.nextTick) {
    return process.nextTick
  }
  // 无法触发微任务，则触发宏任务
  if(typeof setImmediate === 'function') {
    return setImmediate
  }
  return (fn, ...p) => setTimeout(fn, 0, ...p)
})();

const delayToNextTick = promise => {
  delayFunc(
    executeCallback,
    promise,
    promise[PromiseValue],
    promise[PromiseState] === 'fulfilled'
  )
}

const executeOnce = (resolve, reject, context = undefined) => {
  let status = {executed: false}
  return [
    (...p) => {
      if(!status.executed) {
        status.executed = true
        return resolve.call(context, ...p)
      }
    },
    (...p) => {
      if(!status.executed) {
        status.executed = true
        return reject.call(context, ...p)
      }
    },
    status
  ]
}


const resolve = function(value) {
  if(this[PromiseState] !== 'pending') return;
  resolutionProcedure(this, value)
}

const reject = function(reason) {
  if(this[PromiseState] !== 'pending') return;

  this[PromiseState] = 'rejected'
  this[PromiseValue] = reason
  delayToNextTick(this)
}

/**
 * 解析 promise 流程
 * [[Resolve]](promise, x)
 * @param  {} promise 需要解析的 promise 对象
 * @param  {} x - 用户传来的值，通过 resolve 或者 resolvePromise 参数、onFulfilled 返回值传入
 */
const resolutionProcedure = (promise, x) => {
  if(promise instanceof Promise && promise === x) {
    return reject.call(promise, new TypeError())
  }
  if(x instanceof Promise) {
    if(x[PromiseState] === 'pending') {
      // executeOnce 返回一个列表，结果依次是保证执行一次的 onFulfilled, onRejected, status
      x.then(...executeOnce(resolve, reject, promise))
    } else {
      promise[PromiseValue] = x[PromiseValue]
      promise[PromiseState] = x[PromiseState]
      delayToNextTick(promise)
    }
    return;
  }

  if(x && (typeof x === 'object' || typeof x === 'function')) {
    let then;
    try {
      then = x.then
    } catch (error) {
      return reject.call(promise, error)
    }
  }
}