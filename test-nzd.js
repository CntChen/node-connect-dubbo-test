const nzd=require('node-zookeeper-dubbo');

const opt= {
  application:{ name: 'demo-consumer' },
  register: 'localhost:2181',
  dubboVer: '2.5.6-jar-with-dependencies',
  root:'dubbo',
  dependencies: {
    DemoService: {
      interface: 'com.alibaba.dubbo.demo.DemoService',
      version: undefined,
      group: 'dubbo',
      timeout: 6000,
    },
  }  
};

opt.java = require('js-to-java')

const Dubbo= new nzd(opt);

setTimeout(() => {
  Dubbo.DemoService
  .sayHello({'$class': 'java.lang.String', '$': 'test'})
  .then(console.log)
  .catch(console.error);
}, 2000);
