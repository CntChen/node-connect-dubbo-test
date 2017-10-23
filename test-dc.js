const DubboClient = require('dubbojs-client');

const { Client: RegistryClient } = require('dubbo-registry');
const registry = new RegistryClient({
  address: `localhost:2181`,
  appName: 'test',
});

registry.subscribe({
  interfaceName: 'com.alibaba.dubbo.demo.DemoService',
  version: '2.5.6-jar-with-dependencies',
  group: 'dubbo',
}, addresses => {
  console.log('service addrs => ', addresses);
});

const clientOptions = {
  appName: 'demo-consumer',
  registry,
};
const dubboClient = new DubboClient(clientOptions);

const consumerOptions = {
  interfaceName: 'com.alibaba.dubbo.demo.DemoService',
  version: '2.5.6-jar-with-dependencies',
  group: 'dubbo',
};
const consumer = dubboClient.createConsumer(consumerOptions);

consumer.invoke('sayHello');

dubboClient.close();
