class PubSub {
  constructor() {
    this.handlers = {};
  }
  on(eventType, handler, option = {once: false}) {
    const self = this;
    const once = option.once;
    if(!(eventType in self.handlers)) {
      self.handlers[eventType] = [];
    }
    if(self.handlers[eventType].some(handlerItem => handlerItem.handler === handler)) return self;
    self.handlers[eventType].push({handler, once});
    return self;
  }
  emit(eventType, data) {
    const self = this;
    if(!self.handlers[eventType]) return self;
    self.handlers[eventType].forEach(handlerItem => {
      const {handler, once} = handlerItem;
      handler(data);
      once && self.off(eventType, handler)
    })
    return self;
  }
  off(eventType, handler) {
    const self = this;
    if(!self.handlers[eventType]) return self;
    self.handlers[eventType] = self.handlers[eventType].filter(handlerItem => handlerItem.handler !== handler);
    return self;
  }
  reset() {
    this.handlers = {};
  }
}

const p = new PubSub();
p.on('hi', () => console.log('hi'))
p.emit('hi')
p.emit('hi')
p.on('hello', () => console.log('hello'), {once: true})
p.emit('hello')
p.emit('hello')
p.emit('hello')
p.reset()
p.emit('hello')
p.emit('hi')
function doIt(params) {
  console.log(params);
}
p.on('do', doIt)
p.emit('do', 'singing~')
p.off('do', doIt)
p.emit('do', '😂')


