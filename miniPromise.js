const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'

class MiniPromise {
  constructor(executor) {
    const laterCalls = [];
    const callLater = getTargetFunc => {
      return callback => new MiniPromise(resolve => laterCalls.push(() => resolve(getTargetFunc()(callback))))
    }
    // 都是函数，接收一个 callback 函数作为参数
    const pending_then = callLater(() => this.then)
    const pending_catch = callLater(() => this.catch)

    // 只能改变一次状态，从 pending 到 settled
    const apply = (value, state) => {
      if(this.state === PENDING) {
        this.value = value
        changeState(state)
        for(const laterCall of laterCalls) {
          laterCall()
        }
      }
    }
    const tryCall = callback => MiniPromise.try(() => callback(this.value))
    const members = {
      [PENDING]: {
        state: PENDING,
        then: pending_then,
        catch: pending_catch
      },
      [FULFILLED]: {
        state: FULFILLED,
        then: tryCall,
        catch: _ => this,
      },
      [REJECTED]: {
        state: REJECTED,
        then: _ => this,
        catch: tryCall
      }
    }
    const changeState = state => Object.assign(this, members[state])

    const getCallback = state => value => {
      if(value instanceof MiniPromise && state === FULFILLED) {
        value.then(value => apply(value, FULFILLED))
        value.catch(value => apply(value, REJECTED))
      } else {
        apply(value, state)
      }
    }
    const resolve = getCallback(FULFILLED)
    const reject = getCallback(REJECTED)
    // init state
    changeState(PENDING)
    try {
      // init next state and value
      executor(resolve, reject)
    } catch (error) {
      reject(error)
    }
  }

  static resolve(value) {
    return new MiniPromise(resolve => resolve(value))
  }

  static reject(reason) {
    return new MiniPromise((_, reject) => reject(reason))
  }

  static try(callback) {
    if(typeof callback !== 'function') throw new TypeError(`${callback} must a callable object.`);
    return new MiniPromise(resolve => resolve(callback()))
  }
}

const anything = () => {
  throw new Error('I can be anything because I should never get called')
}

const throwSomethingWrong = () => {
  console.log('not ignore this');
  throw new Error('something went wrong...')
}

// const p = MiniPromise.resolve(1)
// console.log(p);
// const p1 = MiniPromise.reject(2)
// console.log(p1);
// const p2 = p1
//   .catch(v => v)
//   .catch(anything)
//   .catch(anything)
//   .then(v => console.log(v))
//   .then(throwSomethingWrong)
//   .catch(throwSomethingWrong)
//   .catch(() => 24)


// console.log(p2);

const delay = ms => new MiniPromise(resolve => setTimeout(resolve, ms, `we delay ${ms} ms.`))
const d = delay(2000)
console.log(d);
d
.then(r => console.log(r))
.then(() => {
  console.log('second then');
})
console.log('start ....');