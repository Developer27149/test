function interval() {
  const speed = 50;
  let counter = 1;
  const start = new Date().getTime();
  function instance() {
    console.log(`counter is ${counter}`);
    const ideal = (counter * speed);
    const real = new Date().getTime() - start;
    const diff = real - ideal;
    counter++
    setTimeout(instance, speed - diff)
  }
 setTimeout(instance, speed)
}

interval()
for(let x = 1, i = 0; i < 10000000;i++) {
  x *= (i+1)
  // console.log('i++');
}