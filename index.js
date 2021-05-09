const states = {
  resolved: 'resolved',
  rejected: 'rejected',
  pending: 'pending',
}

class P {
  constructor(executor) {
    const laterCalls = []
    const callLater = getMember => callback => new P(resolve => laterCalls.push(() => resolve(getMember()(callback))))

    const apply = (value, state) => {
      if(this.state === states.pending) {

        // 同时设置状态,值和实例方法 then and catch
        this.value = value;
        changeState(state)

        for(let laterCall of laterCalls) {
          laterCall();
        }
      }
    }
    const getCallback = state => value => {
      // resolve or reject
      // 需要支持 value 为 MyPromis
      if(value instanceof P && state === states.resolved) {
        // 如果 value 是 MyPromise 实例,值的状态可以是 fulfilled or rejected
        // 两种会执行其一
        value.then(value => {
          apply(value, states.resolved)
        });
        // 当我们 MyPromise.resolve(MyPromise.reject(value)) 的时候,就需要在这里解构一次内部的值.
        value.catch(value => apply(value, states.rejected))
      } else {
        apply(value, state)
      }
    }
    // 关键是值, resolve 和 reject 函数都接收一个参数作为值,但是状态不同
    // resolved 后的状态一定是 fulfilled
    const resolve = getCallback(states.resolved);
    // rejected 后必定 rejected
    const reject = getCallback(states.rejected);
    const tryCall = callbackFn => P.try(() => callbackFn(this.value));
    const members = {
      [states.resolved]: {
        state: states.resolved,
        then: tryCall,
        catch: _ => this,
      },
      [states.rejected]: {
        state: states.rejected,
        then: _ => this,
        catch: tryCall
      },
      [states.pending]: {
        state: states.pending,
        then: callLater(() => this.then),
        catch: callLater(() => this.catch)
      }
    }
    // 修改当前 state 和 then 方法
    const changeState = state => Object.assign(this, members[state])
    // 默认初始化是 pending
    changeState(states.pending)

    try {
      executor(resolve, reject)
    } catch (error) {
      reject(error)
    }
  }

  // 每次使用静态方法,实际上是提供一个具备相关参数的 executor 函数,
  // 最后再构造函数内传入内部定义可以修改状态和值的 resolve 和 reject 函数
  // 明显,然后按不同状态,执行了内部函数,调用静态函数的时候,可选的提供了一个值
  static reject(v) {
    return new P((_, reject) => reject(v))
  }

  static resolve(v) {
    return new P(resolve => resolve(v))
  }

  static try(cb) {
    return new P(resolve => resolve(cb()))
  }

  toString() {
    return `P <${this.value}>`
  }
}

const anyThing = () => {
  throw new Error("I can be anything because I should never get called...")
}

const throwSomethingWrong = () => {
  console.log('not ignore here, throw some wrong');
  throw new Error("something error")
}

// let p = new P((resolve) => {
//   resolve(1);
//   resolve(2);
//   resolve(3);
// }).then(v => {
//   console.log(v);
// })
//   // .catch(anyThing)
//   // .catch(anyThing)
//   // .then(v => console.log(v))
//   // .then(throwSomethingWrong)
//   // .catch(throwSomethingWrong)
//   // .catch(() => 24)
//   // .then(v => console.log(v))
const delay = ms => new P(resolve => setTimeout(resolve, ms, `delay ${ms} ms.`));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms, `sleep ${ms} ms.`))

sleep(2000).then((v) => {
  console.log(v);
})
