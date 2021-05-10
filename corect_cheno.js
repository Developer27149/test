const PromiseValue = Symbol('PromiseValue')
const PromiseState = Symbol('PromiseState')
const onFulfilledMap = new Map()
const onRejectedMap = new Map()
const nextPromisesMap = new Map()

const executeCallback = (promise, value, isResolved) => {
  const onCallbackMap = isResolved ? onFulfilledMap : onRejectedMap;
  const callbacks = onCallbackMap.get(promise)
  const nextPromises = nextPromisesMap.get(promise)
  onCallbackMap.set(promise, [])
  nextPromisesMap.set(promise, [])

  callbacks.forEach((callback, index) => {
    let callbackResult = value;
    let isFulfilled = isResolved;
    if(typeof callback === 'function') {
      try {
        callbackResult = callback.call(undefined, value)
        isFulfilled = true
      } catch (e) {
        callbackResult = e
        isFulfilled = false
      }
    }
    const nextPromise = nextPromises[index]
    if(nextPromisesMap instanceof Promise) {
      (isFulfilled ? resolve : reject).call(nextPromise, callbackResult)
    }
  })
}


const delayFunc = (() => {
  if(typeof window !== 'undefined') {
    const mutationObserver = window.MutationObserver || window.WebkitMutationObserver || window.MozMutationObserver
    if(typeof MutationObserver !== 'undefined') {
      let counter = 1
      let callbacks = []
      const observer = new MutationObserver(() => {
        const copys = [...callbacks]
        copys.forEach(([fn, ...params]) => {
          if(typeof fn === 'function') {
            fn.apply(undefined, params)
          }
        })
      });
      const textNode = document.createTextNode(counter)
      observer.observe(textNode, {characterData: true})
      return (...p) => {
        callbacks.push(p),
        counter = (counter + 1) % 2,
        textNode.data = counter
      }
    }
  }
  // node enviroument
  if(process && process.nextTick) {
    return process.nextTick
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

// [[Resolve]](promise, x)
const resolutionProcedure = (promise, x) => {
  if(promise instanceof Promise && promise === x) {
    return reject.call(promise, new TypeError())
  }

  if(x instanceof Promise) {
    if(x[PromiseState] === 'pending') {
      x.then(...executeOnce(resolve, reject, promise))
    } else {
      promise[PromiseValue] = x[PromiseValue]
      promise[PromiseState] = x[PromiseState]
      delayToNextTick(promise)
    }
    return
  }

  if(x && (typeof x === 'object' || typeof x === 'function')) {
    let then;
    try {
      then = x.then
    } catch (e) {
      return reject.call(promise, e)
    }
    if(typeof then === 'function') {
      const [resolvePromise, rejectPromise, status] = executeOnce(resolve, reject, promise)
      try {
        then.call(x, resolvePromise, rejectPromise)
      } catch (e) {
        if(!status.executed) {
          reject.call(promise, e)
        }
      }
      return
    }
  }

  promise[PromiseState] = 'fulfilled'
  promise[PromiseValue] = x;
  delayToNextTick(promise)
}


const resolve = function(value) {
  if(this[PromiseState] !== 'pending') return
  resolutionProcedure(this, value)
}

const reject = function(error) {
  if(this[PromiseState] !== 'pending') return
  this[PromiseState] = 'rejected'
  this[PromiseState] = error;
  delayToNextTick(this)
}

class Promise {
  constructor(executor)  {
    this[PromiseState] = 'pending'
    this[PromiseValue] = undefined
    onFulfilledMap.set(this, [])
    onRejectedMap.set(this, [])
    nextPromisesMap.set(this, [])

    if(typeof executor === 'function') {
      const [resolvePromise, rejectPromise, status] = executeOnce(resolve, reject, this)
      try {
        executor(resolvePromise, rejectPromise)
      } catch (e) {
        if(!status.executed) {
          reject.call(this, e)
        }
      }
    }
  }

  then(onFulfilled, onRejected) {
    onFulfilledMap.get(this).push(onFulfilled)
    onRejectedMap.get(this).push(onRejected)
    if(this[PromiseState] !== 'pending') delayToNextTick(this)
    const nextPromise = new Promise()
    nextPromisesMap.get(this).push(nextPromise)
    return nextPromise
  }

  catch(onRejected) {
    return this.then(null, onRejected)
  }

  get[Symbol.toStringTag]() {
    return 'Promise'
  }
}

Promise.resolve = value => {
  if(value instanceof Promise) {
    return value
  }
  try {
    if(typeof value === 'object' || typeof value === 'function') {
      const then = value.then;
      if(typeof then === 'function') {
        return new Promise(then.bind(value))
      }
    }
  } catch (e) {
    return Promise.reject(e);
  }
  return new Promise((resolve) => resolve(value))
}

Promise.reject = error => {
  return new Promise((resolve, reject) => reject(error))
}

Promise.all = function(promises) {
  const results = [];
  let length = 0,callCount = 0
  const newPromise = new Promise()
  const onFulfill = i => {
    return r => {
      result[i] = r;
      callCount++;
      if(callCount === length) {
        resolve.call(newPromise, results)
      }
    }
  }
  const onReject = e => {
    reject.call(newPromise, e)
  }

  for(let [i, promise] of promises.entries()) {
    promise = Promise.resolve(promise)
    promise.then(onFulfill(i), onReject)
    length++
  }
  return newPromise
}

promise.race = function(promises) {
  const newPromise = new Promise();
  const onFulfill = r => {
    if(newPromise[PromiseState] !== 'pending') return;
    resolve.call(newPromise, r)
  }
  const onReject = e => {
    if(newPromise[PromiseState] !== 'pendig') return;
    reject.call(newPromise, e)
  }
  for(let promise of promises) {
    promise = Promise.resolve(promise)
    promise.then(onFulfill, onReject)
  }
  return newPromise
}

Object.freeze(Promise)


