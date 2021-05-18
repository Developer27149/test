const _undefined = undefined,
  STATE_PENDING = "pending",
  STATE_FULFILLED = "fulfilled",
  STATE_REJECTED = "rejected",
  _undefinedString = "undefined";

const soon = (function () {
  var fq = []; // function queue
  function callQueue() {
    while (fq.length) {
      var fe = fq[0];
      fe.f.apply(fe.m, fe.a); // call our fn with the args and preserve context
      fq.shift(); // remove element just processed
    }
  }

  // run the callQueue function asyncrhonously, as fast as possible
  var cqYield = function () {
    // this is the fastest way browsers have to yield processing
    if (typeof MutationObserver !== "undefined") {
      var dd = document.createElement("div");
      var mo = new MutationObserver(callQueue);
      mo.observe(dd, { attributes: true });
      return function (fn) {
        dd.setAttribute("a", 0); //trigger callback to
      };
    }

    // handler node and MSIE
    if(type)
  };
})();
