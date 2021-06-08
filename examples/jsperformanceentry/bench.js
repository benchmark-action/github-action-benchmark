const {
    performance, // available in web browsers too
    PerformanceObserver
} = require('perf_hooks');
const { fib } = require('./index');

const obs = new PerformanceObserver((perfObserverList, observer) => {
    const entries = perfObserverList.getEntries();
    console.log(JSON.stringify(entries));
    observer.disconnect();
    process.exit(0);
});
obs.observe({ entryTypes: ['measure'] });

performance.mark('start:fib(25)');
fib(25);
performance.mark('end:fib(25)');
performance.measure('fib(25)', 'start:fib(25)', 'end:fib(25)');